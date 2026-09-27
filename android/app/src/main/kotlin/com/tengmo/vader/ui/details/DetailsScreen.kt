package com.tengmo.vader.ui.details

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tengmo.vader.R
import com.tengmo.vader.ui.OfflineIndicator
import com.tengmo.vader.ui.overview.RefreshCoordinator
import com.tengmo.vader.data.model.DailyAggregate
import com.tengmo.vader.data.model.ObservationWindow
import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.model.WeatherObservation
import com.tengmo.vader.data.repository.WeatherConditionInput
import com.tengmo.vader.data.repository.convertPrecipitation
import com.tengmo.vader.data.repository.convertTemperature
import com.tengmo.vader.data.repository.convertWindSpeed
import com.tengmo.vader.data.repository.deriveDailyCondition
import com.tengmo.vader.data.repository.deriveWeatherCondition
import com.tengmo.vader.data.repository.formatValue
import com.tengmo.vader.data.repository.isNight
import com.tengmo.vader.data.repository.precipitationUnitLabel
import com.tengmo.vader.data.repository.temperatureUnitLabel
import com.tengmo.vader.data.repository.toDailyAggregates
import com.tengmo.vader.data.repository.windUnitLabel
import com.tengmo.vader.ui.graph.GraphViewModel
import com.tengmo.vader.ui.overview.WeatherIconImage
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val ROW_TIME_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("EEE HH:mm")
private val ROW_DAY_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("EEE d MMM")

/** T043 — the Details table (US2): one row per hour (24 h window) or per day (7/30-day
 *  windows) with condition icon, temperature, precipitation, wind, and observed/forecast status —
 *  the table counterpart of the Graph (ObservationDetails.tsx). Reuses GraphViewModel's data
 *  loading (same location, same window model) so the two views can never disagree. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DetailsScreen(onHome: () -> Unit, viewModel: GraphViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsState()
    val unit = state.preferences.unit

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        TextButton(onClick = onHome) { Text(stringResource(R.string.app_homeButton)) }
        RefreshCoordinator(state.lastUpdatedEpochMillis, enabled = !state.isLoading, onRefresh = viewModel::refresh)
        OfflineIndicator(
            showingCachedData = false,
            lastUpdatedEpochMillis = state.lastUpdatedEpochMillis,
            hasAnyData = state.series != null,
        )
        state.location?.let { Text("${it.displayName} ${stringResource(R.string.observationDetails_headingSuffix)}", fontSize = 18.sp) }

        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(
                ObservationWindow.Last24Hours to R.string.chart_windowLabel24h,
                ObservationWindow.Last7Days to R.string.chart_windowLabel7d,
                ObservationWindow.Last30Days to R.string.chart_windowLabel30d,
            ).forEach { (window, label) ->
                FilterChip(
                    selected = state.window == window,
                    onClick = { viewModel.setWindow(window) },
                    label = { Text(stringResource(label)) },
                )
            }
        }

        val series = state.series
        when {
            state.isLoading -> Text(stringResource(R.string.observationDetails_loading))
            series == null || series.observations.isEmpty() -> Text(stringResource(R.string.weatherOverview_unavailable))
            state.window == ObservationWindow.Last24Hours -> HourlyTable(series.observations, unit)
            else -> DailyTable(
                toDailyAggregates(series.observations, if (state.window == ObservationWindow.Last7Days) 7 else 30),
                unit,
            )
        }
    }
}

@Composable
private fun HeaderRow() {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(stringResource(R.string.observationDetails_time), Modifier.weight(1.4f), fontSize = 12.sp)
        Text("", Modifier.size(28.dp))
        Text(stringResource(R.string.timelineRow_temperature), Modifier.weight(1f), fontSize = 12.sp)
        Text(stringResource(R.string.timelineRow_precipitation), Modifier.weight(1f), fontSize = 12.sp)
        Text(stringResource(R.string.timelineRow_wind), Modifier.weight(1f), fontSize = 12.sp)
    }
}

@Composable
private fun HourlyTable(observations: List<WeatherObservation>, unit: UnitSystem) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        item { HeaderRow() }
        items(observations, key = { it.timestamp }) { o ->
            val condition = deriveWeatherCondition(
                WeatherConditionInput(o.temperature, o.precipitation, o.windSpeed, o.cloudCoverPercent, o.timestamp, o.symbolCondition, o.chanceOfRain),
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    Instant.parse(o.timestamp).atZone(ZoneId.systemDefault()).format(ROW_TIME_FORMAT) +
                        if (o.isForecast) " ${stringResource(R.string.chart_forecastSuffix)}" else "",
                    Modifier.weight(1.4f),
                    fontSize = 12.sp,
                )
                WeatherIconImage(o.smhiSymbolCode, condition, isNight(o.timestamp), o.temperature, null, Modifier.size(28.dp))
                Text("${formatValue(convertTemperature(o.temperature, unit), 1)}${temperatureUnitLabel(unit)}", Modifier.weight(1f), fontSize = 12.sp)
                Text("${formatValue(convertPrecipitation(o.precipitation, unit), 1)} ${precipitationUnitLabel(unit)}", Modifier.weight(1f), fontSize = 12.sp)
                Text("${formatValue(convertWindSpeed(o.windSpeed, unit), 1)} ${windUnitLabel(unit)}", Modifier.weight(1f), fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun DailyTable(days: List<DailyAggregate>, unit: UnitSystem) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        item { HeaderRow() }
        items(days, key = { it.bucketEnd }) { d ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    Instant.parse(d.bucketEnd).atZone(ZoneId.systemDefault()).format(ROW_DAY_FORMAT) +
                        if (d.isForecast) " ${stringResource(R.string.chart_forecastSuffix)}" else "",
                    Modifier.weight(1.4f),
                    fontSize = 12.sp,
                )
                WeatherIconImage(null, deriveDailyCondition(d), false, d.average, null, Modifier.size(28.dp))
                Text(
                    "${formatValue(convertTemperature(d.high, unit), 0)}° / ${formatValue(convertTemperature(d.low, unit), 0)}°",
                    Modifier.weight(1f), fontSize = 12.sp,
                )
                Text("${formatValue(convertPrecipitation(d.totalPrecipitation, unit), 1)} ${precipitationUnitLabel(unit)}", Modifier.weight(1f), fontSize = 12.sp)
                Text("${formatValue(convertWindSpeed(d.windAverage, unit), 1)} ${windUnitLabel(unit)}", Modifier.weight(1f), fontSize = 12.sp)
            }
        }
    }
}
