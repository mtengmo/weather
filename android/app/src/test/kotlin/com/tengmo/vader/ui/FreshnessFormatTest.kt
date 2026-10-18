package com.tengmo.vader.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.Locale

class FreshnessFormatTest {
    private val zone = ZoneId.of("Europe/Stockholm")
    private fun ms(y: Int, mo: Int, d: Int, h: Int, mi: Int) =
        ZonedDateTime.of(y, mo, d, h, mi, 0, 0, zone).toInstant().toEpochMilli()

    private val sv = Locale("sv", "SE")

    // Policy: the clock follows the APP language (sv = 24h, en = 12h AM/PM), not a device switch.
    private fun fmt(updated: Long?, now: Long, is24h: Boolean) =
        formatFreshness(updated, now, zone, if (is24h) sv else Locale.ENGLISH)

    @Test fun nullIsNoData() {
        assertEquals(FreshnessText.NoData, fmt(null, ms(2026, 10, 18, 12, 0), true))
    }

    @Test fun sameDay24h() {
        val r = fmt(ms(2026, 10, 18, 14, 5), ms(2026, 10, 18, 15, 0), true) as FreshnessText.Updated
        assertEquals("14:05", r.formatted)
        assertTrue(r.isToday)
    }

    @Test fun sameDay12h() {
        val r = fmt(ms(2026, 10, 18, 14, 5), ms(2026, 10, 18, 15, 0), false) as FreshnessText.Updated
        assertEquals("2:05 PM", r.formatted)
    }

    @Test fun earlierDayIncludesDate() {
        val r = fmt(ms(2026, 10, 17, 23, 59), ms(2026, 10, 18, 0, 1), true) as FreshnessText.Updated
        assertEquals("17 okt. 23:59", r.formatted)
        assertFalse(r.isToday)
    }

    @Test fun midnightBoundary() {
        val r = fmt(ms(2026, 10, 18, 0, 0), ms(2026, 10, 18, 23, 59), true) as FreshnessText.Updated
        assertTrue(r.isToday)
        assertEquals("00:00", r.formatted)
    }

    @Test fun earlierDay12h() {
        val r = fmt(ms(2026, 10, 10, 9, 30), ms(2026, 10, 18, 9, 30), false) as FreshnessText.Updated
        assertEquals("Oct 10 9:30 AM", r.formatted)
    }
}
