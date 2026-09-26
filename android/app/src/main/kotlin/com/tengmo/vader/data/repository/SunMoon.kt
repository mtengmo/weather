package com.tengmo.vader.data.repository

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.math.acos
import kotlin.math.asin
import kotlin.math.atan
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.tan

// Direct port of src/services/sunMoon.ts — sunrise/sunset ("Almanac for Computers" algorithm)
// and moon phase (synodic-month approximation), computed locally with no network call.

enum class MoonPhase(val stringKey: String) {
    New("moonPhase_new"),
    WaxingCrescent("moonPhase_waxing_crescent"),
    FirstQuarter("moonPhase_first_quarter"),
    WaxingGibbous("moonPhase_waxing_gibbous"),
    Full("moonPhase_full"),
    WaningGibbous("moonPhase_waning_gibbous"),
    LastQuarter("moonPhase_last_quarter"),
    WaningCrescent("moonPhase_waning_crescent"),
}

private const val DEG = 180.0 / Math.PI
private const val RAD = Math.PI / 180.0
private const val ZENITH_DEGREES = 90.833

private fun mod(a: Double, n: Double) = ((a % n) + n) % n

private fun calcSunUtcHours(date: LocalDate, latitude: Double, longitude: Double, isSunrise: Boolean): Double? {
    val dayOfYear = date.dayOfYear
    val lngHour = longitude / 15
    val t = if (isSunrise) dayOfYear + (6 - lngHour) / 24 else dayOfYear + (18 - lngHour) / 24
    val meanAnomaly = 0.9856 * t - 3.289

    val sunTrueLong = mod(
        meanAnomaly + 1.916 * sin(meanAnomaly * RAD) + 0.02 * sin(2 * meanAnomaly * RAD) + 282.634,
        360.0,
    )

    var rightAscension = mod(DEG * atan(0.91764 * tan(sunTrueLong * RAD)), 360.0)
    val longitudeQuadrant = floor(sunTrueLong / 90) * 90
    val raQuadrant = floor(rightAscension / 90) * 90
    rightAscension = (rightAscension + (longitudeQuadrant - raQuadrant)) / 15

    val sinDeclination = 0.39782 * sin(sunTrueLong * RAD)
    val cosDeclination = cos(asin(sinDeclination))

    val cosHourAngle = (cos(ZENITH_DEGREES * RAD) - sinDeclination * sin(latitude * RAD)) /
        (cosDeclination * cos(latitude * RAD))
    if (cosHourAngle > 1 || cosHourAngle < -1) return null // polar day/night — no sunrise/sunset

    val hourAngle = (if (isSunrise) 360 - DEG * acos(cosHourAngle) else DEG * acos(cosHourAngle)) / 15
    val localMeanTime = hourAngle + rightAscension - 0.06571 * t - 6.622
    return mod(localMeanTime - lngHour, 24.0)
}

private fun utcHoursToInstant(date: LocalDate, utcHours: Double): Instant =
    date.atStartOfDay(ZoneOffset.UTC).toInstant().plusSeconds((utcHours * 3600).roundToInt().toLong())

/** Sunrise/sunset instants for [date] at the location; either is null on polar day/night. */
fun getSunTimes(latitude: Double, longitude: Double, date: LocalDate): Pair<Instant?, Instant?> {
    val sunrise = calcSunUtcHours(date, latitude, longitude, true)?.let { utcHoursToInstant(date, it) }
    val sunset = calcSunUtcHours(date, latitude, longitude, false)?.let { utcHoursToInstant(date, it) }
    return sunrise to sunset
}

private const val SYNODIC_MONTH_DAYS = 29.53059
private val KNOWN_NEW_MOON_UTC_MS =
    java.time.ZonedDateTime.of(2000, 1, 6, 18, 14, 0, 0, ZoneOffset.UTC).toInstant().toEpochMilli()

fun getMoonPhase(now: Instant = Instant.now()): MoonPhase {
    val daysSince = (now.toEpochMilli() - KNOWN_NEW_MOON_UTC_MS) / 86_400_000.0
    val age = mod(daysSince, SYNODIC_MONTH_DAYS)
    val phaseIndex = ((age / SYNODIC_MONTH_DAYS) * 8).roundToInt() % 8
    return MoonPhase.entries[phaseIndex]
}
