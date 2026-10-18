package com.tengmo.vader.ui

import com.tengmo.vader.data.model.WeatherCondition
import com.tengmo.vader.ui.overview.conditionStringKey
import com.tengmo.vader.ui.overview.pairUp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TodayCardLogicTest {
    @Test
    fun pairsUpOddAndEven() {
        assertEquals(listOf(listOf(1, 2), listOf(3, 4), listOf(5)), pairUp(listOf(1, 2, 3, 4, 5)))
        assertEquals(emptyList<List<Int>>(), pairUp(emptyList<Int>()))
    }

    @Test
    fun everyConditionHasKey() {
        WeatherCondition.values().forEach { assertTrue(conditionStringKey(it).startsWith("weatherCondition_")) }
        assertEquals("weatherCondition_clearDay", conditionStringKey(WeatherCondition.ClearDay))
    }
}
