package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.MarineHour
import com.tengmo.vader.data.model.SeaMetric
import com.tengmo.vader.data.model.SeaObservation
import com.tengmo.vader.data.model.SeaPoint
import com.tengmo.vader.data.model.SeaStation
import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.model.WeatherObservation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

class SeaTimelineDataTest {
    private val hour = 3_600_000L
    private val t0 = 1_800_000_000_000L - 1_800_000_000_000L % hour // an exact hour
    private val station = SeaStation("1", "Stn", 3.0)

    private fun obs(metric: SeaMetric, vararg points: Pair<Long, Double>) =
        SeaObservation(metric, station, points.map { SeaPoint(it.first, it.second) })

    private fun marine(count: Int) =
        (0 until count).map { MarineHour(t0 + it * hour, waveHeight = 1.0, seaLevelCm = it * 1.0) }

    private fun weatherObs(ms: Long, forecast: Boolean) = WeatherObservation(
        timestamp = Instant.ofEpochMilli(ms).toString(), temperature = 5.0, precipitation = 0.0, windSpeed = 4.0,
        cloudCoverPercent = 20, isForecast = forecast,
    )

    private fun hourlyTimeline(count: Int = 6): TimelineData {
        val series = (0 until count).map { weatherObs(t0 + it * hour, forecast = it >= count - 2) }
        return buildHourlyTimeline(series, t0 + 3 * hour, ZoneId.of("UTC"))
    }

    @Test fun observationsWinInsideTheirRangeAndModelFillsOutside() {
        val o = obs(SeaMetric.WaveHeight, t0 + 1 * hour + 10_000 to 5.0, t0 + 3 * hour to 7.0)
        val m = mergeObservedAndModel(mapOf(SeaMetric.WaveHeight to o), marine(6))
        val byTime = m.waveHeight.associateBy { it.time }
        assertFalse(byTime.getValue(t0).observed) // before range
        assertTrue(byTime.getValue(t0 + hour).observed)
        assertEquals(5.0, byTime.getValue(t0 + hour).value, 0.0)
        assertTrue(byTime.getValue(t0 + 2 * hour).observed) // gap 1h <= 2h: nearest reading
        assertFalse(byTime.getValue(t0 + 4 * hour).observed) // after last reading + 30 min
    }

    @Test fun readingsFartherThanTwoHoursAreNotUsed() {
        val o = obs(SeaMetric.WaveHeight, t0 to 5.0, t0 + 6 * hour to 6.0)
        val byTime = mergeObservedAndModel(mapOf(SeaMetric.WaveHeight to o), marine(7)).waveHeight.associateBy { it.time }
        assertFalse(byTime.getValue(t0 + 3 * hour).observed) // 3 h from both readings
        assertTrue(byTime.getValue(t0 + 5 * hour).observed) // 1 h from the last reading
    }

    @Test fun circularMeanWrapsAround() {
        assertEquals(0.0, circularMean(listOf(350.0, 10.0)), 1e-6)
        assertEquals(90.0, circularMean(listOf(80.0, 100.0)), 1e-6)
        assertEquals(355.0, circularMean(listOf(350.0, 0.0)), 1e-6)
    }

    @Test fun hourlyColumnsTakeNearestSampleWithinHalfHour() {
        val tl = hourlyTimeline()
        val samples = listOf(SeaSample(t0 + 1 * hour + 20 * 60_000, 2.0, false), SeaSample(t0 + 2 * hour, 3.0, true))
        val v = aggregateIntoPeriods(samples, tl.periods, AggregateMethod.Max)
        assertNull(v[0].value)
        assertEquals(2.0, v[1].value!!, 0.0)
        assertTrue(v[1].modelled) // past + model only
        assertFalse(v[2].modelled) // observed
        assertNull(v[3].value)
    }

    @Test fun forecastColumnsAreNeverModelled() {
        val tl = hourlyTimeline()
        val samples = (0 until 6).map { SeaSample(t0 + it * hour, 1.0, false) }
        val v = aggregateIntoPeriods(samples, tl.periods, AggregateMethod.Mean)
        assertEquals(listOf(true, true, true, true, false, false), v.map { it.modelled })
    }

    @Test fun wideColumnsAggregateOverTheirSpan() {
        val periods = listOf(0L, 3L, 6L).mapIndexed { i, h ->
            TimelinePeriod(
                key = Instant.ofEpochMilli(t0 + h * hour).toString(), label = "", isForecast = i > 1, condition = null,
                temperature = null, startMillis = 0, endMillis = t0 + h * hour,
            )
        }
        val samples = (1..6).map { SeaSample(t0 + it * hour, it.toDouble(), it == 4) }
        // The first column takes the next column's 3 h span: (t0-3h, t0] has no samples.
        val max = aggregateIntoPeriods(samples, periods, AggregateMethod.Max)
        assertNull(max[0].value)
        assertEquals(3.0, max[1].value!!, 0.0) // (t0, t0+3h]
        assertTrue(max[1].modelled)
        assertEquals(6.0, max[2].value!!, 0.0) // (t0+3h, t0+6h]
        assertFalse(max[2].modelled) // forecast column
        val mean = aggregateIntoPeriods(samples, periods, AggregateMethod.Mean)
        assertEquals(2.0, mean[1].value!!, 1e-9)
        val dirs = samples.mapIndexed { i, s -> s.copy(value = if (i % 2 == 0) 350.0 else 10.0) }
        val circ = aggregateIntoPeriods(dirs, periods, AggregateMethod.Circular)
        assertTrue(circ[1].value!! < 20 || circ[1].value!! > 340)
    }

    @Test fun buildRowsConvertsUnitsAndFlagsAvailability() {
        val tl = hourlyTimeline()
        val hours = (0 until 6).map {
            MarineHour(t0 + it * hour, waveHeight = 2.0, waveDirection = 90.0, wavePeriod = 4.0, seaLevelCm = 25.4)
        }
        val merged = mergeObservedAndModel(emptyMap(), hours)
        val rows = buildSeaRows(tl, merged, UnitSystem.Imperial)
        assertEquals("ft", rows.waves.unitLabel)
        assertEquals(TimelineRowKind.Direction, rows.waves.kind)
        assertEquals(DirectionConvention.From, rows.waves.directionConvention)
        assertEquals(2.0 * 3.28084, rows.waves.points[1].value!!, 1e-9)
        assertEquals(4.0, rows.waves.points[1].period!!, 1e-9)
        assertEquals(1, rows.waves.decimals)
        assertEquals(10.0, rows.waterLevel.points[1].value!!, 1e-9)
        assertTrue(rows.waterLevel.signed)
        assertEquals(0, rows.waterLevel.decimals)
        assertEquals("in", rows.waterLevel.unitLabel)
        assertFalse(rows.current.available)
        assertEquals(DirectionConvention.Toward, rows.current.directionConvention)
        assertFalse(rows.seaTemperature.available)
        assertTrue(rows.waves.available)
    }

    @Test fun summarizeUsesFreshObservationElseNearestModel() {
        val now = t0 + 2 * hour
        val o = obs(SeaMetric.SeaTemperature, t0 to 9.0, t0 + 1 * hour to 9.5)
        val hours = (0 until 6).map {
            MarineHour(
                t0 + it * hour, waveHeight = it.toDouble(), seaTemperature = 11.0, seaLevelCm = 10.0 * it,
                currentSpeed = 0.3, currentDirection = 45.0,
            )
        }
        val merged = mergeObservedAndModel(mapOf(SeaMetric.SeaTemperature to o), hours)
        val weather = (0 until 6).map { weatherObs(t0 + it * hour, it > 2).copy(windGust = 8.0 + it) }
        val s = summarizeSea(merged, weather, now)
        // Last observed hour is t0+1h, within 3 h of now -> observed reading.
        assertTrue(s.seaTemperature!!.observed)
        assertEquals(9.5, s.seaTemperature!!.value, 0.0)
        assertFalse(s.waves!!.observed)
        assertEquals(2.0, s.waves!!.height, 0.0)
        assertEquals(5.0, s.next24h.maxWave!!.value, 0.0)
        assertEquals(13.0, s.next24h.maxGust!!.value, 0.0)
        assertEquals(20.0, s.next24h.waterLevelMin!!, 0.0)
        assertEquals(50.0, s.next24h.waterLevelMax!!, 0.0)
        assertEquals(0.3, s.current!!.speed, 0.0)
        assertEquals(4.0, s.wind!!.speed, 0.0)
        assertNull(s.swell)
    }

    @Test fun summaryEmptyWhenNoData() {
        val s = summarizeSea(MergedSea(), emptyList(), t0)
        assertNull(s.wind)
        assertNull(s.waves)
        assertNull(s.seaTemperature)
        assertNull(s.next24h.maxWave)
        assertNull(s.next24h.waterLevelMin)
    }
}
