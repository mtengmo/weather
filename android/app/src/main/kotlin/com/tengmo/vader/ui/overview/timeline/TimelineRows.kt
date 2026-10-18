package com.tengmo.vader.ui.overview.timeline

import android.content.Context
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.layout.heightIn
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R
import com.tengmo.vader.data.model.WeatherCondition
import com.tengmo.vader.data.repository.TimelineData
import com.tengmo.vader.data.repository.TimelinePeriod
import com.tengmo.vader.data.repository.TimelineRow
import com.tengmo.vader.theme.AppColors
import com.tengmo.vader.ui.overview.WeatherIconImage
import com.tengmo.vader.ui.overview.conditionStringKey

/** Forecast marks are lighter than observed ones but stay readable against the forecast tint. */
private const val ForecastAlpha = 0.85f
private val IconSize = 36.dp
private val BarAreaHeight = 28.dp
private val BarWidth = 24.dp
private val WindArrowSize = 24.dp
private val TempBottomPad = 8.dp
private val TempLabelGap = 6.dp

private fun Context.stringNamed(name: String): String? =
    resources.getIdentifier(name, "string", packageName).takeIf { it != 0 }?.let(::getString)

internal fun conditionWord(context: Context, c: WeatherCondition?): String =
    c?.let { context.stringNamed(conditionStringKey(it)) } ?: DASH

/** Column title: hourly/daily use the builder's label; 3-day columns localize the period name. */
internal fun periodName(context: Context, p: TimelinePeriod): String =
    p.subDayPeriod?.let { context.stringNamed("subDay_$it") } ?: p.label

@Composable
private fun valueColor(isForecast: Boolean): Color =
    if (isForecast) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface

/** Time / period headings. Silent for TalkBack: the weather cell carries the full sentence. */
@Composable
internal fun TimelineHeaderRow(data: TimelineData, g: TimelineGeometry) {
    val context = LocalContext.current
    // Always tall enough for label + sub-label so 24h / 3 Days / 7 Days headers have identical height.
    val twoLines = with(LocalDensity.current) {
        MaterialTheme.typography.labelMedium.lineHeight.toDp() + MaterialTheme.typography.labelSmall.lineHeight.toDp()
    }
    Row(Modifier.width(g.totalWidth).timelineBackdrop(g).clearAndSetSemantics {}) {
        data.periods.forEachIndexed { i, p ->
            Column(
                Modifier.width(g.columnWidth).padding(vertical = 2.dp).heightIn(min = twoLines),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    periodName(context, p),
                    modifier = Modifier.nowKnockout(g, i),
                    style = if (p.subDayPeriod != null) MaterialTheme.typography.labelSmall else MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Clip,
                )
                p.subLabel?.let {
                    Text(it, modifier = Modifier.nowKnockout(g, i), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                }
            }
        }
    }
}

/** Character icon + condition word per column; each cell is one merged node reading [descriptions]. */
@Composable
internal fun TimelineWeatherRow(data: TimelineData, g: TimelineGeometry, descriptions: List<String>) {
    val context = LocalContext.current
    Row(Modifier.width(g.totalWidth).timelineBackdrop(g)) {
        data.periods.forEachIndexed { i, p ->
            Column(
                Modifier
                    .width(g.columnWidth)
                    .padding(vertical = 2.dp, horizontal = 2.dp)
                    .semantics(mergeDescendants = true) { contentDescription = descriptions.getOrElse(i) { "" } },
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(Modifier.size(IconSize).nowKnockout(g, i)) {
                    WeatherIconImage(
                        smhiSymbolCode = p.smhiSymbolCode,
                        condition = p.condition,
                        isNight = p.isNight,
                        temperatureCelsius = p.temperature,
                        contentDescription = null,
                        modifier = Modifier.size(IconSize),
                    )
                }
                Text(
                    conditionWord(context, p.condition),
                    modifier = Modifier.nowKnockout(g, i),
                    style = MaterialTheme.typography.labelSmall,
                    color = valueColor(p.isForecast),
                    textAlign = TextAlign.Center,
                    minLines = 2, // reserved so wrapping words never change the row height between modes
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

/** Smooth temperature line: observed solid, forecast dashed and lighter, value labels above. */
@Composable
internal fun TimelineTemperatureRow(row: TimelineRow, g: TimelineGeometry) {
    val values = remember(row) { row.points.map { it.value } }
    val runs = remember(row) { splitLineRuns(values, row.points.map { it.isForecast }) }
    val lineColor = AppColors.rowTemperature
    val observedText = MaterialTheme.colorScheme.onSurface
    val forecastText = MaterialTheme.colorScheme.onSurfaceVariant
    val measurer = rememberTextMeasurer()
    val labelStyle = MaterialTheme.typography.labelMedium
    val fontScale = LocalDensity.current.fontScale.coerceIn(1f, 1.4f)
    val knockouts = row.points.indices.map { g.crossesColumn(it) }
    val backdrops = row.points.indices.map { g.backdropColor(it) }
    // Room for one label above the highest point plus a short plot band; grows with the font scale.
    Canvas(
        Modifier
            .width(g.totalWidth)
            .height(40.dp + 24.dp * fontScale)
            .timelineBackdrop(g)
            .clearAndSetSemantics {},
    ) {
        val present = values.filterNotNull()
        if (present.isEmpty()) return@Canvas
        val lo = present.min()
        val hi = present.max()
        val range = (hi - lo).coerceAtLeast(1.0)
        val labelH = measurer.measure("0", labelStyle).size.height
        val top = labelH + TempLabelGap.toPx() + 3.dp.toPx()
        val plotH = size.height - top - TempBottomPad.toPx()
        val colW = g.columnWidth.toPx()
        fun x(i: Int) = colW * (i + 0.5f)
        fun y(v: Double) = top + ((hi - v) / range * plotH).toFloat()

        val dash = PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 4.dp.toPx()))
        val strokeW = 2.dp.toPx()
        runs.forEach { run ->
            val path = Path()
            path.moveTo(x(run.start), y(values[run.start]!!))
            for (i in run.start until run.end) {
                val midX = (x(i) + x(i + 1)) / 2
                path.cubicTo(midX, y(values[i]!!), midX, y(values[i + 1]!!), x(i + 1), y(values[i + 1]!!))
            }
            drawPath(
                path,
                if (run.forecast) lineColor.copy(alpha = ForecastAlpha) else lineColor,
                style = Stroke(strokeW, pathEffect = if (run.forecast) dash else null),
            )
        }
        row.points.forEachIndexed { i, p ->
            val v = p.value ?: return@forEachIndexed
            drawCircle(if (p.isForecast) lineColor.copy(alpha = ForecastAlpha) else lineColor, 3.dp.toPx(), Offset(x(i), y(v)))
            val text = measurer.measure(temperatureText(p), labelStyle.copy(color = if (p.isForecast) forecastText else observedText))
            val ty = (y(v) - text.size.height - TempLabelGap.toPx()).coerceAtLeast(0f)
            if (knockouts[i]) {
                drawRoundRect(
                    backdrops[i],
                    Offset(x(i) - text.size.width / 2f - 2.dp.toPx(), ty),
                    androidx.compose.ui.geometry.Size(text.size.width + 4.dp.toPx(), text.size.height.toFloat()),
                    androidx.compose.ui.geometry.CornerRadius(4.dp.toPx()),
                )
            }
            drawText(text, topLeft = Offset(x(i) - text.size.width / 2f, ty))
        }
    }
}

/** Bars for precipitation / snow: observed solid, forecast lighter; value (and chance) beneath. */
@Composable
internal fun TimelineBarRow(row: TimelineRow, g: TimelineGeometry, showChance: Boolean) {
    val scaleMax = remember(row) { (row.points.mapNotNull { it.value }.maxOrNull() ?: 0.0).coerceAtLeast(2.0) }
    val bar = MaterialTheme.colorScheme.tertiary
    Row(Modifier.width(g.totalWidth).timelineBackdrop(g).clearAndSetSemantics {}) {
        row.points.forEachIndexed { i, p ->
            Column(
                Modifier.width(g.columnWidth).padding(vertical = 2.dp, horizontal = 2.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(Modifier.fillMaxWidth().height(BarAreaHeight), contentAlignment = Alignment.BottomCenter) {
                    val v = p.value
                    if (v != null && v > 0.0) {
                        val h = (BarAreaHeight * (v / scaleMax).toFloat()).coerceAtLeast(2.dp)
                        Box(
                            Modifier
                                .width(BarWidth)
                                .height(h)
                                .background(bar.copy(alpha = if (p.isForecast) ForecastAlpha else 1f), RoundedCornerShape(topStart = 2.dp, topEnd = 2.dp)),
                        )
                    }
                }
                Text(
                    rainText(p, row.unitLabel),
                    modifier = Modifier.nowKnockout(g, i),
                    style = MaterialTheme.typography.labelSmall,
                    color = valueColor(p.isForecast),
                    textAlign = TextAlign.Center,
                )
                if (showChance) {
                    // Always rendered (blank when unknown) so the row height is the same in every mode.
                    Text(chanceText(p) ?: " ", modifier = Modifier.nowKnockout(g, i), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                }
            }
        }
    }
}

/** Wind arrow (rotated to where the wind blows towards) with speed and gust. */
@Composable
internal fun TimelineWindRow(row: TimelineRow, g: TimelineGeometry) {
    val arrowTint = MaterialTheme.colorScheme.onSurfaceVariant
    Row(Modifier.width(g.totalWidth).timelineBackdrop(g).clearAndSetSemantics {}) {
        row.points.forEachIndexed { i, p ->
            Column(
                Modifier.width(g.columnWidth).padding(vertical = 2.dp, horizontal = 2.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(Modifier.size(WindArrowSize).nowKnockout(g, i)) {
                    p.direction?.let { dir ->
                        Icon(
                            painterResource(R.drawable.ic_wind_arrow),
                            contentDescription = null,
                            tint = arrowTint,
                            modifier = Modifier.size(WindArrowSize).rotate((dir + 180.0).toFloat()),
                        )
                    }
                }
                Text(
                    windText(p, row.unitLabel),
                    modifier = Modifier.nowKnockout(g, i),
                    style = MaterialTheme.typography.labelSmall,
                    color = valueColor(p.isForecast),
                    textAlign = TextAlign.Center,
                    minLines = 2,
                    maxLines = 2,
                )
            }
        }
    }
}
