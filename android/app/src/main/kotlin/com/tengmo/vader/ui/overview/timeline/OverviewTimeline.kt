package com.tengmo.vader.ui.overview.timeline

import android.provider.Settings
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Icon
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.Dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.wrapContentHeight
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
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R
import com.tengmo.vader.data.model.WeatherCondition
import com.tengmo.vader.data.repository.TimelineData
import com.tengmo.vader.data.repository.TimelineMode
import com.tengmo.vader.data.repository.TimelineRow

private val BaseColumnWidth = 72.dp

/** Grows the fixed widths with the system font scale so text stays unclipped. */
@Composable
private fun fontScaleFactor(): Float = LocalDensity.current.fontScale.coerceIn(1f, 1.4f)
private val MaxLabelWidth = 88.dp
private val ScrimExtra = 20.dp
private val LabelGap = 6.dp

/** An additional timeline row drawn after the snow row (the sea page's waves, swell, ...). */
data class TimelineExtraRow(
    val title: String,
    val unit: String?,
    /** Small muted source line under the title/unit (station + distance, or "Model forecast"). */
    val sublabel: String?,
    val row: TimelineRow,
    val renderer: @Composable (TimelineRow, TimelineGeometry) -> Unit,
)

/** The Overview timeline: observed + forecast on one series, with row titles floating over the data
 *  (fading while scrolling), a Now button and a shared horizontal scroll that opens centred on "Now". Thin shell over the row composables. */
@Composable
fun OverviewTimeline(
    timeline: TimelineData?,
    mode: TimelineMode,
    extendedForecast: Boolean,
    isLoading: Boolean,
    onModeChange: (TimelineMode) -> Unit,
    onExtendedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    extraRows: List<TimelineExtraRow> = emptyList(),
) {
    Column(modifier) {
        TimelineControls(mode, onModeChange)
        Box(Modifier.fillMaxWidth().height(4.dp)) {
            if (isLoading) LinearProgressIndicator(Modifier.fillMaxWidth())
        }
        if (timeline != null) {
            TimelineBody(timeline, timeline.mode == TimelineMode.Hours24, extendedForecast, onExtendedChange, extraRows)
        } else if (!isLoading) {
            Text(
                stringResource(R.string.weatherOverview_noData),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun TimelineControls(
    mode: TimelineMode,
    onModeChange: (TimelineMode) -> Unit,
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
}

@Composable
private fun TimelineBody(
    data: TimelineData,
    showExtendedChip: Boolean,
    extended: Boolean,
    onExtendedChange: (Boolean) -> Unit,
    extraRows: List<TimelineExtraRow>,
) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val ColumnWidth = BaseColumnWidth * fontScaleFactor()
    val config = LocalConfiguration.current
    val scrollState = rememberScrollState()
    val scope = rememberCoroutineScope()
    var viewportPx by remember { mutableIntStateOf(0) }
    var labelPx by remember { mutableIntStateOf(0) }
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
                windySuffix = if (p.windy && p.condition != WeatherCondition.Windy) conditionWord(context, WeatherCondition.Windy) else null,
            )
        }
    }

    val reduceMotion = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
    // Now's x inside the scrolling content: the start padding (title zone) plus its offset in the columns.
    val nowContentX: Float? = nowOffset(g.nowPosition, with(density) { g.totalWidth.toPx() })?.plus(labelPx)

    // Open centred on Now, and re-centre when the mode / forecast reach changes.
    LaunchedEffect(data.mode, data.periods.size, viewportPx > 0, labelPx > 0) {
        if (viewportPx == 0) return@LaunchedEffect
        val nowX = nowContentX ?: return@LaunchedEffect
        withFrameNanos { } // let the new content lay out so maxValue is current
        val target = centeredScrollTarget(nowX, viewportPx, scrollState.maxValue)
        if (firstCentering || reduceMotion) scrollState.scrollTo(target) else scrollState.animateScrollTo(target)
        firstCentering = false
    }

    // Row titles hide while scrolling and return a moment after it stops.
    var titlesShown by remember { mutableStateOf(true) }
    val scrolling = scrollState.isScrollInProgress
    LaunchedEffect(scrolling) {
        if (scrolling) {
            titlesShown = false
        } else {
            if (!reduceMotion) delay(TitleReturnDelayMs)
            titlesShown = true
        }
    }
    val titleAlpha by animateFloatAsState(
        targetValue = if (titlesShown) 1f else 0f,
        animationSpec = if (reduceMotion) snap() else if (titlesShown) tween(250) else tween(150, easing = FastOutSlowInEasing),
        label = "titleAlpha",
    )
    val onLabelWidth: (Int) -> Unit = { w -> if (w > labelPx) labelPx = w }

    val direction = nowDirection(nowContentX, scrollState.value, viewportPx)
    val goToNow = stringResource(R.string.timeline_goToNow)
    val pad = with(density) { labelPx.toDp() }

    Column(Modifier.fillMaxWidth().onSizeChanged { viewportPx = it.width }) {
        // Chip strip: reserved space so the 48 h / Now chips never overlap a caption at any font scale.
        // Fixed height in every mode: chips (48dp touch target) overflow it instead of growing it.
        Box(Modifier.fillMaxWidth().height(32.dp)) {
            ExtendedChip(
                visible = showExtendedChip,
                extended = extended,
                reduceMotion = reduceMotion,
                onClick = { onExtendedChange(!extended) },
            )
            NowButton(
                direction = direction,
                label = goToNow,
                reduceMotion = reduceMotion,
                onClick = {
                    val nowX = nowContentX ?: return@NowButton
                    val target = centeredScrollTarget(nowX, viewportPx, scrollState.maxValue)
                    scope.launch { if (reduceMotion) scrollState.scrollTo(target) else scrollState.animateScrollTo(target) }
                },
            )
        }
        Column(Modifier.fillMaxWidth()) {
            TimelineLine(null, null, scrollState, pad, titleAlpha, onLabelWidth) { TimelineCaptionRow(g) }
            TimelineLine(null, null, scrollState, pad, titleAlpha, onLabelWidth) { TimelineHeaderRow(data, g) }
            TimelineLine(stringResource(R.string.weatherOverview_weatherRowTitle), null, scrollState, pad, titleAlpha, onLabelWidth) {
                TimelineWeatherRow(data, g, descriptions)
            }
            TimelineLine(stringResource(R.string.timelineRow_temperature), data.temperature.unitLabel, scrollState, pad, titleAlpha, onLabelWidth) {
                TimelineTemperatureRow(data.temperature, g)
            }
            TimelineLine(stringResource(R.string.timelineRow_precipitation), data.precipitation.unitLabel, scrollState, pad, titleAlpha, onLabelWidth) {
                TimelineBarRow(data.precipitation, g, showChance = true)
            }
            TimelineLine(stringResource(R.string.timelineRow_wind), data.wind.unitLabel, scrollState, pad, titleAlpha, onLabelWidth) {
                TimelineWindRow(data.wind, g)
            }
            data.snow?.let { snow ->
                TimelineLine(stringResource(R.string.timelineRow_snow), snow.unitLabel, scrollState, pad, titleAlpha, onLabelWidth) {
                    TimelineBarRow(snow, g, showChance = false)
                }
            }
            extraRows.forEach { extra ->
                TimelineLine(extra.title, extra.unit, scrollState, pad, titleAlpha, onLabelWidth, subtitle = extra.sublabel) {
                    extra.renderer(extra.row, g)
                }
            }
        }
    }
}

private const val TitleReturnDelayMs = 900L

/** Overlay toggle for the 48 h forecast reach (24 Hours mode only); lives in the reserved chip strip above the captions. */
@Composable
private fun BoxScope.ExtendedChip(visible: Boolean, extended: Boolean, reduceMotion: Boolean, onClick: () -> Unit) {
    AnimatedVisibility(
        visible = visible,
        modifier = Modifier.align(Alignment.CenterStart).wrapContentHeight(Alignment.CenterVertically, unbounded = true),
        enter = if (reduceMotion) EnterTransition.None else fadeIn() + scaleIn(initialScale = 0.8f),
        exit = if (reduceMotion) ExitTransition.None else fadeOut() + scaleOut(targetScale = 0.8f),
    ) {
        val name = stringResource(R.string.weatherOverview_show48h)
        val state = stringResource(if (extended) R.string.timeline_extendedOn else R.string.timeline_extendedOff)
        FilterChip(
            selected = extended,
            onClick = onClick,
            modifier = Modifier.semantics {
                contentDescription = name
                stateDescription = state
            },
            label = { Text(stringResource(R.string.timeline_extendedShort), maxLines = 1) },
            leadingIcon = if (extended) {
                { Icon(painterResource(R.drawable.ic_check), null, Modifier.size(18.dp)) }
            } else null,
        )
    }
}

/** Returns the timeline to Now; shown only while the Now marker is off-screen, arrow points at it. */
@Composable
private fun BoxScope.NowButton(direction: NowDirection, label: String, reduceMotion: Boolean, onClick: () -> Unit) {
    AnimatedVisibility(
        visible = direction != NowDirection.None,
        modifier = Modifier.align(Alignment.CenterEnd).wrapContentHeight(Alignment.CenterVertically, unbounded = true),
        enter = if (reduceMotion) EnterTransition.None else fadeIn() + scaleIn(initialScale = 0.8f),
        exit = if (reduceMotion) ExitTransition.None else fadeOut() + scaleOut(targetScale = 0.8f),
    ) {
        val nowText = stringResource(R.string.weatherOverview_now)
        AssistChip(
            onClick = onClick,
            modifier = Modifier.semantics { contentDescription = label },
            label = { Text(nowText, maxLines = 1) },
            leadingIcon = if (direction == NowDirection.Left) {
                { Icon(painterResource(R.drawable.ic_arrow_back), null, Modifier.size(18.dp)) }
            } else null,
            trailingIcon = if (direction == NowDirection.Right) {
                { Icon(painterResource(R.drawable.ic_arrow_forward), null, Modifier.size(18.dp)) }
            } else null,
        )
    }
}

/**
 * One timeline row: content scrolls with the shared [scrollState] under a start padding of [startPad]
 * (the title zone, so the first column clears the titles at the left end). The row title floats over
 * the data on a backdrop-coloured fade and is decorative for TalkBack.
 */
@Composable
private fun TimelineLine(
    label: String?,
    unit: String?,
    scrollState: androidx.compose.foundation.ScrollState,
    startPad: Dp,
    titleAlpha: Float,
    onLabelWidth: (Int) -> Unit,
    subtitle: String? = null,
    content: @Composable () -> Unit,
) {
    val labelGapPx = with(LocalDensity.current) { (LabelGap + 4.dp).roundToPx() }
    // The label overlay is matched to the row's height, so a row with a subtitle (sea rows) reserves
    // room for label + unit + subtitle instead of clipping the subtitle.
    val minHeight = if (subtitle != null) 64.dp * fontScaleFactor() else 0.dp
    Box(Modifier.fillMaxWidth().heightIn(min = minHeight)) {
        Box(Modifier.fillMaxWidth().horizontalScroll(scrollState)) {
            Box(Modifier.padding(start = startPad)) { content() }
        }
        if (label != null) {
            val backdrop = MaterialTheme.colorScheme.background
            Box(
                Modifier.matchParentSize().alpha(titleAlpha).clearAndSetSemantics {},
                contentAlignment = Alignment.CenterStart,
            ) {
                Box(
                    Modifier.fillMaxHeight().width(startPad + ScrimExtra)
                        .background(Brush.horizontalGradient(0f to backdrop.copy(alpha = 0.92f), 0.6f to backdrop.copy(alpha = 0.7f), 1f to Color.Transparent)),
                )
                Column(
                    Modifier.padding(start = LabelGap).widthIn(max = MaxLabelWidth * fontScaleFactor())
                        .onSizeChanged { onLabelWidth(it.width + labelGapPx) },
                ) {
                    Text(
                        label,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (unit != null) {
                        Text(
                            unit,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                        )
                    }
                    if (subtitle != null) {
                        Text(
                            subtitle,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }
    }
}
