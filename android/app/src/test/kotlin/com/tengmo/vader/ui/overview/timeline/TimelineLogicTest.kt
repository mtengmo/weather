package com.tengmo.vader.ui.overview.timeline

import com.tengmo.vader.data.repository.TimelineRowPoint
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TimelineLogicTest {
    @Test fun runsSplitObservedFromForecastWithForecastBridge() {
        val runs = splitLineRuns(listOf(1.0, 2.0, 3.0, 4.0), listOf(false, false, true, true))
        assertEquals(listOf(LineRun(0, 1, false), LineRun(1, 3, true)), runs)
    }

    @Test fun gapsBreakTheLine() {
        val runs = splitLineRuns(listOf(1.0, null, 3.0, 4.0), listOf(false, false, false, false))
        assertEquals(listOf(LineRun(2, 3, false)), runs)
    }

    @Test fun nowOffsetScalesAndRejectsOutOfRange() {
        assertEquals(360f, nowOffset(0.5, 720f)!!, 0.001f)
        assertNull(nowOffset(null, 720f))
        assertNull(nowOffset(1.5, 720f))
    }

    @Test fun scrollTargetCentresAndClamps() {
        assertEquals(300, centeredScrollTarget(500f, 400, 1000))
        assertEquals(0, centeredScrollTarget(50f, 400, 1000))
        assertEquals(1000, centeredScrollTarget(5000f, 400, 1000))
    }

    @Test fun firstForecast() {
        assertEquals(2, firstForecastIndex(listOf(false, false, true)))
        assertEquals(-1, firstForecastIndex(listOf(false, false)))
    }

    @Test fun descriptionKeepsPlaceholderOrder() {
        val s = columnDescription("%1\$s, %2\$s, %3\$s, regn %4\$s, vind %5\$s", "14:00", "Mulet", "12°", "0.4 mm", "5 m/s")
        assertEquals("14:00, Mulet, 12°, regn 0.4 mm, vind 5 m/s", s)
    }

    @Test fun cellTexts() {
        val wind = TimelineRowPoint(isForecast = true, value = 5.2, gust = 9.4)
        assertEquals("5 (9) m/s", windText(wind, "m/s"))
        assertEquals("—", windText(TimelineRowPoint(true, null), "m/s"))
        val rain = TimelineRowPoint(true, 0.44, chanceOfRain = 30)
        assertEquals("0.4 mm", rainText(rain, "mm"))
        assertEquals("30%", chanceText(rain))
    }
}
