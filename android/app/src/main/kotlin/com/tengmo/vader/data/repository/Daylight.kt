package com.tengmo.vader.data.repository

import java.time.Instant
import java.time.ZoneId
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.ceil

/**
 * Day/night for icon selection from the real sunrise/sunset at a location (port of
 * src/services/daylight.ts). Whole-hour rule: the first full hour after the event flips — sunset
 * 16:24 -> night art from 17:00; sunrise 07:30 -> day art from 08:00. Falls back to the fixed
 * 06:00-20:00 local-clock rule when no location is known or on a polar day/night date.
 */
object Daylight {
    const val FALLBACK_NIGHT_START_HOUR = 20
    const val FALLBACK_NIGHT_END_HOUR = 6
    private const val HOUR_MS = 3_600_000L

    private data class Window(val dayStartMs: Long, val nightStartMs: Long)

    /** Location of the place the app is currently showing; widgets pass theirs explicitly. */
    @Volatile
    var location: Pair<Double, Double>? = null

    private val cache = ConcurrentHashMap<String, Any>()
    private val NO_WINDOW = Any()

    private fun ceilToHour(ms: Long): Long = ceil(ms.toDouble() / HOUR_MS).toLong() * HOUR_MS

    private fun window(latitude: Double, longitude: Double, date: java.time.LocalDate): Window? {
        val key = "$latitude,$longitude,$date"
        val cached = cache[key]
        if (cached != null) return cached as? Window
        val (sunrise, sunset) = getSunTimes(latitude, longitude, date)
        val computed = if (sunrise != null && sunset != null) {
            Window(ceilToHour(sunrise.toEpochMilli()), ceilToHour(sunset.toEpochMilli()))
        } else null
        if (cache.size > 2000) cache.clear()
        cache[key] = computed ?: NO_WINDOW
        return computed
    }

    fun isNight(
        epochMs: Long,
        zone: ZoneId,
        at: Pair<Double, Double>? = location,
    ): Boolean {
        val zoned = Instant.ofEpochMilli(epochMs).atZone(zone)
        if (at != null) {
            val w = window(at.first, at.second, zoned.toLocalDate())
            if (w != null) return epochMs < w.dayStartMs || epochMs >= w.nightStartMs
        }
        val hour = zoned.hour
        return hour < FALLBACK_NIGHT_END_HOUR || hour >= FALLBACK_NIGHT_START_HOUR
    }
}
