package com.tengmo.vader.data.model

import kotlinx.serialization.Serializable

// T009 — mirrors web's DailyAggregate (data-model.md "DailyAggregate"): one rolling-24h bucket
// for the 7/30-day graph and the Today card's high/low/average/precipitation figures.
@Serializable
data class DailyAggregate(
    val bucketEnd: String, // ISO-8601 — end of this rolling 24h bucket
    val high: Double? = null,
    val low: Double? = null,
    val average: Double? = null,
    val totalPrecipitation: Double? = null,
    val windAverage: Double? = null,
    val cloudAverage: Double? = null,
    val windHigh: Double? = null,
    val windLow: Double? = null,
    val isForecast: Boolean = false,
    val windGustHigh: Double? = null,
    val feelsLikeAverage: Double? = null,
    val chanceOfRainMax: Int? = null,
    val subDayLabel: String? = null,
    val windDirection: Double? = null,
    // Daytime-hour-only (6 AM-8 PM local) counterparts, used to derive a whole-day condition/icon
    // not dominated by an overnight blip (mirrors web's 066/067 additions).
    val daytimeAverage: Double? = null,
    val daytimeTotalPrecipitation: Double? = null,
    val daytimeWindAverage: Double? = null,
    val daytimeCloudAverage: Double? = null,
    val daytimeChanceOfRainMax: Int? = null,
    val daytimeHourCount: Int? = null,
    val daytimeRainHourCount: Int? = null,
    val daytimeMaxHourlyPrecipitation: Double? = null,
)
