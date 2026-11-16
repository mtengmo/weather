package com.tengmo.vader.data.repository

/**
 * Rain-bar scale per timeline view; port of src/services/rainScale.ts (see it for the rationale).
 * One series: snow is the same precipitation, drawn in the precipitation row.
 *
 * Height is linear against a fixed ceiling, colour is the intensity class anchored to SMHI's
 * classes (light <= 0.5 mm/h, moderate 0.5-4, heavy > 4), and a bar above its ceiling is clipped
 * and gets a cap. The 3-day view uses the average mm/h of the bucket (total / hours).
 */
data class RainBar(
    /** 0..1, linear against the view's ceiling and clipped at 1. */
    val heightFraction: Float,
    /** Strictly above the ceiling: the bar is clipped and a cap is drawn. */
    val overflow: Boolean,
    /** Exactly no rain: draw no bar. */
    val dry: Boolean,
    /** Intensity class 1 (light) .. 4 (very heavy). */
    val level: Int,
)

private class RainScale(val ceiling: Double, val bounds: List<Double>)

private val RAIN_SCALES = mapOf(
    TimelineMode.Hours24 to RainScale(4.0, listOf(0.5, 4.0, 10.0)), // mm per hour
    TimelineMode.Days3 to RainScale(2.0, listOf(0.5, 2.0, 4.0)), // average mm per hour in the bucket
    TimelineMode.Days7 to RainScale(20.0, listOf(1.0, 10.0, 35.0)), // mm per day
)

private const val FALLBACK_BUCKET_HOURS = 4
private const val MM_PER_INCH = 25.4

/** [value] is in the displayed unit (mm or in); converted back to mm first. */
fun rainBar(value: Double, imperial: Boolean, mode: TimelineMode, bucketHours: Int?): RainBar {
    val mm = if (imperial) value * MM_PER_INCH else value
    val scale = RAIN_SCALES.getValue(mode)
    val measure = if (mode == TimelineMode.Days3) mm / (bucketHours?.takeIf { it > 0 } ?: FALLBACK_BUCKET_HOURS) else mm
    val ratio = measure / scale.ceiling
    val level = when {
        measure >= scale.bounds[2] -> 4
        measure >= scale.bounds[1] -> 3
        measure >= scale.bounds[0] -> 2
        else -> 1
    }
    return RainBar(ratio.coerceIn(0.0, 1.0).toFloat(), ratio > 1.0, mm <= 0.0, level)
}
