package com.tengmo.vader.data.repository

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RainScaleTest {
    @Test
    fun hourly_linearAgainst4mm_withSmhiClasses() {
        assertEquals(0.25f, rainBar(1.0, false, TimelineMode.Hours24, null).heightFraction, 1e-6f)
        assertEquals(2, rainBar(0.7, false, TimelineMode.Hours24, null).level)
        assertEquals(1, rainBar(0.4, false, TimelineMode.Hours24, null).level)
        val full = rainBar(4.0, false, TimelineMode.Hours24, null)
        assertEquals(1f, full.heightFraction, 1e-6f)
        assertFalse(full.overflow)
        assertEquals(3, full.level)
        assertTrue(rainBar(6.0, false, TimelineMode.Hours24, null).overflow)
        assertEquals(4, rainBar(10.0, false, TimelineMode.Hours24, null).level)
    }

    @Test
    fun threeDay_normalisesByBucketLength() {
        val night = rainBar(9.0, false, TimelineMode.Days3, 9)
        val lunch = rainBar(2.0, false, TimelineMode.Days3, 2)
        assertEquals(0.5f, night.heightFraction, 1e-6f)
        assertEquals(0.5f, lunch.heightFraction, 1e-6f)
        val heavy = rainBar(36.0, false, TimelineMode.Days3, 9)
        assertEquals(4, heavy.level)
        assertTrue(heavy.overflow)
    }

    @Test
    fun daily_linearAgainst20mm_class4From35() {
        assertEquals(0.5f, rainBar(10.0, false, TimelineMode.Days7, null).heightFraction, 1e-6f)
        assertEquals(3, rainBar(25.0, false, TimelineMode.Days7, null).level)
        assertEquals(4, rainBar(35.0, false, TimelineMode.Days7, null).level)
    }

    @Test
    fun dryAndImperial() {
        assertTrue(rainBar(0.0, false, TimelineMode.Hours24, null).dry)
        assertFalse(rainBar(0.1, false, TimelineMode.Hours24, null).dry)
        // 0.1575 in = 4 mm: exactly the 24h ceiling
        assertEquals(1f, rainBar(4.0 / 25.4, true, TimelineMode.Hours24, null).heightFraction, 1e-5f)
    }
}
