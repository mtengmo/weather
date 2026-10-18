package com.tengmo.vader.data.repository

import org.junit.Assert.assertEquals
import org.junit.Test

class UnitsFormatTest {
    @Test
    fun negativeValueRoundingToZeroShowsWithoutSign() {
        assertEquals("0", formatValue(-0.3, 0))
        assertEquals("0.0", formatValue(-0.04))
    }

    @Test
    fun negativeValuesThatDoNotRoundToZeroKeepSign() {
        assertEquals("-1", formatValue(-0.6, 0))
        assertEquals("-1.5", formatValue(-1.5))
    }

    @Test
    fun nullShowsEmDash() {
        assertEquals("—", formatValue(null))
    }
}
