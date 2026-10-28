package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.DailyAggregate
import com.tengmo.vader.data.model.WeatherCondition
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WeatherConditionLogicTest {
    @Test
    fun isWindy_thresholdAndNull() {
        assertFalse(isWindy(7.99))
        assertTrue(isWindy(8.0))
        assertTrue(isWindy(20.0))
        assertFalse(isWindy(null))
    }

    @Test
    fun dailySky_ignoresWindWhileConditionIsWindy() {
        val day = DailyAggregate(bucketEnd = "2026-10-17T22:00:00Z", average = 10.0, totalPrecipitation = 0.0, windAverage = 9.0, cloudAverage = 90.0)
        assertEquals(WeatherCondition.Windy, deriveDailyCondition(day))
        assertEquals(WeatherCondition.Cloudy, deriveDailySkyCondition(day))
        assertEquals(9.0, dailyWindSpeed(day)!!, 1e-9)
    }

    @Test
    fun dailyWindSpeed_prefersDaytimeWhenPresent() {
        val day = DailyAggregate(bucketEnd = "x", windAverage = 3.0, daytimeWindAverage = 9.0)
        assertEquals(9.0, dailyWindSpeed(day)!!, 1e-9)
        assertEquals(3.0, dailyWindSpeed(DailyAggregate(bucketEnd = "x", windAverage = 3.0))!!, 1e-9)
        assertNull(dailyWindSpeed(DailyAggregate(bucketEnd = "x")))
    }

    @Test
    fun skyCondition_keepsRainWhenWindy() {
        val day = DailyAggregate(bucketEnd = "x", average = 10.0, totalPrecipitation = 1.0, windAverage = 12.0)
        assertEquals(WeatherCondition.LightRain, deriveDailyCondition(day))
        assertEquals(WeatherCondition.LightRain, deriveDailySkyCondition(day))
    }
}
