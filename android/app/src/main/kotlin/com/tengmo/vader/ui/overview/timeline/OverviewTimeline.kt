package com.tengmo.vader.ui.overview.timeline

import android.provider.Settings
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R
import com.tengmo.vader.data.repository.TimelineData
import com.tengmo.vader.data.repository.TimelineMode

private val BaseColumnWidth = 72.dp

/** Grows the fixed widths with the system font scale so text stays unclipped. */
@Composable
private fun fontScaleFactor(): Float = LocalDensity.current.fontScale.coerceIn(1f, 1.4f)
private val BaseLabelWidth = 96.dp

/** The Overview timeline: observed + forecast on one series, with a fixed row-label column and
 *  a shared horizontal scroll that opens centred on "Now". Thin shell over the row composables. */
@Composable
fun OverviewTimeline(
    timeline: TimelineData?,
    mode: TimelineMode,
    extendedForecast: Boolean,
    isLoading: Boolean,
    onModeChange: (TimelineMode) -> Unit,
    onExtendedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TimelineControls(mode, extendedForecast, onModeChange, onExtendedChange)
        Box(Modifier.fillMaxWidth().height(4.dp)) {
            if (isLoading) LinearProgressIndicator(Modifier.fillMaxWidth())
        }
        if (timeline != null) {
            TimelineBody(timeline)
        } else if (!isLoading) {
            Text(
                stringResource(R.string.weatherOverview_noData),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimelineControls(
    mode: TimelineMode,
    extended: Boolean,
    onModeChange: (TimelineMode) -> Unit,
    onExtendedChange: (Boolean) -> Unit,
) {
    val options = listOf(
        TimelineMode.Hours24 to stringResource(R.string.weatherOverview_windowLabel24h),
        TimelineMode.Days3 to stringResource(R.string.weatherOverview_windowLabel3d),
        TimelineMode.Days7 to stringResource(R.string.weatherOverview_windowLabel7d),
    )
    val groupLabel = stringResource(R.string.weatherOverview_windowGroupLabel)
    SingleChoiceSegmentedButtonRow(
        Modifier.fillMaxWidth().semantics { contentDescription = groupLabel },
    ) {
        options.forEachIndexed { index, (value, label) ->
            SegmentedButton(
                selected = value == mode,
                onClick = { onModeChange(value) },
                shape = SegmentedButtonDefaults.itemShape(index, options.size),
                modifier = Modifier.heightIn(min = 48.dp),
            ) { Text(label, maxLines = 1, overflow = TextOverflow.Ellipsis) }
        }
    }
    if (mode == TimelineMode.Hours24) {
        Row(Modifier.fillMaxWidth()) {
            FilterChip(
                selected = extended,
                onClick = { onExtendedChange(!extended) },
                label = {
                    Text(
                        stringResource(R.string.weatherOverview_show48h),
                    )
                },
            )
        }
    }
}

@Composable
private fun TimelineBody(data: TimelineData) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val LabelWidth = BaseLabelWidth * fontScaleFactor()
    val ColumnWidth = BaseColumnWidth * fontScaleFactor()
    val config = LocalConfiguration.current
    val scrollState = rememberScrollState()
    var viewportPx by remember { mutableIntStateOf(0) }
    var firstCentering by remember { mutableStateOf(true) }
    val g = remember(data.periods, data.nowPosition) {
        TimelineGeometry(ColumnWidth, data.periods.size, firstForecastIndex(data.periods.map { it.isForecast }), data.nowPosition)
    }
    val template = stringResource(R.string.timelineColumn_a11y)
    val templateForecast = stringResource(R.string.timelineColumn_a11yForecast)
    val descriptions = remember(data, template, templateForecast, config) {
        data.periods.mapIndexed { i, p ->
            val rain = data.precipitation.points[i]
            val rainSpoken = chanceText(rain)?.let { "${rainText(rain, data.precipitation.unitLabel)} ($it)" }
                ?: rainText(rain, data.precipitation.unitLabel)
            columnDescription(
                if (p.isForecast) templateForecast else template,
                label = listOfNotNull(periodName(context, p), p.subLabel).joinToString(" "),
                condition = conditionWord(context, p.condition),
                temperature = temperatureText(data.temperature.points[i]),
                rain = rainSpoken,
                wind = windText(data.wind.points[i], data.wind.unitLabel),
            )
        }
    }

    // Open centred on Now, and re-centre when the mode / forecast reach changes.
    val reduceMotion = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
    LaunchedEffect(data.mode, data.periods.size, viewportPx > 0) {
        if (viewportPx == 0) return@LaunchedEffect
        val nowX = nowOffset(g.nowPosition, with(density) { g.totalWidth.toPx() }) ?: return@LaunchedEffect
        withFrameNanos { } // let the new content lay out so maxValue is current
        val target = centeredScrollTarget(nowX, viewportPx, scrollState.maxValue)
        if (firstCentering || reduceMotion) scrollState.scrollTo(target) else scrollState.animateScrollTo(target)
        firstCentering = false
    }

    val labelPx = with(density) { LabelWidth.roundToPx() }
    Column(Modifier.fillMaxWidth().onSizeChanged { viewportPx = (it.width - labelPx).coerceAtLeast(0) }) {
        TimelineLine(null, null, scrollState) { TimelineCaptionRow(g) }
        TimelineLine(null, null, scrollState) { TimelineHeaderRow(data, g) }
        TimelineLine(stringResource(R.string.weatherOverview_weatherRowTitle), null, scrollState) {
            TimelineWeatherRow(data, g, descriptions)
        }
        TimelineLine(stringResource(R.string.timelineRow_temperature), data.temperature.unitLabel, scrollState) {
            TimelineTemperatureRow(data.temperature, g)
        }
        TimelineLine(stringResource(R.string.timelineRow_precipitation), data.precipitation.unitLabel, scrollState) {
            TimelineBarRow(data.precipitation, g, showChance = true)
        }
        TimelineLine(stringResource(R.string.timelineRow_wind), data.wind.unitLabel, scrollState) {
            TimelineWindRow(data.wind, g)
        }
        data.snow?.let { snow ->
            TimelineLine(stringResource(R.string.timelineRow_snow), snow.unitLabel, scrollState) {
                TimelineBarRow(snow, g, showChance = false)
            }
        }
    }
}

/** One timeline row: fixed label cell on the left, content scrolling with the shared [scrollState]. */
@Composable
private fun TimelineLine(
    label: String?,
    unit: String?,
    scrollState: androidx.compose.foundation.ScrollState,
    content: @Composable () -> Unit,
) {
    val LabelWidth = BaseLabelWidth * fontScaleFactor()
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.width(LabelWidth).padding(end = 4.dp)) {
            if (label != null) {
                Text(
                    label,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            if (unit != null) {
                Text(
                    unit,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                )
            }
        }
        Box(Modifier.weight(1f).horizontalScroll(scrollState)) { content() }
    }
}
