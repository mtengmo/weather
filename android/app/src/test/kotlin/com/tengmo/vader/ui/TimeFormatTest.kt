package com.tengmo.vader.ui

import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Test

/** The time/date policy (mirrors web src/services/timeFormat.ts): sv = 24h, en = 12h AM/PM. */
class TimeFormatTest {
    private val sv = Locale("sv", "SE")
    private val en = Locale.ENGLISH
    private fun at(h: Int, m: Int = 0) = ZonedDateTime.of(2026, 10, 14, h, m, 0, 0, ZoneId.of("Europe/Stockholm"))

    @Test fun swedishClockIs24Hour() {
        assertEquals("14:05", TimeFormat.clock(at(14, 5), sv))
        assertEquals("00:07", TimeFormat.clock(at(0, 7), sv))
        assertEquals("09:00", TimeFormat.hourLabel(at(9), sv))
        assertEquals("09", TimeFormat.hourCompact(at(9), sv))
    }

    @Test fun englishClockIs12HourWithAmPm() {
        assertEquals("2:05 PM", TimeFormat.clock(at(14, 5), en))
        assertEquals("12:07 AM", TimeFormat.clock(at(0, 7), en))
        assertEquals("12:00 PM", TimeFormat.clock(at(12), en))
        assertEquals("9 AM", TimeFormat.hourLabel(at(9), en))
        assertEquals("12 AM", TimeFormat.hourLabel(at(0), en))
        assertEquals("11 PM", TimeFormat.hourLabel(at(23), en))
    }

    @Test fun unknownLanguagesFallBackToEnglishStyle() {
        assertEquals("2 PM", TimeFormat.hourLabel(at(14), Locale.GERMAN))
        assertEquals("en", TimeFormat.language(Locale.GERMAN))
        assertEquals("sv", TimeFormat.language(sv))
    }

    @Test fun weekdayAndDateNamesFollowTheAppLanguage() {
        assertEquals("Wed", TimeFormat.weekdayShort(at(12), en))
        assertEquals("ons", TimeFormat.weekdayShort(at(12), sv).lowercase())
        assertEquals("Oct 14", TimeFormat.monthDay(at(12), en))
        assertEquals("14 okt.", TimeFormat.monthDay(at(12), sv).lowercase())
        assertEquals("Wed 2:05 PM", TimeFormat.weekdayClock(at(14, 5), en))
        assertEquals("ons 14:05", TimeFormat.weekdayClock(at(14, 5), sv).lowercase())
    }
}
