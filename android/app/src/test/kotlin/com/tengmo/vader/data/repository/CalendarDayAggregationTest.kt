package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.DailyAggregate
import com.tengmo.vader.data.model.WeatherObservation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

/** Ports of web tests/unit/calendarDayAggregates.test.ts + dailyAggregation.test.ts (calendar-day
 *  and sub-day cases), pinned to Europe/Stockholm so DST days are exercised deterministically. */
class CalendarDayAggregationTest {
    private val zone = ZoneId.of("Europe/Stockholm")

    private fun at(y: Int, m: Int, d: Int, h: Int, min: Int = 0): Long =
        LocalDateTime.of(y, m, d, h, min).atZone(zone).toInstant().toEpochMilli()

    private fun obs(ms: Long, temp: Double = 10.0, precip: Double? = null, forecast: Boolean = false) =
        WeatherObservation(
            timestamp = Instant.ofEpochMilli(ms).toString(),
            temperature = temp, precipitation = precip, windSpeed = 2.0, cloudCoverPercent = 40,
            isForecast = forecast,
        )

    private fun agg(forecast: Boolean) = DailyAggregate(bucketEnd = "x", isForecast = forecast)

    // "Now" is 2026-10-17 08:10 local; today's column spans local midnight 17 Oct to 18 Oct.
    private val now = at(2026, 10, 17, 8, 10)

    @Test
    fun calendarDays_todayIsNotForecast_onlyFutureDaysAre() {
        val observations = listOf(
            obs(at(2026, 10, 16, 12), 11.0),
            obs(at(2026, 10, 17, 7), 4.0),
            obs(at(2026, 10, 17, 12), 8.0, forecast = true),
            obs(at(2026, 10, 18, 12), 9.0, forecast = true),
        )
        val days = toCalendarDayAggregates(observations, 7, now, zone)
        // 6 past + today + tomorrow
        assertEquals(8, days.size)
        assertFalse(days[6].isForecast)
        assertTrue(days[7].isForecast)
        // Today mixes observed (4) and forecast (8).
        assertEquals(8.0, days[6].high!!, 1e-9)
        assertEquals(4.0, days[6].low!!, 1e-9)
        assertEquals(Instant.ofEpochMilli(at(2026, 10, 18, 0)).toString(), days[6].bucketEnd)
        assertNull(days[0].high) // empty days are never fabricated
    }

    @Test
    fun calendarDays_noForecast_endsAtToday() {
        val days = toCalendarDayAggregates(listOf(obs(at(2026, 10, 17, 7))), 7, now, zone)
        assertEquals(7, days.size)
        assertTrue(days.none { it.isForecast })
    }

    @Test
    fun calendarDays_springForwardDay_is23Hours() {
        val nowDst = at(2026, 3, 29, 12)
        val days = toCalendarDayAggregates(emptyList(), 1, nowDst, zone)
        assertEquals(1, days.size)
        val end = Instant.parse(days[0].bucketEnd).toEpochMilli()
        assertEquals(at(2026, 3, 30, 0), end)
        assertEquals(23L * 3_600_000, end - at(2026, 3, 29, 0))
    }

    @Test
    fun calendarDays_fallBackDay_is25Hours_andReadingsAtEdgesLandCorrectly() {
        val nowDst = at(2026, 10, 25, 12)
        val lateReading = obs(at(2026, 10, 26, 0) - 60_000, 7.0) // 23:59 local on the 25h day
        val nextDay = obs(at(2026, 10, 26, 0), 3.0)
        val days = toCalendarDayAggregates(listOf(lateReading, nextDay), 1, nowDst, zone)
        assertEquals(2, days.size)
        val end = Instant.parse(days[0].bucketEnd).toEpochMilli()
        assertEquals(25L * 3_600_000, end - at(2026, 10, 25, 0))
        assertEquals(7.0, days[0].high!!, 1e-9)
        assertEquals(3.0, days[1].high!!, 1e-9)
        assertTrue(days[1].isForecast)
    }

    @Test
    fun subDay_firstDayMorningWidenedToMidnight_otherDaysKeep6To11() {
        val days = toSubDayBuckets(emptyList(), 2, now, zone)
        assertEquals(10, days.size)
        val firstMorning = days[0]
        assertEquals("morning", firstMorning.subDayPeriod)
        assertEquals(0, firstMorning.subDayStartHour)
        assertEquals(11, firstMorning.subDayEndHour)
        assertEquals("Morning", firstMorning.subDayLabel)
        // Second day's Morning is the normal 06-11.
        val secondMorning = days[5]
        assertEquals("morning", secondMorning.subDayPeriod)
        assertEquals(6, secondMorning.subDayStartHour)
        assertEquals(listOf("morning", "lunch", "afternoon", "evening", "night"), days.take(5).map { it.subDayPeriod })
        assertEquals(30, days[4].subDayEndHour)
    }

    @Test
    fun subDay_firstMorningIncludesMidnightToSixReadings_andForecastFlagFollowsEnd() {
        val observations = listOf(obs(at(2026, 10, 16, 3), 2.0), obs(at(2026, 10, 16, 8), 6.0))
        val days = toSubDayBuckets(observations, 2, now, zone)
        // dayCount=2 => first day is yesterday (16 Oct).
        assertEquals(4.0, days[0].average!!, 1e-9)
        assertFalse(days[0].isForecast)
        // Today's Evening (ends 21:00) is still to come at 08:10.
        val todayEvening = days[8]
        assertEquals("evening", todayEvening.subDayPeriod)
        assertTrue(todayEvening.isForecast)
    }

    @Test
    fun subDay_dstDayPeriodsUseWallClockHours() {
        val nowDst = at(2026, 3, 29, 8)
        // First day (offset 0, dayCount 1) is the DST day; Morning widened to 00:00 local.
        val reading = obs(at(2026, 3, 29, 5), 1.0) // 05:00 local (only 4h after midnight in real time)
        val days = toSubDayBuckets(listOf(reading), 1, nowDst, zone)
        assertEquals(1.0, days[0].high!!, 1e-9)
        assertEquals(Instant.ofEpochMilli(at(2026, 3, 29, 11)).toString(), days[0].bucketEnd)
        // Night ends 06:00 next day wall clock.
        assertEquals(Instant.ofEpochMilli(at(2026, 3, 30, 6)).toString(), days[4].bucketEnd)
    }

    @Test
    fun sumCalendarDayPrecipitation_usesLocalMidnightToMidnight_nullWhenNoReadings() {
        val observations = listOf(
            obs(at(2026, 10, 16, 23), precip = 5.0),
            obs(at(2026, 10, 17, 1), precip = 1.0),
            obs(at(2026, 10, 17, 20), precip = 0.5, forecast = true),
            obs(at(2026, 10, 18, 0), precip = 9.0, forecast = true),
        )
        assertEquals(1.5, sumCalendarDayPrecipitation(observations, now, zone)!!, 1e-9)
        assertNull(sumCalendarDayPrecipitation(listOf(obs(at(2026, 10, 17, 1))), now, zone))
    }

    @Test
    fun capForecastReach_keepsHistoryPlusMaxForecastDays() {
        val days = List(3) { agg(false) } + List(10) { agg(true) }
        assertEquals(3 + 7, capForecastReach(days, 7).size)
        val noForecast = List(4) { agg(false) }
        assertEquals(4, capForecastReach(noForecast, 7).size)
    }

    @Test
    fun windowAroundToday_anchorsOnFirstForecastAndExtendsForwardFirst() {
        val days = List(6) { agg(false) } + List(8) { agg(true) }
        val w = windowAroundToday(days, 7)
        assertEquals(7, w.size)
        assertTrue(w.all { it.isForecast })
        // Short forward reach backfills from history.
        val shortForward = List(6) { agg(false) } + List(3) { agg(true) }
        val w2 = windowAroundToday(shortForward, 7)
        assertEquals(7, w2.size)
        assertEquals(4, w2.count { !it.isForecast })
        // No forecast: anchored on the last entry.
        assertEquals(3, windowAroundToday(List(3) { agg(false) }, 7).size)
        assertTrue(windowAroundToday(emptyList(), 7).isEmpty())
    }

    @Test
    fun todayAggregateAndNowReading_areForwardLooking() {
        val past = DailyAggregate(bucketEnd = "past", isForecast = false)
        val future = DailyAggregate(bucketEnd = "future", isForecast = true)
        assertEquals("future", todayAggregateOf(listOf(past, future))!!.bucketEnd)
        assertEquals("past", todayAggregateOf(listOf(past))!!.bucketEnd)
        assertNull(todayAggregateOf(emptyList()))

        val observed = obs(now - 3_600_000, 3.0)
        val forecast = obs(now + 3_600_000, 5.0, forecast = true)
        assertEquals(5.0, nearestObservationOf(listOf(observed, forecast))!!.temperature!!, 1e-9)
        assertEquals(3.0, nearestObservationOf(listOf(observed))!!.temperature!!, 1e-9)
    }
}
