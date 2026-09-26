package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.WeatherCondition
import com.tengmo.vader.data.model.WeatherObservation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/** T076 — the aggregation, feels-like, and condition-derivation ports must produce the same numbers
 *  as the web app's dailyAggregation.ts / feelsLike.ts / weatherCondition.ts (SC-003). The expected
 *  values are worked out by hand from those TypeScript sources. */
class DailyAggregationTest {
    private val now = Instant.parse("2026-06-15T12:00:00Z").toEpochMilli()
    private val hour = 3_600_000L

    private fun obs(hoursAgo: Long, temp: Double?, precip: Double? = 0.0, forecast: Boolean = false) =
        WeatherObservation(
            timestamp = Instant.ofEpochMilli(now - hoursAgo * hour).toString(),
            temperature = temp, precipitation = precip, windSpeed = 2.0, cloudCoverPercent = 40,
            isForecast = forecast,
        )

    @Test
    fun rollingBuckets_aggregateHighLowAverageAndSum() {
        // Bucket 0 = (now-24h, now]: three readings. Bucket 1 = (now-48h, now-24h]: one reading.
        val observations = listOf(
            obs(30, 5.0, 1.0),
            obs(10, 10.0, 0.5),
            obs(6, 20.0, 0.0),
            obs(1, 12.0, 2.0),
        )
        val days = toDailyAggregates(observations, bucketCount = 2, now = now)

        assertEquals(2, days.size)
        // Oldest first: [bucket 1, bucket 0].
        assertEquals(5.0, days[0].high!!, 1e-9)
        val today = days[1]
        assertEquals(20.0, today.high!!, 1e-9)
        assertEquals(10.0, today.low!!, 1e-9)
        assertEquals((10.0 + 20.0 + 12.0) / 3, today.average!!, 1e-9)
        assertEquals(2.5, today.totalPrecipitation!!, 1e-9)
    }

    @Test
    fun emptyBucket_hasNullFields_neverFabricated() {
        val days = toDailyAggregates(listOf(obs(1, 10.0)), bucketCount = 3, now = now)
        assertEquals(3, days.size)
        assertNull(days[0].high)
        assertNull(days[0].average)
        assertNotNull(days[2].high)
    }

    @Test
    fun forecastBuckets_extendOnlyAsFarAsForecastDataReaches() {
        val observations = listOf(obs(2, 10.0), obs(-30, 8.0, forecast = true))
        val days = toDailyAggregates(observations, bucketCount = 1, now = now)
        // 1 past bucket + forecast buckets reaching the forecast point (~30h ahead => index -2 => 2 forward).
        assertTrue(days.any { it.isForecast })
        assertTrue(days.size >= 2)
    }

    @Test
    fun feelsLike_windChillBelowTenDegrees_heatIndexAboveTwentySeven_elseTemperature() {
        // Cold + windy: colder than the air temperature.
        val chill = deriveFeelsLike(0.0, 10.0, null)!!
        assertTrue(chill < 0.0)
        // Hot + humid: warmer than the air temperature.
        val heat = deriveFeelsLike(30.0, 2.0, 80.0)!!
        assertTrue(heat > 30.0)
        // Mild: unchanged.
        assertEquals(15.0, deriveFeelsLike(15.0, 5.0, 50.0)!!, 1e-9)
        // No temperature: null.
        assertNull(deriveFeelsLike(null, 5.0, 50.0))
    }

    @Test
    fun weatherCondition_followsWebPriorityOrder() {
        fun cond(
            t: Double? = 10.0, p: Double? = 0.0, w: Double? = 1.0, c: Int? = 0,
            symbol: WeatherCondition? = null, chance: Int? = null,
        ) = deriveWeatherCondition(WeatherConditionInput(t, p, w, c, "2026-06-15T12:00:00Z", symbol, chance))

        assertNull(cond(t = null, p = null)) // no data
        assertEquals(WeatherCondition.LightRain, cond(p = 1.0))
        assertEquals(WeatherCondition.HeavyRain, cond(p = 3.0))
        assertEquals(WeatherCondition.LightSnow, cond(t = -2.0, p = 1.0))
        assertEquals(WeatherCondition.HeavySnow, cond(t = -2.0, p = 3.0))
        // Low-confidence guard: a small amount with a 10% chance is not shown as rain...
        assertEquals(WeatherCondition.ClearDay, cond(p = 0.2, chance = 10))
        // ...but a heavy amount is trusted regardless of the stated chance.
        assertEquals(WeatherCondition.HeavyRain, cond(p = 3.0, chance = 10))
        assertEquals(WeatherCondition.Windy, cond(w = 9.0))
        assertEquals(WeatherCondition.PartlyCloudy, cond(c = 60))
        assertEquals(WeatherCondition.Cloudy, cond(c = 90))
        // A symbol-code precipitation condition wins over amounts.
        assertEquals(WeatherCondition.Thunderstorm, cond(symbol = WeatherCondition.Thunderstorm))
    }

    @Test
    fun convertersAndFormatting_matchWebApp() {
        assertEquals(32.0, convertTemperature(0.0, com.tengmo.vader.data.model.UnitSystem.Imperial)!!, 1e-9)
        assertEquals(1.0, convertPrecipitation(25.4, com.tengmo.vader.data.model.UnitSystem.Imperial)!!, 1e-9)
        assertEquals("—", formatValue(null))
        assertEquals("NE", directionToCompass(45.0))
        assertEquals("N", directionToCompass(359.0))
    }
}
