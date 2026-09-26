package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.UnitSystem
import java.util.Locale

// Direct ports of src/services/units.ts and src/services/format.ts's `formatValue` /
// `directionToCompass` (FR-006 units, FR-011 identical display).

fun convertTemperature(celsius: Double?, to: UnitSystem): Double? {
    if (celsius == null) return null
    return if (to == UnitSystem.Imperial) celsius * 9 / 5 + 32 else celsius
}

fun convertPrecipitation(mm: Double?, to: UnitSystem): Double? {
    if (mm == null) return null
    return if (to == UnitSystem.Imperial) mm / 25.4 else mm
}

fun convertWindSpeed(ms: Double?, to: UnitSystem): Double? {
    if (ms == null) return null
    return if (to == UnitSystem.Imperial) ms * 2.23694 else ms
}

fun temperatureUnitLabel(unit: UnitSystem) = if (unit == UnitSystem.Imperial) "°F" else "°C"
fun precipitationUnitLabel(unit: UnitSystem) = if (unit == UnitSystem.Imperial) "in" else "mm"
fun windUnitLabel(unit: UnitSystem) = if (unit == UnitSystem.Imperial) "mph" else "m/s"

/** "—" for a gap, otherwise the value with fixed decimals (locale-independent, like JS toFixed). */
fun formatValue(value: Double?, decimals: Int = 1): String =
    if (value == null) "—" else String.format(Locale.US, "%.${decimals}f", value)

private val COMPASS_POINTS = listOf("N", "NE", "E", "SE", "S", "SW", "W", "NW")

/** 8-point compass abbreviation for a wind direction in degrees. */
fun directionToCompass(degrees: Double): String {
    val index = Math.round(degrees / 45).toInt() % 8
    return COMPASS_POINTS[(index + 8) % 8]
}
