package com.tengmo.vader.ui.graph

import android.app.Application
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.DailyAggregate
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.NearbyStationSeries
import com.tengmo.vader.data.model.ObservationSeries
import com.tengmo.vader.data.model.ObservationWindow
import com.tengmo.vader.data.model.UserPreferences
import com.tengmo.vader.data.model.WeatherMetric
import com.tengmo.vader.data.model.WeatherObservation
import com.tengmo.vader.data.repository.convertPrecipitation
import com.tengmo.vader.data.repository.convertTemperature
import com.tengmo.vader.data.repository.convertWindSpeed
import com.tengmo.vader.data.repository.toDailyAggregates
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.Instant

/** Palette for the location's own line and its nearby-station comparison lines. */
private val NEARBY_COLORS = listOf(
    Color(0xFF5B9BD9), Color(0xFF3A7D7A), Color(0xFFC1590F), Color(0xFF9A6BD9),
)
private val OWN_SERIES_COLOR = Color(0xFFC9A86A)

data class GraphUiState(
    val location: Location? = null,
    val window: ObservationWindow = ObservationWindow.Last24Hours,
    val metric: WeatherMetric = WeatherMetric.Temperature,
    val series: ObservationSeries? = null,
    val nearby: List<NearbyStationSeries> = emptyList(),
    val isLoading: Boolean = true,
    val preferences: UserPreferences = UserPreferences(),
    val lastUpdatedEpochMillis: Long? = null,
)

/** T041 — Graph view-model (US2): loads the selected location's series for the chosen window and,
 *  when `nearbyStationCount` > 0, the comparison stations' series. Because this view-model only
 *  exists while the Graph/Details screens are open, nearby-station fetching is naturally gated on
 *  "Graph has been opened" — mirroring the web's `hasOpenedDetails` gate (025-reduce-api-requests). */
class GraphViewModel(application: Application) : AndroidViewModel(application) {
    private val services = ServiceLocator.get(application)

    private val _uiState = MutableStateFlow(GraphUiState())
    val uiState: StateFlow<GraphUiState> = _uiState.asStateFlow()

    init {
        load(silent = false)
    }

    /** Background refresh (RefreshCoordinator, FR-008): reloads without blanking the chart. */
    fun refresh() = load(silent = true)

    fun setWindow(window: ObservationWindow) {
        _uiState.value = _uiState.value.copy(window = window)
        load(silent = false)
    }

    fun setMetric(metric: WeatherMetric) {
        _uiState.value = _uiState.value.copy(metric = metric)
    }

    private fun load(silent: Boolean) {
        viewModelScope.launch {
            val prefs = services.preferencesStore.preferences.first()
            val location = prefs.lastViewedLocation ?: run {
                _uiState.value = _uiState.value.copy(isLoading = false, preferences = prefs)
                return@launch
            }
            _uiState.value = _uiState.value.copy(location = location, isLoading = !silent, preferences = prefs)
            val window = _uiState.value.window
            val series = runCatching {
                services.weatherRepository.getObservations(location.latitude, location.longitude, window)
            }.getOrNull()
            val nearby = if (prefs.nearbyStationCount > 0) {
                runCatching {
                    services.weatherRepository.getNearbyStationSeries(
                        location.latitude, location.longitude, window, prefs.nearbyStationCount,
                    )
                }.getOrDefault(emptyList())
            } else {
                emptyList()
            }
            // A failed background refresh keeps whatever is already shown rather than blanking it.
            val keepExisting = series == null || series.observations.isEmpty()
            _uiState.value = if (keepExisting && _uiState.value.series != null) {
                _uiState.value.copy(isLoading = false)
            } else {
                _uiState.value.copy(
                    series = series,
                    nearby = nearby,
                    isLoading = false,
                    lastUpdatedEpochMillis = if (keepExisting) _uiState.value.lastUpdatedEpochMillis else System.currentTimeMillis(),
                )
            }
        }
    }

    // --- chart data building (mirrors chartData.ts, simplified) ---------------------------------

    private fun hourlyValue(o: WeatherObservation, metric: WeatherMetric, prefs: UserPreferences): Double? = when (metric) {
        WeatherMetric.Temperature -> convertTemperature(o.temperature, prefs.unit)
        WeatherMetric.Rain -> convertPrecipitation(o.precipitation, prefs.unit)
        WeatherMetric.Wind -> convertWindSpeed(o.windSpeed, prefs.unit)
        WeatherMetric.Cloud -> o.cloudCoverPercent?.toDouble()
    }

    private fun dailyPoints(
        aggregates: List<DailyAggregate>,
        pick: (DailyAggregate) -> Double?,
    ): List<ChartPoint> = aggregates.map {
        ChartPoint(Instant.parse(it.bucketEnd).toEpochMilli(), pick(it), it.isForecast)
    }

    /** Builds every line to plot for the current window+metric: the location's own line, optional
     *  high/low lines (7/30-day temperature & wind only, when enabled), and nearby-station lines. */
    fun buildChartSeries(state: GraphUiState, ownLabel: String): List<ChartSeries> {
        val series = state.series ?: return emptyList()
        val prefs = state.preferences
        val metric = state.metric
        val result = mutableListOf<ChartSeries>()

        fun conv(v: Double?, m: WeatherMetric = metric) = when (m) {
            WeatherMetric.Temperature -> convertTemperature(v, prefs.unit)
            WeatherMetric.Rain -> convertPrecipitation(v, prefs.unit)
            WeatherMetric.Wind -> convertWindSpeed(v, prefs.unit)
            WeatherMetric.Cloud -> v
        }

        if (state.window == ObservationWindow.Last24Hours) {
            result += ChartSeries(
                ownLabel, OWN_SERIES_COLOR,
                series.observations.map {
                    ChartPoint(Instant.parse(it.timestamp).toEpochMilli(), hourlyValue(it, metric, prefs), it.isForecast)
                },
            )
            state.nearby.forEachIndexed { i, n ->
                result += ChartSeries(
                    n.station.displayName, NEARBY_COLORS[i % NEARBY_COLORS.size],
                    n.series.observations.map {
                        ChartPoint(Instant.parse(it.timestamp).toEpochMilli(), hourlyValue(it, metric, prefs), it.isForecast)
                    },
                    secondary = true,
                )
            }
            return result
        }

        val bucketCount = if (state.window == ObservationWindow.Last7Days) 7 else 30
        val aggregates = toDailyAggregates(series.observations, bucketCount)
        val pickAverage: (DailyAggregate) -> Double? = when (metric) {
            WeatherMetric.Temperature -> { d -> conv(d.average) }
            WeatherMetric.Rain -> { d -> conv(d.totalPrecipitation) }
            WeatherMetric.Wind -> { d -> conv(d.windAverage) }
            WeatherMetric.Cloud -> { d -> d.cloudAverage }
        }
        result += ChartSeries(ownLabel, OWN_SERIES_COLOR, dailyPoints(aggregates, pickAverage))

        if (prefs.highLowVisible && (metric == WeatherMetric.Temperature || metric == WeatherMetric.Wind)) {
            val high: (DailyAggregate) -> Double? =
                if (metric == WeatherMetric.Temperature) { d -> conv(d.high) } else { d -> conv(d.windHigh) }
            val low: (DailyAggregate) -> Double? =
                if (metric == WeatherMetric.Temperature) { d -> conv(d.low) } else { d -> conv(d.windLow) }
            result += ChartSeries("High", Color(0xFFC1590F), dailyPoints(aggregates, high), secondary = true)
            result += ChartSeries("Low", Color(0xFF5B9BD9), dailyPoints(aggregates, low), secondary = true)
        }

        state.nearby.forEachIndexed { i, n ->
            val nearbyAgg = toDailyAggregates(n.series.observations, bucketCount)
            result += ChartSeries(
                n.station.displayName, NEARBY_COLORS[i % NEARBY_COLORS.size],
                dailyPoints(nearbyAgg, pickAverage), secondary = true,
            )
        }
        return result
    }
}
