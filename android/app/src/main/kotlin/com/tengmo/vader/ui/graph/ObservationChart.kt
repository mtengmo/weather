package com.tengmo.vader.ui.graph

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.math.abs

/** One plotted point. A null [value] is a gap (line breaks there, matching the web chart's
 *  treatment of missing readings). */
data class ChartPoint(val epochMillis: Long, val value: Double?, val isForecast: Boolean = false)

/** One line on the chart — the location's own series, a nearby station, a high/low line, etc. */
data class ChartSeries(
    val label: String,
    val color: Color,
    val points: List<ChartPoint>,
    /** Draw thinner, for secondary series (nearby stations, high/low). */
    val secondary: Boolean = false,
)

private val TOOLTIP_TIME_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("EEE HH:mm")

/**
 * T040 — line chart (metric switch and window are chosen by the caller; this only draws).
 * Observed points are drawn solid, forecast points dashed (matching the web's Recharts styling,
 * FR-011); a vertical "now" marker separates them; dragging or tapping inspects the nearest
 * point's value (US2 scenario 3). Y-range is padded from the data; nothing is fabricated.
 */
@Composable
fun ObservationChart(
    series: List<ChartSeries>,
    unitLabel: String,
    formatValue: (Double) -> String,
    modifier: Modifier = Modifier,
) {
    val allPoints = series.flatMap { it.points }.filter { it.value != null }
    if (allPoints.isEmpty()) return

    val minX = allPoints.minOf { it.epochMillis }
    val maxX = allPoints.maxOf { it.epochMillis }
    val rawMinY = allPoints.minOf { it.value!! }
    val rawMaxY = allPoints.maxOf { it.value!! }
    val pad = ((rawMaxY - rawMinY) * 0.1).coerceAtLeast(0.5)
    val minY = rawMinY - pad
    val maxY = rawMaxY + pad

    var inspectX by remember { mutableStateOf<Float?>(null) }
    var plotWidthPx by remember { mutableStateOf(1f) }
    val gridColor = MaterialTheme.colorScheme.outline
    val labelColor = MaterialTheme.colorScheme.onSurface
    val nowMillis = System.currentTimeMillis()

    Column(modifier) {
        Canvas(
            Modifier
                .fillMaxWidth()
                .height(240.dp)
                .onSizeChanged { plotWidthPx = it.width.toFloat().coerceAtLeast(1f) }
                .pointerInput(Unit) {
                    detectDragGestures(
                        onDragStart = { inspectX = it.x },
                        onDrag = { change, _ -> inspectX = change.position.x },
                        onDragEnd = { inspectX = null },
                        onDragCancel = { inspectX = null },
                    )
                }
                .pointerInput(Unit) {
                    detectTapGestures(onPress = { inspectX = it.x; tryAwaitRelease(); inspectX = null })
                },
        ) {
            val w = size.width
            val h = size.height
            fun xOf(t: Long) = if (maxX == minX) w / 2 else ((t - minX).toFloat() / (maxX - minX)) * w
            fun yOf(v: Double) = h - ((v - minY) / (maxY - minY)).toFloat() * h

            // Horizontal grid lines (4 bands).
            for (i in 0..4) {
                val y = h * i / 4
                drawLine(gridColor, Offset(0f, y), Offset(w, y), strokeWidth = 1f)
            }

            // "Now" marker between observed and forecast.
            if (nowMillis in minX..maxX) {
                val nx = xOf(nowMillis)
                drawLine(labelColor.copy(alpha = 0.5f), Offset(nx, 0f), Offset(nx, h), strokeWidth = 2f)
            }

            series.forEach { s ->
                val strokeWidth = if (s.secondary) 2f else 4f
                // Split into contiguous runs of (same forecast-ness, non-null value) so gaps break
                // the line and forecast segments are dashed.
                var path = Path()
                var pathStarted = false
                var currentForecast = false
                fun flush() {
                    if (pathStarted) {
                        drawPath(
                            path,
                            s.color,
                            style = Stroke(
                                width = strokeWidth,
                                pathEffect = if (currentForecast) PathEffect.dashPathEffect(floatArrayOf(12f, 10f)) else null,
                            ),
                        )
                    }
                    path = Path()
                    pathStarted = false
                }
                s.points.forEach { p ->
                    val v = p.value
                    if (v == null) {
                        flush()
                        return@forEach
                    }
                    val x = xOf(p.epochMillis)
                    val y = yOf(v)
                    if (pathStarted && p.isForecast != currentForecast) {
                        // Carry the join point into the new (differently-styled) run.
                        flush()
                        path.moveTo(x, y)
                        pathStarted = true
                        currentForecast = p.isForecast
                        return@forEach
                    }
                    if (!pathStarted) {
                        path.moveTo(x, y)
                        pathStarted = true
                        currentForecast = p.isForecast
                    } else {
                        path.lineTo(x, y)
                    }
                }
                flush()
            }

            // Inspect crosshair.
            inspectX?.let { ix ->
                val cx = ix.coerceIn(0f, w)
                drawLine(labelColor, Offset(cx, 0f), Offset(cx, h), strokeWidth = 2f)
            }
        }

        // Y-range labels + the inspected value readout beneath the plot.
        Text(
            "${formatValue(maxY - pad)} – ${formatValue(minY + pad)} $unitLabel",
            fontSize = 11.sp,
            color = labelColor,
            modifier = Modifier.padding(top = 4.dp),
        )
        inspectX?.let { ix ->
            // Map the touch x back to a timestamp and find each series' nearest point.
            val readouts = series.mapNotNull { s ->
                val nearest = s.points.filter { it.value != null }.minByOrNull {
                    abs(it.epochMillis.toDouble() - approximateTimeAt(ix, plotWidthPx, minX, maxX))
                } ?: return@mapNotNull null
                "${s.label}: ${formatValue(nearest.value!!)} $unitLabel — " +
                    Instant.ofEpochMilli(nearest.epochMillis).atZone(ZoneId.systemDefault()).format(TOOLTIP_TIME_FORMAT)
            }
            readouts.forEach { Text(it, fontSize = 12.sp, color = labelColor) }
        }
    }
}

private fun approximateTimeAt(touchX: Float, plotWidthPx: Float, minX: Long, maxX: Long): Double =
    minX + (touchX / plotWidthPx).coerceIn(0f, 1f) * (maxX - minX).toDouble()
