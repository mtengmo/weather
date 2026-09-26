package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.DailyAggregate
import com.tengmo.vader.data.model.WeatherCondition
import java.time.Instant
import java.time.ZoneId

// Direct port of src/services/weatherCondition.ts — the fixed priority-order rule set that
// derives a single WeatherCondition from a period's values (FR-011: matching the web app's
// exact classification, so the same data shows the same icon in both).

private const val WINDY_THRESHOLD_MS = 8.0
private const val CLOUDY_THRESHOLD_PERCENT = 50
private const val OVERCAST_THRESHOLD_PERCENT = 80
private const val LOW_CONFIDENCE_CHANCE_OF_RAIN_PERCENT = 20
private const val FREEZING_CELSIUS = 0.0
const val PRECIPITATION_HEAVY_THRESHOLD_MM = 2.5
const val NIGHT_START_HOUR = 20
const val NIGHT_END_HOUR = 6

fun isNight(timestamp: String): Boolean {
    val hour = Instant.parse(timestamp).atZone(ZoneId.systemDefault()).hour
    return hour < NIGHT_END_HOUR || hour >= NIGHT_START_HOUR
}

private val SYMBOL_PRECIPITATION_CONDITIONS = setOf(
    WeatherCondition.Thunderstorm, WeatherCondition.Foggy, WeatherCondition.Sleet,
    WeatherCondition.LightRain, WeatherCondition.HeavyRain,
    WeatherCondition.LightSnow, WeatherCondition.HeavySnow,
)

data class WeatherConditionInput(
    val temperature: Double?,
    val precipitation: Double?,
    val windSpeed: Double?,
    val cloudCoverPercent: Int?,
    val timestamp: String? = null,
    val symbolCondition: WeatherCondition? = null,
    val chanceOfRain: Int? = null,
)

/** Priority order: no-data -> symbol-code storm/fog/sleet/rain/snow -> precipitation-amount
 *  snow/rain (skipped when chance-of-rain is low) -> windy -> symbol-code cloudy/clear ->
 *  cloud-cover-percent -> clear (day/night). Returns null when there isn't enough data. */
fun deriveWeatherCondition(input: WeatherConditionInput): WeatherCondition? {
    val (temperature, precipitation, windSpeed, cloudCoverPercent, timestamp, symbolCondition, chanceOfRain) = input

    if (temperature == null && precipitation == null) return null

    if (symbolCondition != null && symbolCondition in SYMBOL_PRECIPITATION_CONDITIONS) return symbolCondition

    if (precipitation != null && precipitation > 0) {
        val heavy = precipitation >= PRECIPITATION_HEAVY_THRESHOLD_MM
        val lowConfidence = !heavy && chanceOfRain != null && chanceOfRain < LOW_CONFIDENCE_CHANCE_OF_RAIN_PERCENT
        if (!lowConfidence) {
            if (temperature != null && temperature <= FREEZING_CELSIUS) {
                return if (heavy) WeatherCondition.HeavySnow else WeatherCondition.LightSnow
            }
            return if (heavy) WeatherCondition.HeavyRain else WeatherCondition.LightRain
        }
    }

    if (windSpeed != null && windSpeed >= WINDY_THRESHOLD_MS) return WeatherCondition.Windy

    if (symbolCondition == WeatherCondition.Cloudy || symbolCondition == WeatherCondition.PartlyCloudy ||
        symbolCondition == WeatherCondition.ClearDay || symbolCondition == WeatherCondition.ClearNight
    ) {
        return symbolCondition
    }

    if (cloudCoverPercent != null) {
        if (cloudCoverPercent >= OVERCAST_THRESHOLD_PERCENT) return WeatherCondition.Cloudy
        if (cloudCoverPercent >= CLOUDY_THRESHOLD_PERCENT) return WeatherCondition.PartlyCloudy
    }

    return if (timestamp != null && isNight(timestamp)) WeatherCondition.ClearNight else WeatherCondition.ClearDay
}

/** A whole rolling-24h bucket's single displayed condition, driven by its daytime hours so an
 *  overnight-only or brief-morning shower doesn't make an otherwise-dry day show as rain
 *  (port of weatherCondition.ts's `deriveDailyCondition`, 066/067/069). */
fun deriveDailyCondition(day: DailyAggregate): WeatherCondition? {
    val hasDaytimeData = day.daytimeAverage != null || day.daytimeTotalPrecipitation != null ||
        day.daytimeWindAverage != null || day.daytimeCloudAverage != null || day.daytimeChanceOfRainMax != null

    val dayRainIsMeaningful = day.daytimeHourCount != null && day.daytimeRainHourCount != null &&
        (
            day.daytimeRainHourCount.toDouble() / day.daytimeHourCount > 0.5 ||
                (day.daytimeMaxHourlyPrecipitation ?: 0.0) >= PRECIPITATION_HEAVY_THRESHOLD_MM
            )
    val daytimePrecipitationForCondition = if (dayRainIsMeaningful) day.daytimeTotalPrecipitation else 0.0

    return deriveWeatherCondition(
        WeatherConditionInput(
            temperature = if (hasDaytimeData) day.daytimeAverage else day.average,
            precipitation = if (hasDaytimeData) daytimePrecipitationForCondition else day.totalPrecipitation,
            windSpeed = if (hasDaytimeData) day.daytimeWindAverage else day.windAverage,
            cloudCoverPercent = (if (hasDaytimeData) day.daytimeCloudAverage else day.cloudAverage)?.toInt(),
            chanceOfRain = if (hasDaytimeData) day.daytimeChanceOfRainMax else day.chanceOfRainMax,
        ),
    )
}
