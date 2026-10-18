package com.tengmo.vader.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalConfiguration
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

/**
 * The ONE place that decides how clock times and dates read in the app (clarify pass).
 *
 * Policy: follows the APP language (Settings > Language, applied through AppCompat's
 * application locales), never the device's 12/24-hour switch, and is identical to the web app
 * (`src/services/timeFormat.ts`):
 *  - Swedish: 24-hour clock ("14:05"), hour labels "14:00", month-after-day dates ("14 okt.").
 *  - English: 12-hour clock with AM/PM ("2:05 PM"), hour labels "2 PM", month-first dates ("Oct 14").
 * AM/PM is assembled by hand so every Android/ICU version renders the same characters.
 */
object TimeFormat {
    fun isSwedish(locale: Locale): Boolean = locale.language == "sv"

    /** The two languages the app is translated into: "sv" or "en" (anything else falls back to English). */
    fun language(locale: Locale): String = if (isSwedish(locale)) "sv" else "en"

    private fun pad(n: Int) = n.toString().padStart(2, '0')

    private fun hour12(hour24: Int): Pair<Int, String> =
        (if (hour24 % 12 == 0) 12 else hour24 % 12) to (if (hour24 < 12) "AM" else "PM")

    /** Clock time with minutes: sv "14:05", en "2:05 PM". */
    fun clock(time: ZonedDateTime, locale: Locale): String =
        if (isSwedish(locale)) {
            "${pad(time.hour)}:${pad(time.minute)}"
        } else {
            val (h, suffix) = hour12(time.hour)
            "$h:${pad(time.minute)} $suffix"
        }

    /** Whole-hour label for timelines: sv "14:00", en "2 PM". */
    fun hourLabel(time: ZonedDateTime, locale: Locale): String =
        if (isSwedish(locale)) {
            "${pad(time.hour)}:00"
        } else {
            val (h, suffix) = hour12(time.hour)
            "$h $suffix"
        }

    /** Hour for space-constrained widget cells: sv "14", en "2 PM". */
    fun hourCompact(time: ZonedDateTime, locale: Locale): String =
        if (isSwedish(locale)) pad(time.hour) else hourLabel(time, locale)

    /** Short weekday in the app language, without the trailing dot some locales add: "ons" / "Wed". */
    fun weekdayShort(time: ZonedDateTime, locale: Locale): String =
        DateTimeFormatter.ofPattern("EEE", locale).format(time).trimEnd('.')

    /** Month + day: sv "14 okt.", en "Oct 14". */
    fun monthDay(time: ZonedDateTime, locale: Locale): String =
        DateTimeFormatter.ofPattern(if (isSwedish(locale)) "d MMM" else "MMM d", locale).format(time)

    /** Weekday + clock time: sv "ons 14:05", en "Wed 2:05 PM". */
    fun weekdayClock(time: ZonedDateTime, locale: Locale): String =
        "${weekdayShort(time, locale)} ${clock(time, locale)}"

    /** Weekday + month/day: sv "ons 14 okt.", en "Wed Oct 14". */
    fun weekdayMonthDay(time: ZonedDateTime, locale: Locale): String =
        "${weekdayShort(time, locale)} ${monthDay(time, locale)}"

    /** Month/day + clock time: sv "14 okt. 14:05", en "Oct 14 2:05 PM". */
    fun monthDayClock(time: ZonedDateTime, locale: Locale): String =
        "${monthDay(time, locale)} ${clock(time, locale)}"

    /** Medium date + clock time (warnings): sv "14 okt. 2026 14:05", en "Oct 14, 2026 2:05 PM". */
    fun dateTime(time: ZonedDateTime, locale: Locale): String =
        "${DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(locale).format(time)} ${clock(time, locale)}"
}

/** The app language's locale, observed from the Compose configuration so a language switch recomposes. */
@Composable
fun appLocale(): Locale = LocalConfiguration.current.locales[0]
