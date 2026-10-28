package com.tengmo.vader.data.repository

// Port of src/services/waveLevel.ts.

/** Wave-height severity 1..5 for a height in metres: <0.5 calm, 0.5-1, 1-2, 2-3, >3 (3.0 m is level 4). */
val WAVE_LEVEL_LOWER_BOUNDS_M: List<Double> = listOf(0.0, 0.5, 1.0, 2.0, 3.0)

fun waveHeightLevel(meters: Double): Int = when {
    meters < 0.5 -> 1
    meters < 1.0 -> 2
    meters < 2.0 -> 3
    meters <= 3.0 -> 4
    else -> 5
}

private fun boundText(v: Double): String = if (v % 1.0 == 0.0) v.toInt().toString() else v.toString()

/** Legend entries (all in metres, like web): "< 0.5 m", "0.5–1 m", "1–2 m", "2–3 m", "> 3 m". */
fun waveLegendLabels(): List<String> = WAVE_LEVEL_LOWER_BOUNDS_M.mapIndexed { i, lower ->
    val upper = WAVE_LEVEL_LOWER_BOUNDS_M.getOrNull(i + 1)
    val range = when {
        upper == null -> "> ${boundText(lower)}"
        i == 0 -> "< ${boundText(upper)}"
        else -> "${boundText(lower)}–${boundText(upper)}"
    }
    "$range m"
}
