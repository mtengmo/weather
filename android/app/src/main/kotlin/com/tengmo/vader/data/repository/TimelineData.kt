package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.DailyAggregate
import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.model.WeatherCondition
import com.tengmo.vader.data.model.WeatherObservation
import com.tengmo.vader.ui.TimeFormat
import java.time.Instant
import java.time.ZoneId
import java.util.Locale

// Port of web src/components/timelineData.ts: observed readings and forecast on ONE continuous
// series with a "Now" marker. Pure Kotlin (now / zone are parameters), so it is unit-testable.

/** Overview timeline resolution. */
enum class TimelineMode { Hours24, Days3, Days7 }

enum class TimelineRowKind { Line, Bar, Wind }

/** One column of the shared timeline — every row aligns to this same list. */
data class TimelinePeriod(
    /** ISO end instant of the period (hourly: the hour itself; daily/sub-day: next boundary). */
    val key: String,
    /** Display label: hourly "14:00"/"2 PM", daily "Mon 14", sub-day English name (UI localizes via [subDayPeriod]). */
    val label: String,
    /** Small time range under the label (3-day view only), e.g. "06–11"; first day's Morning is "00–11". */
    val subLabel: String? = null,
    val isForecast: Boolean,
    /** Condition for the icon and the condition word (weatherCondition_* strings); null = no data. */
    val condition: WeatherCondition?,
    /** SMHI raw symbol code (1-27) for hourly forecast periods; lets the icon show finer variants. */
    val smhiSymbolCode: Int? = null,
    /** Raw Celsius value used for the icon's temperature band. */
    val temperature: Double?,
    val uvRisk: Boolean = false,
    /** True for hours 20:00-05:59 local (hourly) — pick moon vs sun for clear conditions. */
    val isNight: Boolean = false,
    val startMillis: Long,
    val endMillis: Long,
    /** "morning"|"lunch"|"afternoon"|"evening"|"night" for 3-day columns, else null. */
    val subDayPeriod: String? = null,
)

/** One column's value for a single metric row. `value == null` renders as a gap. */
data class TimelineRowPoint(
    val isForecast: Boolean,
    val value: Double?,
    val direction: Double? = null, // wind row: degrees wind comes FROM
    val gust: Double? = null, // wind row
    val chanceOfRain: Int? = null, // precipitation row, forecast points only
    val high: Double? = null, // temperature row, daily/sub-day
    val low: Double? = null,
    /** Temperature row, forecast: [value] is a cross-source average. */
    val combined: Boolean = false,
    val combinedSourceCount: Int? = null,
    /** True when [value] was interpolated from its two neighbours. */
    val interpolated: Boolean = false,
)

data class TimelineRow(
    val key: String, // "temperature" | "precipitation" | "wind" | "snow"
    val unitLabel: String,
    val kind: TimelineRowKind,
    val points: List<TimelineRowPoint>, // same length/order as TimelineData.periods
)

data class TimelineData(
    val mode: TimelineMode,
    val periods: List<TimelinePeriod>,
    /** Index of the last observed period before the first forecast; null = no forecast; -1 = all forecast. */
    val nowBoundaryIndex: Int?,
    /** 3d/7d: index of the column containing "now". */
    val nowColumnIndex: Int? = null,
    /** "Now" as a 0..1 fraction of the full timeline width (null = no marker). 3d/7d: inside the
     *  column containing now; 24h: on the observed/forecast boundary. */
    val nowPosition: Double? = null,
    val temperature: TimelineRow,
    val precipitation: TimelineRow,
    val wind: TimelineRow,
    /** Null unless at least one period is snowy — the UI shows the snow row only when non-null. */
    val snow: TimelineRow?,
)

private const val DAILY_BUCKET_COUNT = 7
private const val SUB_DAY_VIEW_DAY_COUNT = 3
private const val HOUR_MS = 3_600_000L

private fun isSnowyCondition(c: WeatherCondition?) = c == WeatherCondition.LightSnow || c == WeatherCondition.HeavySnow

private fun boundaryIndex(flags: List<Boolean>): Int? {
    val idx = flags.indexOf(true)
    return if (idx == -1) null else idx - 1
}

private fun periodHasUvRisk(isForecast: Boolean, startMs: Long, endMs: Long, uvRiskHours: Set<Long>): Boolean {
    if (isForecast || uvRiskHours.isEmpty()) return false
    val first = Math.floorDiv(startMs, HOUR_MS) + 1
    val last = Math.floorDiv(endMs, HOUR_MS)
    for (key in first..last) if (key in uvRiskHours) return true
    return false
}

private data class RowSource(
    val temperature: Double?, val precipitation: Double?, val windSpeed: Double?,
    val windDirection: Double?, val windGust: Double?, val isSnowy: Boolean, val isForecast: Boolean,
    val chanceOfRain: Int? = null, val high: Double? = null, val low: Double? = null,
)

private class Rows(val temperature: TimelineRow, val precipitation: TimelineRow, val wind: TimelineRow, val snow: TimelineRow?)

private fun buildRows(sources: List<RowSource>, unit: UnitSystem, interpolate: Boolean): Rows {
    val temperature = TimelineRow(
        "temperature", temperatureUnitLabel(unit), TimelineRowKind.Line,
        sources.map {
            TimelineRowPoint(
                it.isForecast, convertTemperature(it.temperature, unit),
                high = convertTemperature(it.high, unit), low = convertTemperature(it.low, unit),
            )
        },
    )
    val precipitation = TimelineRow(
        "precipitation", precipitationUnitLabel(unit), TimelineRowKind.Bar,
        sources.map {
            TimelineRowPoint(
                it.isForecast, convertPrecipitation(it.precipitation, unit),
                // A measured reading is not a probability: chance only for forecast points.
                chanceOfRain = if (it.isForecast) it.chanceOfRain else null,
            )
        },
    )
    val wind = TimelineRow(
        "wind", windUnitLabel(unit), TimelineRowKind.Wind,
        sources.map {
            TimelineRowPoint(
                it.isForecast, convertWindSpeed(it.windSpeed, unit),
                direction = it.windDirection, gust = convertWindSpeed(it.windGust, unit),
            )
        },
    )
    val snowPoints = sources.map {
        TimelineRowPoint(it.isForecast, if (it.isSnowy) convertPrecipitation(it.precipitation, unit) else null)
    }
    val snow = TimelineRow("snow", precipitationUnitLabel(unit), TimelineRowKind.Bar, snowPoints)
        .takeIf { snowPoints.any { p -> p.value != null } }

    return if (interpolate) {
        Rows(
            interpolateIsolatedGaps(temperature), interpolateIsolatedGaps(precipitation),
            interpolateIsolatedGaps(wind), snow?.let(::interpolateIsolatedGaps),
        )
    } else {
        Rows(temperature, precipitation, wind, snow)
    }
}

/**
 * Fills a single isolated missing value with the midpoint of its immediate neighbours (marked
 * `interpolated`). Runs of 2+ gaps, and gaps at the start/end of the series, are left untouched.
 */
fun interpolateIsolatedGaps(row: TimelineRow): TimelineRow {
    var points: MutableList<TimelineRowPoint>? = null
    for (i in 1 until row.points.size - 1) {
        val point = row.points[i]
        val before = row.points[i - 1].value
        val after = row.points[i + 1].value
        if (point.value != null || before == null || after == null) continue
        if (points == null) points = row.points.toMutableList()
        points[i] = point.copy(value = (before + after) / 2, interpolated = true)
    }
    return if (points == null) row else row.copy(points = points)
}

private fun nightHour(ms: Long, zone: ZoneId): Boolean {
    val hour = Instant.ofEpochMilli(ms).atZone(zone).hour
    return hour < NIGHT_END_HOUR || hour >= NIGHT_START_HOUR
}

private fun hourlyCondition(obs: WeatherObservation, ms: Long, zone: ZoneId, withChance: Boolean): WeatherCondition? {
    val c = deriveWeatherCondition(
        WeatherConditionInput(
            temperature = obs.temperature, precipitation = obs.precipitation, windSpeed = obs.windSpeed,
            cloudCoverPercent = obs.cloudCoverPercent, timestamp = obs.timestamp,
            chanceOfRain = if (withChance) obs.chanceOfRain else null,
        ),
    )
    // deriveWeatherCondition resolves day/night in the device zone; honour the supplied zone.
    return when (c) {
        WeatherCondition.ClearDay, WeatherCondition.ClearNight ->
            if (nightHour(ms, zone)) WeatherCondition.ClearNight else WeatherCondition.ClearDay
        else -> c
    }
}

/** Everything the weather icon / companion character is picked from for one observation. */
data class ObservationIcon(
    val smhiSymbolCode: Int?,
    val condition: WeatherCondition?,
    val isNight: Boolean,
    val temperature: Double?,
)

/** Single source of icon inputs: the timeline's hourly columns and the Today card both use it,
 *  so the same observation always yields the same icon (condition, night rule by its own timestamp/zone). */
fun observationIcon(obs: WeatherObservation, zone: ZoneId): ObservationIcon {
    val endMs = Instant.parse(obs.timestamp).toEpochMilli()
    return ObservationIcon(
        smhiSymbolCode = obs.smhiSymbolCode,
        condition = hourlyCondition(obs, endMs, zone, withChance = true),
        isNight = nightHour(endMs, zone),
        temperature = obs.temperature,
    )
}

/**
 * The 24-hour view: one column per hourly observation, observed then forecast. [extended] allows
 * up to 48 forecast columns, otherwise at most 24 (a longer cached series never leaks in).
 * Rows get isolated-gap interpolation; `nowPosition` sits on the observed/forecast boundary.
 */
fun buildHourlyTimeline(
    observations: List<WeatherObservation>,
    now: Long,
    zone: ZoneId,
    extended: Boolean = false,
    unit: UnitSystem = UnitSystem.Metric,
    uvRiskHours: Set<Long> = emptySet(),
    locale: Locale = Locale.ENGLISH,
): TimelineData {
    val forecastLimit = if (extended) 48 else 24
    var forecastSeen = 0
    val kept = observations.filter { o -> if (o.isForecast) ++forecastSeen <= forecastLimit else true }

    val periods = kept.map { obs ->
        val endMs = Instant.parse(obs.timestamp).toEpochMilli()
        val icon = observationIcon(obs, zone)
        TimelinePeriod(
            key = obs.timestamp,
            label = TimeFormat.hourLabel(Instant.ofEpochMilli(endMs).atZone(zone), locale),
            isForecast = obs.isForecast,
            condition = icon.condition,
            smhiSymbolCode = icon.smhiSymbolCode,
            temperature = icon.temperature,
            uvRisk = periodHasUvRisk(obs.isForecast, endMs - HOUR_MS, endMs, uvRiskHours),
            isNight = icon.isNight,
            startMillis = endMs - HOUR_MS,
            endMillis = endMs,
        )
    }
    val sources = kept.zip(periods).map { (obs, p) ->
        RowSource(
            obs.temperature, obs.precipitation, obs.windSpeed, obs.windDirection, obs.windGust,
            isSnowy = isSnowyCondition(hourlyCondition(obs, p.endMillis, zone, withChance = false)),
            isForecast = obs.isForecast, chanceOfRain = obs.chanceOfRain,
        )
    }
    val boundary = boundaryIndex(periods.map { it.isForecast })
    val rows = buildRows(sources, unit, interpolate = true)
    return TimelineData(
        mode = TimelineMode.Hours24,
        periods = periods,
        nowBoundaryIndex = boundary,
        nowPosition = if (boundary != null && periods.isNotEmpty()) (boundary + 1).toDouble() / periods.size else null,
        temperature = rows.temperature, precipitation = rows.precipitation, wind = rows.wind, snow = rows.snow,
    )
}

/** "06–11"-style local-hour range of a sub-day bucket (first day's Morning reads "00–11"). */
private fun subDayRangeLabel(day: DailyAggregate): String? {
    val start = day.subDayStartHour ?: return null
    val end = day.subDayEndHour ?: return null
    fun pad(h: Int) = (h % 24).toString().padStart(2, '0')
    return "${pad(start)}–${pad(end)}"
}

private val SUB_DAY_NAMES = mapOf(
    "morning" to "Morning", "lunch" to "Lunch", "afternoon" to "Afternoon", "evening" to "Evening", "night" to "Night",
)

private fun daysToTimeline(
    mode: TimelineMode,
    days: List<DailyAggregate>,
    unit: UnitSystem,
    uvRiskHours: Set<Long>,
    now: Long,
    zone: ZoneId,
    locale: Locale,
): TimelineData {
    val ends = days.map { Instant.parse(it.bucketEnd).toEpochMilli() }
    val starts = days.mapIndexed { i, day ->
        when {
            i > 0 -> ends[i - 1]
            day.subDayStartHour != null -> // first sub-day bucket: wall-clock start on its own date
                Instant.ofEpochMilli(ends[0]).atZone(zone).toLocalDate()
                    .atTime(day.subDayStartHour, 0).atZone(zone).toInstant().toEpochMilli()
            else -> Instant.ofEpochMilli(ends[0]).atZone(zone).minusDays(1).toInstant().toEpochMilli()
        }
    }
    val periods = days.mapIndexed { i, day ->
        val label = day.subDayPeriod?.let { SUB_DAY_NAMES[it] } ?: day.subDayLabel
            ?: Instant.ofEpochMilli(ends[i] - 1).atZone(zone).let { // bucketEnd is the NEXT midnight
                "${TimeFormat.weekdayShort(it, locale)} ${it.dayOfMonth}"
            }
        TimelinePeriod(
            key = day.bucketEnd,
            label = label,
            subLabel = subDayRangeLabel(day),
            isForecast = day.isForecast,
            // Whole-day columns carry no timestamp: a clear day shows the sun, never the moon.
            condition = deriveDailyCondition(day),
            temperature = day.average,
            uvRisk = periodHasUvRisk(day.isForecast, starts[i], ends[i], uvRiskHours),
            startMillis = starts[i],
            endMillis = ends[i],
            subDayPeriod = day.subDayPeriod,
        )
    }
    val sources = days.map { day ->
        RowSource(
            day.average, day.totalPrecipitation, day.windAverage, day.windDirection, day.windGustHigh,
            isSnowy = isSnowyCondition(
                deriveWeatherCondition(WeatherConditionInput(day.average, day.totalPrecipitation, day.windAverage, day.cloudAverage?.toInt())),
            ),
            isForecast = day.isForecast, chanceOfRain = day.chanceOfRainMax, high = day.high, low = day.low,
        )
    }
    // No boundary-column interpolation at daily/sub-day granularity (web).
    val rows = buildRows(sources, unit, interpolate = false)

    // "Now" lives INSIDE the column containing it (the first period ending after now).
    val nowIdx = ends.indexOfFirst { it > now }
    val fraction = if (nowIdx == -1) 0.0 else ((now - starts[nowIdx]).toDouble() / (ends[nowIdx] - starts[nowIdx])).coerceIn(0.0, 1.0)
    val hasNow = nowIdx != -1
    val boundary = if (mode == TimelineMode.Days7 && hasNow) nowIdx else boundaryIndex(periods.map { it.isForecast })
    return TimelineData(
        mode = mode,
        periods = periods,
        nowBoundaryIndex = boundary,
        nowColumnIndex = nowIdx.takeIf { hasNow },
        nowPosition = if (hasNow) (nowIdx + fraction) / days.size else null,
        temperature = rows.temperature, precipitation = rows.precipitation, wind = rows.wind, snow = rows.snow,
    )
}

/**
 * The 7-day view: one calendar-day column per day (6 past days + today + up to 7 forecast days).
 * Today's column mixes observed and forecast readings and counts as the last "observed" one.
 */
fun buildDailyTimeline(
    observations: List<WeatherObservation>,
    now: Long,
    zone: ZoneId,
    unit: UnitSystem = UnitSystem.Metric,
    uvRiskHours: Set<Long> = emptySet(),
    locale: Locale = Locale.ENGLISH,
): TimelineData {
    val days = capForecastReach(toCalendarDayAggregates(observations, DAILY_BUCKET_COUNT, now, zone), DAILY_BUCKET_COUNT)
    return daysToTimeline(TimelineMode.Days7, days, unit, uvRiskHours, now, zone, locale)
}

/** The 3-day view: every day at sub-day resolution (Morning/Lunch/Afternoon/Evening/Night). */
fun build3DayTimeline(
    observations: List<WeatherObservation>,
    now: Long,
    zone: ZoneId,
    unit: UnitSystem = UnitSystem.Metric,
    uvRiskHours: Set<Long> = emptySet(),
    locale: Locale = Locale.ENGLISH,
): TimelineData =
    daysToTimeline(
        TimelineMode.Days3, toSubDayBuckets(observations, SUB_DAY_VIEW_DAY_COUNT, now, zone),
        unit, uvRiskHours, now, zone, locale,
    )

/**
 * Overwrites each forecast period's temperature with the mean of the sources' own per-period
 * averages (flag `combined`), only when 2+ sources have data for that period. A period spans
 * (previous period's end, own end] — as in web `mergeMultiSourceIntoTimelinePoints`.
 */
fun mergeMultiSourceIntoTimeline(
    data: TimelineData,
    multiSourceForecast: List<MultiSourceForecastEntry>,
    unit: UnitSystem = UnitSystem.Metric,
): TimelineData {
    if (multiSourceForecast.size < 2) return data
    val parsed = multiSourceForecast.map { entry ->
        entry.observations.mapNotNull { o -> o.temperature?.let { Instant.parse(o.timestamp).toEpochMilli() to it } }
    }
    val points = data.temperature.points.toMutableList()
    data.periods.forEachIndexed { i, period ->
        if (!period.isForecast || i >= points.size) return@forEachIndexed
        val end = period.endMillis
        val start = if (i > 0) data.periods[i - 1].endMillis else end - 24 * HOUR_MS
        val averages = parsed.mapNotNull { temps ->
            temps.filter { (t, _) -> t > start && t <= end }.map { it.second }.takeIf { it.isNotEmpty() }?.average()
        }
        if (averages.size > 1) {
            points[i] = points[i].copy(
                value = convertTemperature(averages.average(), unit),
                combined = true, combinedSourceCount = averages.size,
            )
        }
    }
    return data.copy(temperature = data.temperature.copy(points = points))
}
