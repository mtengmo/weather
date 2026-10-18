package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.DailyAggregate
import com.tengmo.vader.data.model.WeatherObservation
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.max

// T020 — direct port of src/services/dailyAggregation.ts's `toDailyAggregates`
// (data-model.md "DailyAggregate"). Bucket 0 = the most recent past 24h ending "now"; a
// *negative* index is a future (forecast) bucket, extended forward only as far as the
// supplied observations actually reach (never fabricated).

private const val BUCKET_MS = 24L * 3600_000

private fun epochMillisOf(observation: WeatherObservation): Long =
    Instant.parse(observation.timestamp).toEpochMilli()

private fun bucketIndexOf(observation: WeatherObservation, now: Long): Int =
    Math.floorDiv(now - epochMillisOf(observation), BUCKET_MS).toInt()

private fun isDaytime(observation: WeatherObservation, zone: ZoneId): Boolean {
    val hour = Instant.parse(observation.timestamp).atZone(zone).hour
    return hour >= NIGHT_END_HOUR && hour < NIGHT_START_HOUR
}

/** The per-bucket aggregation math shared by whole-day and daytime-only subsets. */
private data class BucketAggregate(
    val high: Double?, val low: Double?, val average: Double?,
    val totalPrecipitation: Double?, val windAverage: Double?, val cloudAverage: Double?,
    val windHigh: Double?, val windLow: Double?, val windGustHigh: Double?,
    val feelsLikeAverage: Double?, val chanceOfRainMax: Int?, val windDirection: Double?,
)

private fun mean(values: List<Double>): Double = values.sum() / values.size

private fun aggregateBucket(bucket: List<WeatherObservation>): BucketAggregate {
    val temperatures = bucket.mapNotNull { it.temperature }
    val precipitations = bucket.mapNotNull { it.precipitation }
    val windSpeeds = bucket.mapNotNull { it.windSpeed }
    val cloudCoverages = bucket.mapNotNull { it.cloudCoverPercent?.toDouble() }
    val windGusts = bucket.mapNotNull { it.windGust }
    val windDirections = bucket.mapNotNull { it.windDirection }
    val chancesOfRain = bucket.filter { it.isForecast }.mapNotNull { it.chanceOfRain }
    val feelsLikes = bucket.mapNotNull { deriveFeelsLike(it.temperature, it.windSpeed, it.relativeHumidity?.toDouble()) }

    return BucketAggregate(
        high = temperatures.maxOrNull(),
        low = temperatures.minOrNull(),
        average = temperatures.takeIf { it.isNotEmpty() }?.let(::mean),
        totalPrecipitation = precipitations.takeIf { it.isNotEmpty() }?.sum(),
        windAverage = windSpeeds.takeIf { it.isNotEmpty() }?.let(::mean),
        cloudAverage = cloudCoverages.takeIf { it.isNotEmpty() }?.let(::mean),
        windHigh = windSpeeds.maxOrNull(),
        windLow = windSpeeds.minOrNull(),
        windGustHigh = windGusts.maxOrNull(),
        feelsLikeAverage = feelsLikes.takeIf { it.isNotEmpty() }?.let(::mean),
        chanceOfRainMax = chancesOfRain.maxOrNull(),
        // Last-reading-wins, not a circular mean (018-dashboard-visual-redesign, research.md §5).
        windDirection = windDirections.lastOrNull(),
    )
}

private data class DaytimeFields(
    val daytimeAverage: Double?, val daytimeTotalPrecipitation: Double?, val daytimeWindAverage: Double?,
    val daytimeCloudAverage: Double?, val daytimeChanceOfRainMax: Int?, val daytimeHourCount: Int?,
    val daytimeRainHourCount: Int?, val daytimeMaxHourlyPrecipitation: Double?,
)

private fun daytimeAggregateFields(bucket: List<WeatherObservation>, zone: ZoneId): DaytimeFields {
    val daytimeBucket = bucket.filter { isDaytime(it, zone) }
    val agg = aggregateBucket(daytimeBucket)
    val readings = daytimeBucket.mapNotNull { it.precipitation }
    return DaytimeFields(
        daytimeAverage = agg.average,
        daytimeTotalPrecipitation = agg.totalPrecipitation,
        daytimeWindAverage = agg.windAverage,
        daytimeCloudAverage = agg.cloudAverage,
        daytimeChanceOfRainMax = agg.chanceOfRainMax,
        daytimeHourCount = readings.size.takeIf { it > 0 },
        daytimeRainHourCount = readings.count { it > 0 }.takeIf { readings.isNotEmpty() },
        daytimeMaxHourlyPrecipitation = readings.maxOrNull(),
    )
}

/** Rolling-24h bucket aggregation for the 7/30-day graph and Today card (FR-004, US2). */
fun toDailyAggregates(
    observations: List<WeatherObservation>,
    bucketCount: Int,
    now: Long = System.currentTimeMillis(),
    zone: ZoneId = ZoneId.systemDefault(),
): List<DailyAggregate> {
    val indices = observations.map { bucketIndexOf(it, now) }
    val minIndex = indices.minOrNull() ?: 0
    val forwardBucketCount = if (minIndex < 0) -minIndex else 0

    val bucketsByIndex = mutableMapOf<Int, MutableList<WeatherObservation>>()
    observations.forEachIndexed { i, obs ->
        val index = indices[i]
        if (index >= bucketCount) return@forEachIndexed
        bucketsByIndex.getOrPut(index) { mutableListOf() }.add(obs)
    }

    val aggregates = mutableListOf<DailyAggregate>()
    for (index in (bucketCount - 1) downTo -forwardBucketCount) {
        val bucket = bucketsByIndex[index] ?: emptyList()
        val bucketEndMs = now - index * BUCKET_MS
        val bucketEnd = Instant.ofEpochMilli(bucketEndMs).toString()
        val isForecast = bucketEndMs > now
        val agg = aggregateBucket(bucket)
        aggregates += buildAggregate(bucket, bucketEnd, isForecast, zone)
    }
    return aggregates
}

private fun buildAggregate(
    bucket: List<WeatherObservation>,
    bucketEnd: String,
    isForecast: Boolean,
    zone: ZoneId,
    subDayLabel: String? = null,
    subDayPeriod: String? = null,
    subDayStartHour: Int? = null,
    subDayEndHour: Int? = null,
    withDaytime: Boolean = true,
): DailyAggregate {
    val agg = aggregateBucket(bucket)
    val daytime = if (withDaytime) daytimeAggregateFields(bucket, zone) else null
    return DailyAggregate(
        bucketEnd = bucketEnd,
        isForecast = isForecast,
        high = agg.high, low = agg.low, average = agg.average,
        totalPrecipitation = agg.totalPrecipitation, windAverage = agg.windAverage,
        cloudAverage = agg.cloudAverage, windHigh = agg.windHigh, windLow = agg.windLow,
        windGustHigh = agg.windGustHigh, feelsLikeAverage = agg.feelsLikeAverage,
        chanceOfRainMax = agg.chanceOfRainMax, windDirection = agg.windDirection,
        subDayLabel = subDayLabel, subDayPeriod = subDayPeriod,
        subDayStartHour = subDayStartHour, subDayEndHour = subDayEndHour,
        daytimeAverage = daytime?.daytimeAverage,
        daytimeTotalPrecipitation = daytime?.daytimeTotalPrecipitation,
        daytimeWindAverage = daytime?.daytimeWindAverage,
        daytimeCloudAverage = daytime?.daytimeCloudAverage,
        daytimeChanceOfRainMax = daytime?.daytimeChanceOfRainMax,
        daytimeHourCount = daytime?.daytimeHourCount,
        daytimeRainHourCount = daytime?.daytimeRainHourCount,
        daytimeMaxHourlyPrecipitation = daytime?.daytimeMaxHourlyPrecipitation,
    )
}

/**
 * Calendar-day buckets (local midnight to next local midnight): the `dayCount - 1` days before
 * today, today, then every following day the data reaches (uncapped; callers apply
 * [capForecastReach]). `bucketEnd` is the NEXT local midnight. Today's column mixes observed and
 * forecast readings and is NOT flagged; only days starting at/after `now` are. Days are built from
 * local dates (never +24h) so DST days are 23h/25h long. Port of web `toCalendarDayAggregates`.
 */
fun toCalendarDayAggregates(
    observations: List<WeatherObservation>,
    dayCount: Int,
    now: Long = System.currentTimeMillis(),
    zone: ZoneId = ZoneId.systemDefault(),
): List<DailyAggregate> {
    val today = Instant.ofEpochMilli(now).atZone(zone).toLocalDate()
    fun dayStartAt(offset: Int): Long = today.plusDays(offset.toLong()).atStartOfDay(zone).toInstant().toEpochMilli()

    val times = observations.map { epochMillisOf(it) }
    var lastOffset = 0
    for (t in times) {
        while (t >= dayStartAt(lastOffset + 1)) lastOffset++
    }

    val aggregates = mutableListOf<DailyAggregate>()
    for (offset in -(dayCount - 1)..lastOffset) {
        val startMs = dayStartAt(offset)
        val endMs = dayStartAt(offset + 1)
        val bucket = observations.filterIndexed { i, _ -> times[i] in startMs until endMs }
        aggregates += buildAggregate(bucket, Instant.ofEpochMilli(endMs).toString(), startMs >= now, zone)
    }
    return aggregates
}

private data class SubDayBoundary(val period: String, val label: String, val startHour: Int, val endHour: Int)

private val SUB_DAY_PERIODS = listOf(
    SubDayBoundary("morning", "Morning", 6, 11),
    SubDayBoundary("lunch", "Lunch", 11, 13),
    SubDayBoundary("afternoon", "Afternoon", 13, 17),
    SubDayBoundary("evening", "Evening", 17, 21),
    SubDayBoundary("night", "Night", 21, 30), // 21:00 through 06:00 next day
)

/** Local wall-clock `hour` (may exceed 23, rolling into following days) on `date`, as epoch ms. */
private fun wallClockMillis(date: LocalDate, hour: Int, zone: ZoneId): Long =
    date.plusDays((hour / 24).toLong()).atTime(hour % 24, 0).atZone(zone).toInstant().toEpochMilli()

private fun subDayBucketsForDate(
    date: LocalDate,
    observations: List<WeatherObservation>,
    now: Long,
    isFirstDay: Boolean,
    zone: ZoneId,
): List<DailyAggregate> = SUB_DAY_PERIODS.map { (period, label, startHour, endHour) ->
    // The first rendered day's Morning is widened to local midnight: no earlier day's Night period
    // exists to cover its 00:00-06:00 window.
    val effectiveStartHour = if (isFirstDay && period == "morning") 0 else startHour
    val startMs = wallClockMillis(date, effectiveStartHour, zone)
    val endMs = wallClockMillis(date, endHour, zone)
    val bucket = observations.filter { epochMillisOf(it) in startMs until endMs }
    buildAggregate(
        bucket, Instant.ofEpochMilli(endMs).toString(), endMs > now, zone,
        subDayLabel = label, subDayPeriod = period,
        subDayStartHour = effectiveStartHour, subDayEndHour = endHour,
        withDaytime = false,
    )
}

/**
 * The last `dayCount` days (ending with today) plus up to `dayCount` days forward as far as the
 * observations' forecast reaches, each as the 5 fixed sub-day periods. Port of web `toSubDayBuckets`.
 */
fun toSubDayBuckets(
    observations: List<WeatherObservation>,
    dayCount: Int,
    now: Long = System.currentTimeMillis(),
    zone: ZoneId = ZoneId.systemDefault(),
): List<DailyAggregate> {
    val minIndex = observations.minOfOrNull { bucketIndexOf(it, now) } ?: 0
    val forwardDayCount = minOf(if (minIndex < 0) -minIndex else 0, dayCount)
    val today = Instant.ofEpochMilli(now).atZone(zone).toLocalDate()
    val firstDayOffset = -(dayCount - 1)
    val buckets = mutableListOf<DailyAggregate>()
    for (dayOffset in firstDayOffset..forwardDayCount) {
        buckets += subDayBucketsForDate(today.plusDays(dayOffset.toLong()), observations, now, dayOffset == firstDayOffset, zone)
    }
    return buckets
}

/** Sum of precipitation over the local calendar day containing `reference` (null if no readings). */
fun sumCalendarDayPrecipitation(
    observations: List<WeatherObservation>,
    reference: Long = System.currentTimeMillis(),
    zone: ZoneId = ZoneId.systemDefault(),
): Double? {
    val date = Instant.ofEpochMilli(reference).atZone(zone).toLocalDate()
    val startMs = date.atStartOfDay(zone).toInstant().toEpochMilli()
    val endMs = date.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()
    return observations
        .filter { epochMillisOf(it) in startMs until endMs }
        .mapNotNull { it.precipitation }
        .takeIf { it.isNotEmpty() }
        ?.sum()
}

/** The Today card's forward-looking bucket: first forecast-tagged entry, else the last entry (web 023). */
fun todayAggregateOf(days: List<DailyAggregate>): DailyAggregate? =
    days.firstOrNull { it.isForecast } ?: days.lastOrNull()

/** The "Now" reading: nearest forecast observation, else the latest observation (web 027). */
fun nearestObservationOf(observations: List<WeatherObservation>): WeatherObservation? =
    observations.firstOrNull { it.isForecast } ?: observations.lastOrNull()

/** Keeps history plus at most `maxForecastDays` forecast days. */
fun capForecastReach(days: List<DailyAggregate>, maxForecastDays: Int): List<DailyAggregate> {
    val first = days.indexOfFirst { it.isForecast }
    if (first == -1) return days
    return days.take(first + maxForecastDays)
}

/** Strict `count`-entry window anchored on "today" (first forecast entry), extending forward first. */
fun windowAroundToday(days: List<DailyAggregate>, count: Int): List<DailyAggregate> {
    val first = days.indexOfFirst { it.isForecast }
    val todayIndex = if (first == -1) days.size - 1 else first
    if (todayIndex < 0) return days.takeLast(count)
    val end = minOf(days.size, todayIndex + count)
    val start = maxOf(0, end - count)
    return days.subList(start, end)
}

/** The "rest of today" window shared by the Today card's High / Low / Rain / Wind. */
data class RestOfDayAggregate(
    val high: Double?, val low: Double?, val totalPrecipitation: Double?,
    val windAverage: Double?, val windDirection: Double?, val windGustHigh: Double?,
    val pointCount: Int,
)

/**
 * Observations with timestamp in [start of the current local hour, next local midnight). The end
 * uses local date arithmetic so 23h/25h DST days end correctly. Observed and forecast alike; null
 * per-point values ignored; no padding. Port of web `restOfDayAggregate`.
 */
fun restOfDayAggregate(
    observations: List<WeatherObservation>,
    now: Long = System.currentTimeMillis(),
    zone: ZoneId = ZoneId.systemDefault(),
): RestOfDayAggregate {
    val ref = Instant.ofEpochMilli(now).atZone(zone)
    val startMs = ref.truncatedTo(java.time.temporal.ChronoUnit.HOURS).toInstant().toEpochMilli()
    val endMs = ref.toLocalDate().plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()
    val inWindow = observations
        .filter { epochMillisOf(it) in startMs until endMs }
        .sortedBy { epochMillisOf(it) }
    val temperatures = inWindow.mapNotNull { it.temperature }
    val winds = inWindow.mapNotNull { it.windSpeed }
    val precipitations = inWindow.mapNotNull { it.precipitation }
    return RestOfDayAggregate(
        high = temperatures.maxOrNull(),
        low = temperatures.minOrNull(),
        totalPrecipitation = precipitations.takeIf { it.isNotEmpty() }?.sum(),
        windAverage = winds.takeIf { it.isNotEmpty() }?.let(::mean),
        windDirection = inWindow.mapNotNull { it.windDirection }.lastOrNull(),
        windGustHigh = inWindow.mapNotNull { it.windGust }.maxOrNull(),
        pointCount = inWindow.size,
    )
}
