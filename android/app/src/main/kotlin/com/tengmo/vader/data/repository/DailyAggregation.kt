package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.DailyAggregate
import com.tengmo.vader.data.model.WeatherObservation
import java.time.Instant
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

private fun isDaytime(observation: WeatherObservation): Boolean {
    val hour = Instant.parse(observation.timestamp).atZone(ZoneId.systemDefault()).hour
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

private fun daytimeAggregateFields(bucket: List<WeatherObservation>): DaytimeFields {
    val daytimeBucket = bucket.filter(::isDaytime)
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
fun toDailyAggregates(observations: List<WeatherObservation>, bucketCount: Int, now: Long = System.currentTimeMillis()): List<DailyAggregate> {
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
        val daytime = daytimeAggregateFields(bucket)

        aggregates += DailyAggregate(
            bucketEnd = bucketEnd,
            isForecast = isForecast,
            high = agg.high, low = agg.low, average = agg.average,
            totalPrecipitation = agg.totalPrecipitation, windAverage = agg.windAverage,
            cloudAverage = agg.cloudAverage, windHigh = agg.windHigh, windLow = agg.windLow,
            windGustHigh = agg.windGustHigh, feelsLikeAverage = agg.feelsLikeAverage,
            chanceOfRainMax = agg.chanceOfRainMax, windDirection = agg.windDirection,
            daytimeAverage = daytime.daytimeAverage,
            daytimeTotalPrecipitation = daytime.daytimeTotalPrecipitation,
            daytimeWindAverage = daytime.daytimeWindAverage,
            daytimeCloudAverage = daytime.daytimeCloudAverage,
            daytimeChanceOfRainMax = daytime.daytimeChanceOfRainMax,
            daytimeHourCount = daytime.daytimeHourCount,
            daytimeRainHourCount = daytime.daytimeRainHourCount,
            daytimeMaxHourlyPrecipitation = daytime.daytimeMaxHourlyPrecipitation,
        )
    }
    return aggregates
}
