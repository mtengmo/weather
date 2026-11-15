package com.tengmo.vader.data.repository

import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Test

class DaylightTest {
    private val zone = ZoneId.of("Europe/Stockholm")
    private val stockholm = 59.33 to 18.07

    @After
    fun reset() {
        Daylight.location = null
    }

    private fun ms(y: Int, m: Int, d: Int, h: Int) =
        ZonedDateTime.of(y, m, d, h, 0, 0, 0, zone).toInstant().toEpochMilli()

    @Test
    fun fallsBackToFixedRuleWithoutLocation() {
        assertEquals(true, Daylight.isNight(ms(2026, 6, 21, 5), zone))
        assertEquals(false, Daylight.isNight(ms(2026, 6, 21, 6), zone))
        assertEquals(false, Daylight.isNight(ms(2026, 6, 21, 19), zone))
        assertEquals(true, Daylight.isNight(ms(2026, 6, 21, 20), zone))
    }

    @Test
    fun flipsAtFirstFullHourAfterSunsetAndSunrise() {
        val date = LocalDate.of(2026, 11, 15)
        val (sunrise, sunset) = getSunTimes(stockholm.first, stockholm.second, date)
        val hourMs = 3_600_000L
        val nightStart = Math.ceil(sunset!!.toEpochMilli() / hourMs.toDouble()).toLong() * hourMs
        val dayStart = Math.floorDiv(sunrise!!.toEpochMilli(), hourMs) * hourMs

        assertEquals(false, Daylight.isNight(nightStart - hourMs, zone, stockholm))
        assertEquals(true, Daylight.isNight(nightStart, zone, stockholm))
        assertEquals(true, Daylight.isNight(dayStart - hourMs, zone, stockholm))
        assertEquals(false, Daylight.isNight(dayStart, zone, stockholm))
    }

    @Test
    fun midsummerEveningIsStillDayAndDecemberEveningIsNight() {
        assertEquals(false, Daylight.isNight(ms(2026, 6, 21, 20), zone, stockholm))
        assertEquals(true, Daylight.isNight(ms(2026, 12, 15, 18), zone, stockholm))
    }

    @Test
    fun polarDateFallsBackToFixedRule() {
        val svalbard = 78.2 to 15.6
        assertEquals(false, Daylight.isNight(ms(2026, 6, 21, 12), zone, svalbard))
        assertEquals(true, Daylight.isNight(ms(2026, 6, 21, 23), zone, svalbard))
    }
}
