package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.WeatherObservation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

/** Port of the web restOfDayAggregate tests (tests/unit/dailyAggregation.test.ts). */
class RestOfDayAggregateTest {
    private val sthlm = ZoneId.of("Europe/Stockholm")

    private fun at(zone: ZoneId, y: Int, m: Int, d: Int, h: Int, min: Int = 0): Long =
        LocalDateTime.of(y, m, d, h, min).atZone(zone).toInstant().toEpochMilli()

    private fun obs(
        ms: Long, temp: Double? = 10.0, precip: Double? = null, wind: Double? = null,
        dir: Double? = null, gust: Double? = null, forecast: Boolean = true,
    ) = WeatherObservation(
        timestamp = Instant.ofEpochMilli(ms).toString(), temperature = temp, precipitation = precip,
        windSpeed = wind, windDirection = dir, windGust = gust, isForecast = forecast,
    )

    @Test
    fun boundaries_startOfCurrentHourIncluded_midnightExcluded() {
        val now = at(sthlm, 2026, 10, 17, 14, 35)
        val r = restOfDayAggregate(
            listOf(
                obs(at(sthlm, 2026, 10, 17, 13, 59), 99.0),
                obs(at(sthlm, 2026, 10, 17, 14), 5.0, 1.0, 2.0, 90.0, 4.0),
                obs(at(sthlm, 2026, 10, 17, 23), 9.0, 0.5, 4.0, 180.0, 8.0),
                obs(at(sthlm, 2026, 10, 18, 0), -50.0, 7.0),
            ),
            now, sthlm,
        )
        assertEquals(2, r.pointCount)
        assertEquals(9.0, r.high!!, 1e-9)
        assertEquals(5.0, r.low!!, 1e-9)
        assertEquals(1.5, r.totalPrecipitation!!, 1e-9)
        assertEquals(3.0, r.windAverage!!, 1e-9)
        assertEquals(180.0, r.windDirection!!, 1e-9)
        assertEquals(8.0, r.windGustHigh!!, 1e-9)
    }

    @Test
    fun at2359_windowEndsAtMidnight_onePointLeft() {
        val now = at(sthlm, 2026, 10, 17, 23, 59)
        val r = restOfDayAggregate(
            listOf(obs(at(sthlm, 2026, 10, 17, 23), 3.0, wind = 6.0), obs(at(sthlm, 2026, 10, 18, 0), 1.0)),
            now, sthlm,
        )
        assertEquals(1, r.pointCount)
        assertEquals(3.0, r.high!!, 1e-9)
        assertEquals(3.0, r.low!!, 1e-9)
        assertEquals(6.0, r.windAverage!!, 1e-9)
    }

    @Test
    fun zeroPoints_allNull_pointCountZero() {
        val r = restOfDayAggregate(emptyList(), at(sthlm, 2026, 10, 17, 12), sthlm)
        assertEquals(0, r.pointCount)
        assertNull(r.high); assertNull(r.low); assertNull(r.totalPrecipitation)
        assertNull(r.windAverage); assertNull(r.windDirection); assertNull(r.windGustHigh)
    }

    @Test
    fun nullValuesPerPoint_ignoredPerField() {
        val now = at(sthlm, 2026, 10, 17, 10)
        val r = restOfDayAggregate(
            listOf(
                obs(at(sthlm, 2026, 10, 17, 11), temp = null, precip = 2.0, wind = 4.0, dir = 45.0),
                obs(at(sthlm, 2026, 10, 17, 12), temp = 7.0, precip = null, wind = null, dir = null),
            ),
            now, sthlm,
        )
        assertEquals(2, r.pointCount)
        assertEquals(7.0, r.high!!, 1e-9)
        assertEquals(7.0, r.low!!, 1e-9)
        assertEquals(2.0, r.totalPrecipitation!!, 1e-9)
        assertEquals(4.0, r.windAverage!!, 1e-9)
        assertEquals(45.0, r.windDirection!!, 1e-9)
        assertNull(r.windGustHigh)
        assertNull(restOfDayAggregate(listOf(obs(at(sthlm, 2026, 10, 17, 11), temp = null)), now, sthlm).high)
    }

    @Test
    fun observedAndForecastAlike_unsortedInput() {
        val now = at(sthlm, 2026, 10, 17, 10)
        val observedOnly = listOf(obs(at(sthlm, 2026, 10, 17, 10), 4.0, forecast = false))
        val forecastOnly = listOf(obs(at(sthlm, 2026, 10, 17, 10), 4.0, forecast = true))
        assertEquals(restOfDayAggregate(observedOnly, now, sthlm), restOfDayAggregate(forecastOnly, now, sthlm))
        val mixed = restOfDayAggregate(
            listOf(
                obs(at(sthlm, 2026, 10, 17, 12), dir = 270.0),
                obs(at(sthlm, 2026, 10, 17, 10), dir = 90.0, forecast = false),
            ),
            now, sthlm,
        )
        assertEquals(270.0, mixed.windDirection!!, 1e-9)
    }

    @Test
    fun dstDays_23hAnd25h() {
        // 2026-03-29 is 23h long: 22:00 and 23:00 local are in; next-day 00:00 is out.
        var now = at(sthlm, 2026, 3, 29, 21, 30)
        var r = restOfDayAggregate(
            (21..23).map { obs(at(sthlm, 2026, 3, 29, it), 1.0) } + obs(at(sthlm, 2026, 3, 30, 0), 1.0), now, sthlm,
        )
        assertEquals(3, r.pointCount)
        // 2026-10-25 is 25h long: from 00:00 local the window holds all 25 hourly points.
        val start = LocalDateTime.of(2026, 10, 25, 0, 0).atZone(sthlm).toInstant().toEpochMilli()
        now = start + 30 * 60_000
        val pts = (0 until 26).map { obs(start + it * 3_600_000L, 1.0) }
        r = restOfDayAggregate(pts, now, sthlm)
        assertEquals(25, r.pointCount)
    }

    @Test
    fun utcZone() {
        val utc = ZoneId.of("UTC")
        val now = at(utc, 2026, 6, 1, 18, 5)
        val r = restOfDayAggregate(
            (17..24).map { h ->
                val t = if (h == 24) at(utc, 2026, 6, 2, 0) else at(utc, 2026, 6, 1, h)
                obs(t, h.toDouble())
            },
            now, utc,
        )
        assertEquals(6, r.pointCount) // 18..23
        assertEquals(18.0, r.low!!, 1e-9)
        assertEquals(23.0, r.high!!, 1e-9)
    }
}
