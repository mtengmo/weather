package com.tengmo.vader.ui.sea

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tengmo.vader.R
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.SeaMetric
import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.model.UserPreferences
import com.tengmo.vader.data.repository.WAVE_LEVEL_LOWER_BOUNDS_M
import com.tengmo.vader.data.repository.buildSeaRows
import com.tengmo.vader.data.repository.mergeObservedAndModel
import com.tengmo.vader.data.repository.observationIcon
import com.tengmo.vader.data.repository.summarizeSea
import com.tengmo.vader.data.repository.waveHeightLevel
import com.tengmo.vader.data.repository.waveLegendLabels
import com.tengmo.vader.data.source.SmhiOceanSource
import com.tengmo.vader.theme.AppColors
import com.tengmo.vader.theme.LocalWaveColors
import com.tengmo.vader.ui.DataFreshnessIndicator
import com.tengmo.vader.ui.overview.LocationGate
import com.tengmo.vader.ui.overview.OverviewViewModel
import com.tengmo.vader.ui.overview.RefreshCoordinator
import com.tengmo.vader.ui.overview.timeline.OverviewTimeline
import com.tengmo.vader.ui.overview.timeline.TimelineBarRow
import com.tengmo.vader.ui.overview.timeline.TimelineDirectionRow
import com.tengmo.vader.ui.overview.timeline.TimelineExtraRow
import com.tengmo.vader.ui.overview.timeline.TimelineLineRow
import com.tengmo.vader.ui.overview.timeline.rowValueText
import java.time.ZoneId
import kotlinx.coroutines.delay

/**
 * "Kustvader" - the sea weather page (port of SeaOverview.tsx): the sjorapport, an "At sea now"
 * summary card and the Overview timeline extended with waves, swell, sea temperature, water level
 * and current rows. The weather rows come from the shared [OverviewViewModel].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SeaScreen(
    onOpenFavorites: () -> Unit,
    overviewViewModel: OverviewViewModel,
    seaViewModel: SeaViewModel = viewModel(),
) {
    val context = LocalContext.current
    val prefs by ServiceLocator.get(context).preferencesStore.preferences.collectAsState(initial = UserPreferences())
    val state by overviewViewModel.uiState.collectAsState()

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LocationGate(state, overviewViewModel, onOpenFavorites) { location ->
            val sea by seaViewModel.state.collectAsState()
            LaunchedEffect(location.latitude, location.longitude) { seaViewModel.load(location.latitude, location.longitude) }

            val unit = prefs.unit
            val data = sea.data
            val merged = remember(data.observations, data.marineHours) { mergeObservedAndModel(data.observations, data.marineHours) }
            val rows = remember(state.timeline, merged, unit) { state.timeline?.let { buildSeaRows(it, merged, unit) } }
            // "Now" ticks once a minute so the summary does not freeze while the tab stays open.
            val nowMillis by produceState(System.currentTimeMillis()) {
                while (true) {
                    delay(60_000)
                    value = System.currentTimeMillis()
                }
            }
            val summary = remember(merged, state.observations, nowMillis) { summarizeSea(merged, state.observations, nowMillis) }

            val stations = remember(data.observations) { stationInfos(data.observations) }
            val metricStations = remember(data.observations) {
                SmhiOceanSource.SEA_METRICS.mapNotNull { m ->
                    data.observations[m]?.takeIf { it.points.isNotEmpty() }?.let { m to SeaStationInfo(it.station.name, it.station.distanceKm, it.points.last().time) }
                }.toMap()
            }

            val seaLoading = data.isLoading
            val noMarineData = !seaLoading && data.marineStatus == SeaSourceStatus.Ready &&
                merged.waveHeight.isEmpty() && merged.seaTemperature.isEmpty() && merged.waterLevel.isEmpty()

            val pullState = rememberPullToRefreshState()
            PullToRefreshBox(
                isRefreshing = state.isUserRefreshing,
                onRefresh = {
                    overviewViewModel.refresh(force = true, userInitiated = true)
                    seaViewModel.load(location.latitude, location.longitude, force = true)
                },
                modifier = Modifier.fillMaxSize(),
                state = pullState,
                indicator = {
                    PullToRefreshDefaults.Indicator(
                        state = pullState,
                        isRefreshing = state.isUserRefreshing,
                        modifier = Modifier.align(Alignment.TopCenter),
                        containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                        color = MaterialTheme.colorScheme.primary,
                    )
                },
            ) {
                Column(
                    Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(start = 12.dp, end = 12.dp, bottom = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    RefreshCoordinator(
                        lastUpdatedEpochMillis = state.lastUpdatedEpochMillis,
                        enabled = !state.isRefreshing,
                        onRefresh = { overviewViewModel.refresh(force = false, userInitiated = false) },
                    )
                    DataFreshnessIndicator(
                        lastUpdatedEpochMillis = state.lastUpdatedEpochMillis,
                        isUpdating = state.isRefreshing,
                        showingCachedData = state.showingCachedData,
                        hasAnyData = state.observations.isNotEmpty(),
                        onRefresh = { overviewViewModel.refresh(force = true, userInitiated = true) },
                    )

                    SeaReportCard(sea.report)

                    SeaSummaryCard(
                        summary = summary,
                        unit = unit,
                        location = location,
                        stations = stations,
                        metricStations = metricStations,
                        currentIcon = state.currentObservation?.let { observationIcon(it, ZoneId.systemDefault()) },
                    )

                    if (state.loadFailed) {
                        Text(stringResource(R.string.weatherOverview_unavailable), color = MaterialTheme.colorScheme.error)
                    }
                    if (seaLoading) Text(stringResource(R.string.seaWeather_loadingSea), style = MaterialTheme.typography.bodyMedium)
                    if (data.marineStatus == SeaSourceStatus.Error) {
                        Text(stringResource(R.string.seaWeather_seaError), color = MaterialTheme.colorScheme.error)
                    }
                    if (noMarineData) Text(stringResource(R.string.seaWeather_noMarineData), style = MaterialTheme.typography.bodyMedium)

                    OverviewTimeline(
                        timeline = state.timeline,
                        mode = state.timelineMode,
                        extendedForecast = state.extendedForecast,
                        isLoading = state.isTimelineLoading,
                        onModeChange = overviewViewModel::setTimelineMode,
                        onExtendedChange = overviewViewModel::setExtendedForecast,
                        extraRows = seaExtraRows(rows, data.observations.mapValues { it.value?.station }, unit),
                    )

                    if (rows != null && rows.waves.available) WaveLegend()
                }
            }
        }
    }
}

/** Distinct observing stations (a station can supply several metrics) with their latest reading time. */
internal fun stationInfos(observations: Map<SeaMetric, com.tengmo.vader.data.model.SeaObservation?>): List<SeaStationInfo> {
    val result = mutableListOf<SeaStationInfo>()
    for (metric in SmhiOceanSource.SEA_METRICS) {
        val obs = observations[metric] ?: continue
        if (obs.points.isEmpty()) continue
        val time = obs.points.last().time
        val i = result.indexOfFirst { it.name == obs.station.name }
        if (i >= 0) result[i] = result[i].copy(time = maxOf(result[i].time, time))
        else result += SeaStationInfo(obs.station.name, obs.station.distanceKm, time)
    }
    return result
}

@Composable
private fun seaExtraRows(
    rows: com.tengmo.vader.data.repository.SeaRows?,
    stations: Map<SeaMetric, com.tengmo.vader.data.model.SeaStation?>,
    unit: UnitSystem,
): List<TimelineExtraRow> {
    if (rows == null) return emptyList()
    val context = LocalContext.current
    val waveColors = LocalWaveColors.current
    val modelLabel = stringResource(R.string.seaWeather_modelSource)
    fun stationLabel(metric: SeaMetric): String = stations[metric]?.let {
        context.getString(R.string.seaWeather_stationSub, it.name, Math.round(it.distanceKm).toString())
    } ?: modelLabel
    val waveBar: (com.tengmo.vader.data.repository.TimelineRowPoint) -> androidx.compose.ui.graphics.Color? = { p ->
        p.value?.let { v ->
            val meters = if (unit == UnitSystem.Imperial) v / 3.28084 else v
            waveColors.forLevel(waveHeightLevel(meters))
        }
    }
    val levelColor = MaterialTheme.colorScheme.tertiary
    return buildList {
        if (rows.waves.available) {
            add(TimelineExtraRow(stringResource(R.string.timelineRow_waves), rows.waves.unitLabel, stationLabel(SeaMetric.WaveHeight), rows.waves) { r, g ->
                TimelineBarRow(r, g, showChance = false, barColor = waveBar, sea = true)
            })
        }
        if (rows.swell.available) {
            add(TimelineExtraRow(stringResource(R.string.timelineRow_swell), rows.swell.unitLabel, modelLabel, rows.swell) { r, g ->
                TimelineBarRow(r, g, showChance = false, barColor = waveBar, sea = true)
            })
        }
        if (rows.seaTemperature.available) {
            add(TimelineExtraRow(stringResource(R.string.timelineRow_seaTemperature), rows.seaTemperature.unitLabel, stationLabel(SeaMetric.SeaTemperature), rows.seaTemperature) { r, g ->
                TimelineLineRow(r, g, AppColors.rowTemperature, exactRange = true) { rowValueText(r, it) }
            })
        }
        if (rows.waterLevel.available) {
            add(TimelineExtraRow(stringResource(R.string.timelineRow_waterLevel), rows.waterLevel.unitLabel, stationLabel(SeaMetric.WaterLevel), rows.waterLevel) { r, g ->
                TimelineLineRow(r, g, levelColor, exactRange = true) { rowValueText(r, it) }
            })
        }
        if (rows.current.available) {
            add(TimelineExtraRow(stringResource(R.string.timelineRow_current), rows.current.unitLabel, modelLabel, rows.current) { r, g ->
                TimelineDirectionRow(r, g)
            })
        }
    }
}

/** Wave-height colour key: one swatch per level with its range in metres (like web). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun WaveLegend() {
    val colors = LocalWaveColors.current
    val labels = waveLegendLabels()
    val description = stringResource(R.string.seaWeather_waveLegend) + ": " + labels.joinToString(", ")
    Column(Modifier.padding(top = 8.dp).semantics(mergeDescendants = true) { contentDescription = description }) {
        Text(stringResource(R.string.seaWeather_waveLegend), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            WAVE_LEVEL_LOWER_BOUNDS_M.indices.forEach { i ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Box(Modifier.size(12.dp).background(colors.forLevel(i + 1), RoundedCornerShape(2.dp)))
                    Text(labels[i], style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
