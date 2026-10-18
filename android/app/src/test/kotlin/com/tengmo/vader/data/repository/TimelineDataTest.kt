package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.WeatherObservation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

/** Ports of web tests/unit/timelineData.test.ts + calendarDayAggregates.test.ts timeline cases,
 *  pinned to Europe/Stockholm so DST days are deterministic. */
class TimelineDataTest {
    private val zone = ZoneId.of("Europe/Stockholm")

    private fun at(y: Int, m: Int, d: Int, h: Int, min: Int = 0): Long =
        LocalDateTime.of(y, m, d, h, min).atZone(zone).toInstant().toEpochMilli()

    private fun obs(
        ms: Long, temp: Double? = 10.0, precip: Double? = 0.0, forecast: Boolean = false,
        wind: Double? = 2.0, chance: Int? = null,
    ) = WeatherObservation(
        timestamp = Instant.ofEpochMilli(ms).toString(),
        temperature = temp, precipitation = precip, windSpeed = wind, cloudCoverPercent = 40,
        isForecast = forecast, chanceOfRain = chance,
    )

    private val hour = 3_600_000L
    private val now = at(2026, 10, 17, 8, 10)

    /** [observed] hourly observed points ending at hour 08:00, then [forecast] forecast hours. */
    private fun hourly(observed: Int, forecast: Int): List<WeatherObservation> {
        val last = at(2026, 10, 17, 8)
        return (observed - 1 downTo 0).map { obs(last - it * hour) } +
            (1..forecast).map { obs(last + it * hour, forecast = true) }
    }

    // --- hourly -----------------------------------------------------------------------------

    @Test
    fun hourly_nowBoundaryIsLastObservedBeforeFirstForecast() {
        val data = buildHourlyTimeline(hourly(3, 2), now, zone)
        assertEquals(5, data.periods.size)
        assertEquals(2, data.nowBoundaryIndex)
        assertEquals(3.0 / 5, data.nowPosition!!, 1e-9)
        assertEquals(listOf(false, false, false, true, true), data.periods.map { it.isForecast })
    }

    @Test
    fun hourly_noForecast_hasNoBoundary_allForecast_isMinusOne() {
        assertNull(buildHourlyTimeline(hourly(3, 0), now, zone).nowBoundaryIndex)
        assertEquals(-1, buildHourlyTimeline(hourly(0, 3), now, zone).nowBoundaryIndex)
    }

    @Test
    fun hourly_extendedControlsForecastReach() {
        val series = hourly(24, 60)
        assertEquals(24 + 24, buildHourlyTimeline(series, now, zone, extended = false).periods.size)
        assertEquals(24 + 48, buildHourlyTimeline(series, now, zone, extended = true).periods.size)
    }

    @Test
    fun hourly_isolatedGapIsInterpolated_runOfTwoIsNot() {
        val base = at(2026, 10, 17, 4)
        val series = listOf(
            obs(base, 10.0), obs(base + hour, null, null, wind = null), obs(base + 2 * hour, 14.0),
            obs(base + 3 * hour, null), obs(base + 4 * hour, null), obs(base + 5 * hour, 20.0),
        )
        val points = buildHourlyTimeline(series, now, zone).temperature.points
        assertEquals(12.0, points[1].value!!, 1e-9)
        assertTrue(points[1].interpolated)
        assertNull(points[3].value)
        assertNull(points[4].value)
    }

    @Test
    fun hourly_chanceOfRainOnlyOnForecastPoints_andNightResolvedByZone() {
        val series = listOf(
            obs(at(2026, 10, 17, 7), precip = 1.0, chance = 80),
            obs(at(2026, 10, 17, 23), precip = 1.0, forecast = true, chance = 80),
            obs(at(2026, 10, 17, 22), precip = 0.0, forecast = true),
        )
        val data = buildHourlyTimeline(series, now, zone)
        assertNull(data.precipitation.points[0].chanceOfRain)
        assertEquals(80, data.precipitation.points[1].chanceOfRain)
        assertFalse(data.periods[0].isNight)
        assertTrue(data.periods[2].isNight)
    }

    @Test
    fun snowRow_nullUnlessSnow() {
        assertNull(buildHourlyTimeline(hourly(3, 2), now, zone).snow)
        val snowy = listOf(obs(at(2026, 1, 5, 8), -3.0, 1.0), obs(at(2026, 1, 5, 9), 5.0, 0.0))
        val data = buildHourlyTimeline(snowy, at(2026, 1, 5, 9, 10), zone)
        assertNotNull(data.snow)
        assertEquals(1.0, data.snow!!.points[0].value!!, 1e-9)
        assertNull(data.snow!!.points[1].value)
    }

    @Test
    fun uvRisk_onlyForObservedPeriods() {
        val series = hourly(2, 1)
        val firstEnd = Instant.parse(series[0].timestamp).toEpochMilli()
        val uv = setOf(Math.floorDiv(firstEnd, hour), Math.floorDiv(Instant.parse(series[2].timestamp).toEpochMilli(), hour))
        val data = buildHourlyTimeline(series, now, zone, uvRiskHours = uv)
        assertTrue(data.periods[0].uvRisk)
        assertFalse(data.periods[2].uvRisk)
    }

    // --- 7 days (calendar days) -------------------------------------------------------------

    private fun dailyObservations(): List<WeatherObservation> =
        (-6..3).flatMap { d ->
            listOf(
                obs(at(2026, 10, 17 + d, 3), 4.0, forecast = d > 0),
                obs(at(2026, 10, 17 + d, 14), 9.0, forecast = d > 0),
            )
        }

    @Test
    fun daily_nowPositionIsInsideTodaysColumn() {
        val data = buildDailyTimeline(dailyObservations(), now, zone)
        val todayIndex = 6
        assertEquals(10, data.periods.size)
        assertEquals(todayIndex, data.nowColumnIndex)
        assertEquals(todayIndex, data.nowBoundaryIndex)
        // 08:10 of a 24h day
        assertEquals((todayIndex + 0.3403) / data.periods.size, data.nowPosition!!, 1e-4)
        assertFalse(data.periods[todayIndex].isForecast)
        assertTrue(data.periods[todayIndex + 1].isForecast)
        assertEquals("Sat 17", data.periods[todayIndex].label)
    }

    @Test
    fun daily_forecastReachCappedAtSevenDays() {
        val obs = (-6..12).map { d -> obs(at(2026, 10, 17, 12) + d * 24 * hour, forecast = d > 0) }
        val data = buildDailyTimeline(obs, now, zone)
        assertEquals(6 + 1 + 7, data.periods.size)
    }

    @Test
    fun daily_dstSpringForward_dayIsTwentyThreeHours() {
        val dstNow = at(2026, 3, 29, 12)
        val data = buildDailyTimeline(listOf(obs(at(2026, 3, 29, 9))), dstNow, zone)
        val today = data.periods[data.nowColumnIndex!!]
        assertEquals(23 * hour, today.endMillis - today.startMillis)
        // midnight (CET) to noon (CEST) is 11 real hours
        assertEquals((data.nowColumnIndex!! + 11.0 / 23) / data.periods.size, data.nowPosition!!, 1e-9)
    }

    @Test
    fun daily_dstFallBack_dayIsTwentyFiveHours() {
        val dstNow = at(2026, 10, 25, 12)
        val data = buildDailyTimeline(listOf(obs(at(2026, 10, 25, 9))), dstNow, zone)
        val today = data.periods[data.nowColumnIndex!!]
        assertEquals(25 * hour, today.endMillis - today.startMillis)
        assertEquals((data.nowColumnIndex!! + 13.0 / 25) / data.periods.size, data.nowPosition!!, 1e-9)
    }

    // --- 3 days (sub-day) -------------------------------------------------------------------

    @Test
    fun threeDay_subLabels_firstMorningIsMidnightTo11_nowInsideContainingColumn() {
        val data = build3DayTimeline(dailyObservations(), now, zone)
        // First day = today - 2; five sub-day columns per day
        assertEquals("Morning", data.periods[0].label)
        assertEquals("00–11", data.periods[0].subLabel)
        assertEquals(
            listOf("06–11", "11–13", "13–17", "17–21", "21–06"),
            data.periods.subList(5, 10).map { it.subLabel },
        )
        assertEquals("morning", data.periods[5].subDayPeriod)
        // 08:10 on day index 2 -> Morning column (index 10)
        assertEquals(10, data.nowColumnIndex)
        val morning = data.periods[10]
        val fraction = (now - morning.startMillis).toDouble() / (morning.endMillis - morning.startMillis)
        assertEquals((10 + fraction) / data.periods.size, data.nowPosition!!, 1e-9)
        // Periods are contiguous.
        for (i in 1 until data.periods.size) assertEquals(data.periods[i - 1].endMillis, data.periods[i].startMillis)
        // Web boundary semantics: the column containing now is the first forecast one.
        assertEquals(data.periods.indexOfFirst { it.isForecast } - 1, data.nowBoundaryIndex)
    }

    @Test
    fun threeDay_dstDays_columnsStayContiguous() {
        for (day in listOf(LocalDateTime.of(2026, 3, 29, 12, 0), LocalDateTime.of(2026, 10, 25, 12, 0))) {
            val ms = day.atZone(zone).toInstant().toEpochMilli()
            val data = build3DayTimeline(listOf(obs(ms - hour)), ms, zone)
            assertEquals(15, data.periods.size)
            for (i in 1 until data.periods.size) assertEquals(data.periods[i - 1].endMillis, data.periods[i].startMillis)
        }
    }

    // --- multi-source averaging -------------------------------------------------------------

    private fun entry(source: String, temp: Double, forecastHours: List<Long>) =
        MultiSourceForecastEntry(source, forecastHours.map { obs(it, temp, forecast = true) }, null)

    @Test
    fun multiSource_averagesForecastPeriodsOnly_andNeedsTwoSources() {
        val series = hourly(2, 2)
        val data = buildHourlyTimeline(series, now, zone)
        val f1 = Instant.parse(series[2].timestamp).toEpochMilli()
        val f2 = Instant.parse(series[3].timestamp).toEpochMilli()

        val merged = mergeMultiSourceIntoTimeline(
            data, listOf(entry("smhi", 10.0, listOf(f1, f2)), entry("met-no", 14.0, listOf(f1))),
        )
        assertFalse(merged.temperature.points[0].combined) // observed untouched
        assertEquals(12.0, merged.temperature.points[2].value!!, 1e-9)
        assertTrue(merged.temperature.points[2].combined)
        assertEquals(2, merged.temperature.points[2].combinedSourceCount)
        assertFalse(merged.temperature.points[3].combined) // only one source covers f2

        val single = mergeMultiSourceIntoTimeline(data, listOf(entry("smhi", 10.0, listOf(f1))))
        assertEquals(data, single)
    }

    // --- trailing-gap backfill (empty current-hour slot) -------------------------------------

    @Test
    fun backfill_trailingNullObservedHourTakesNearestForecastAndIsMarkedForecast() {
        val last = at(2026, 10, 17, 8)
        val series = listOf(
            obs(last - 2 * hour, 9.0),
            obs(last - hour, 9.5),
            obs(last, null, null, wind = null),
            obs(last + hour, 11.0, 0.2, forecast = true),
        )
        val fixed = backfillTrailingObservationGap(series)
        assertEquals(11.0, fixed[2].temperature!!, 1e-9)
        assertTrue(fixed[2].isForecast)
        assertEquals(series[2].timestamp, fixed[2].timestamp)
        assertEquals(9.5, fixed[1].temperature!!, 1e-9)
        assertFalse(fixed[1].isForecast)
        // Without any forecast entry nothing changes.
        assertEquals(series.take(3), backfillTrailingObservationGap(series.take(3)))
        // After the fill the current hour is a forecast column and the boundary moves one earlier.
        assertEquals(1, buildHourlyTimeline(fixed, now, zone).nowBoundaryIndex)
    }

    @Test
    fun backfill_midSeriesGapIsLeftAlone() {
        val last = at(2026, 10, 17, 8)
        val series = listOf(obs(last - hour, null, null), obs(last, 9.0), obs(last + hour, 11.0, forecast = true))
        assertEquals(series, backfillTrailingObservationGap(series))
    }
}
