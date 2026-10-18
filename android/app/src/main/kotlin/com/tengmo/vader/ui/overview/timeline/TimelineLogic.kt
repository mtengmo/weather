package com.tengmo.vader.ui.overview.timeline

import com.tengmo.vader.data.repository.TimelineRowPoint
import com.tengmo.vader.data.repository.formatValue
import java.util.Locale

// Pure helpers for the Overview timeline (no Compose), so they are JVM-unit-testable.

/** A run of consecutive plotted segments sharing one style: points [start]..[end] inclusive. */
internal data class LineRun(val start: Int, val end: Int, val forecast: Boolean)

/**
 * Splits a temperature series into runs to draw: observed solid, forecast dashed. A segment
 * between two present values is "forecast" when its right-hand point is a forecast, so the bridge
 * from the last observed to the first forecast reads as forecast. Gaps (null) break the line.
 */
internal fun splitLineRuns(values: List<Double?>, isForecast: List<Boolean>): List<LineRun> {
    val runs = mutableListOf<LineRun>()
    for (i in 0 until values.size - 1) {
        if (values[i] == null || values[i + 1] == null) continue
        val forecast = isForecast[i + 1]
        val last = runs.lastOrNull()
        if (last != null && last.end == i && last.forecast == forecast) {
            runs[runs.lastIndex] = last.copy(end = i + 1)
        } else {
            runs += LineRun(i, i + 1, forecast)
        }
    }
    return runs
}

/** X offset of the Now marker inside a timeline [totalWidth] wide; null = no marker. */
internal fun nowOffset(position: Double?, totalWidth: Float): Float? =
    position?.takeIf { it in 0.0..1.0 }?.let { (it * totalWidth).toFloat() }

/** Scroll target that centres [nowX] in a viewport, clamped to the scrollable range. */
internal fun centeredScrollTarget(nowX: Float, viewportWidth: Int, maxScroll: Int): Int =
    (nowX - viewportWidth / 2f).toInt().coerceIn(0, maxScroll.coerceAtLeast(0))

/** Which way the Now marker lies relative to the visible horizontal range. */
internal enum class NowDirection { None, Left, Right }

/** [nowX] is Now's x inside the scrolling content; the viewport spans scrollValue..scrollValue+viewportWidth.
 *  None when there is no marker, no measured viewport, or Now is within view. */
internal fun nowDirection(nowX: Float?, scrollValue: Int, viewportWidth: Int): NowDirection = when {
    nowX == null || viewportWidth <= 0 -> NowDirection.None
    nowX < scrollValue -> NowDirection.Left
    nowX > scrollValue + viewportWidth -> NowDirection.Right
    else -> NowDirection.None
}

/** Index of the first forecast column, or -1 when every column is observed. */
internal fun firstForecastIndex(isForecast: List<Boolean>): Int = isForecast.indexOfFirst { it }

internal fun temperatureText(point: TimelineRowPoint): String =
    point.value?.let { "${formatValue(it, 0)}°" } ?: DASH

internal fun rainText(point: TimelineRowPoint, unit: String): String =
    point.value?.let { "${formatValue(it, 1)} $unit" } ?: DASH

internal fun chanceText(point: TimelineRowPoint): String? =
    point.chanceOfRain?.let { "$it%" }

/** "5 (9) m/s" — mean speed with the gust in parentheses when present. */
internal fun windText(point: TimelineRowPoint, unit: String): String {
    val speed = point.value ?: return DASH
    val gust = point.gust?.let { " (${formatValue(it, 0)})" }.orEmpty()
    return "${formatValue(speed, 0)}$gust $unit"
}

/** One complete spoken sentence per column from a translated template with ordered placeholders:
 *  label, condition, temperature, rain, wind. */
internal fun columnDescription(
    template: String,
    label: String,
    condition: String,
    temperature: String,
    rain: String,
    wind: String,
): String = String.format(Locale.ROOT, template, label, condition, temperature, rain, wind)

internal const val DASH = "—"
