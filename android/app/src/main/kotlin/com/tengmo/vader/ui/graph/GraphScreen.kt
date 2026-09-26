package com.tengmo.vader.ui.graph

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tengmo.vader.R
import com.tengmo.vader.ui.OfflineIndicator
import com.tengmo.vader.ui.overview.RefreshCoordinator
import com.tengmo.vader.data.model.ObservationWindow
import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.model.WeatherMetric
import com.tengmo.vader.data.repository.formatValue
import com.tengmo.vader.data.repository.precipitationUnitLabel
import com.tengmo.vader.data.repository.temperatureUnitLabel
import com.tengmo.vader.data.repository.windUnitLabel

/** T042 — the Graph screen (US2): metric tabs, time-window tabs, the chart, and the nearby-
 *  station legend, with Home returning to the Overview (FR-014). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GraphScreen(onHome: () -> Unit, viewModel: GraphViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsState()

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        TextButton(onClick = onHome) { Text(stringResource(R.string.app_homeButton)) }
        RefreshCoordinator(state.lastUpdatedEpochMillis, enabled = !state.isLoading, onRefresh = viewModel::refresh)
        OfflineIndicator(
            showingCachedData = false,
            lastUpdatedEpochMillis = state.lastUpdatedEpochMillis,
            hasAnyData = state.series != null,
        )
        state.location?.let { Text(it.displayName, fontSize = 20.sp, color = MaterialTheme.colorScheme.onBackground) }

        // Metric tabs (MetricTabs.tsx).
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(
                WeatherMetric.Temperature to R.string.metricTabs_temperature,
                WeatherMetric.Rain to R.string.metricTabs_rain,
                WeatherMetric.Wind to R.string.metricTabs_wind,
                WeatherMetric.Cloud to R.string.metricTabs_cloud,
            ).forEach { (metric, label) ->
                FilterChip(
                    selected = state.metric == metric,
                    onClick = { viewModel.setMetric(metric) },
                    label = { Text(stringResource(label)) },
                )
            }
        }

        // Window tabs.
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

        if (state.isLoading) {
            Text(stringResource(R.string.chart_loading))
        } else {
            val ownLabel = state.location?.displayName ?: ""
            val chartSeries = viewModel.buildChartSeries(state, ownLabel)
            if (chartSeries.isEmpty() || chartSeries.all { s -> s.points.all { it.value == null } }) {
                Text(
                    stringResource(
                        R.string.chart_metricUnavailable,
                        metricLabel(state.metric),
                    ),
                )
            } else {
                val unit = state.preferences.unit
                ObservationChart(
                    series = chartSeries,
                    unitLabel = unitLabelFor(state.metric, unit),
                    formatValue = { formatValue(it, if (state.metric == WeatherMetric.Cloud) 0 else 1) },
                )
                // Legend.
                FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    chartSeries.forEach { s -> Text(s.label, color = s.color, fontSize = 12.sp) }
                }
            }
        }
    }
}

@Composable
private fun metricLabel(metric: WeatherMetric): String = stringResource(
    when (metric) {
        WeatherMetric.Temperature -> R.string.metricTabs_temperature
        WeatherMetric.Rain -> R.string.metricTabs_rain
        WeatherMetric.Wind -> R.string.metricTabs_wind
        WeatherMetric.Cloud -> R.string.metricTabs_cloud
    },
)

private fun unitLabelFor(metric: WeatherMetric, unit: UnitSystem): String = when (metric) {
    WeatherMetric.Temperature -> temperatureUnitLabel(unit)
    WeatherMetric.Rain -> precipitationUnitLabel(unit)
    WeatherMetric.Wind -> windUnitLabel(unit)
    WeatherMetric.Cloud -> "%"
}
