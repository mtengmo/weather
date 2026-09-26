package com.tengmo.vader.data.repository

import kotlin.math.pow

// Direct port of src/services/feelsLike.ts — one shared formula regardless of source provider.
private const val COLD_THRESHOLD_CELSIUS = 10.0
private const val WARM_THRESHOLD_CELSIUS = 27.0
private const val WIND_CHILL_MIN_KMH = 4.8

private fun windChillCelsius(tempC: Double, windSpeedMs: Double): Double {
    val windKmh = windSpeedMs * 3.6
    if (windKmh <= WIND_CHILL_MIN_KMH) return tempC
    val v16 = windKmh.pow(0.16)
    return 13.12 + 0.6215 * tempC - 11.37 * v16 + 0.3965 * tempC * v16
}

private fun heatIndexCelsius(tempC: Double, relativeHumidity: Double): Double {
    val tempF = tempC * 9 / 5 + 32
    val hiF = 0.5 * (tempF + 61.0 + (tempF - 68.0) * 1.2 + relativeHumidity * 0.094)
    return (hiF - 32) * 5 / 9
}

/** Returns null only when [temperature] itself is null (contracts/feels-like.md via research.md). */
fun deriveFeelsLike(temperature: Double?, windSpeed: Double?, relativeHumidity: Double?): Double? {
    if (temperature == null) return null
    if (temperature <= COLD_THRESHOLD_CELSIUS && windSpeed != null) return windChillCelsius(temperature, windSpeed)
    if (temperature >= WARM_THRESHOLD_CELSIUS && relativeHumidity != null) return heatIndexCelsius(temperature, relativeHumidity)
    return temperature
}
