package com.tengmo.vader.data.model

import kotlinx.serialization.Serializable

// T008 — mirrors web's WeatherObservation/ObservationSeries/ObservationWindow/ObservationStatus
// (data-model.md "WeatherObservation" / "ObservationSeries").

enum class ObservationWindow {
    Last24Hours,
    Last7Days,
    Last30Days,
}

enum class ObservationStatus {
    Loading,
    Ready,
    Unavailable,
}

enum class DataSource {
    Smhi,
    OpenMeteo,
}

/** One timestamped data point (observed or forecast). See data-model.md for field meanings —
 *  kept 1:1 with web's `WeatherObservation` so values match exactly (FR-005, SC-003). */
@Serializable
data class WeatherObservation(
    val timestamp: String, // ISO-8601
    val temperature: Double? = null, // Celsius
    val precipitation: Double? = null, // millimeters
    val windSpeed: Double? = null, // m/s
    val windDirection: Double? = null, // degrees, wind FROM
    val windGust: Double? = null, // m/s
    val cloudCoverPercent: Int? = null, // 0-100
    val relativeHumidity: Int? = null, // 0-100, feels-like input only
    val chanceOfRain: Int? = null, // 0-100, forecast points only
    val isForecast: Boolean = false,
    val symbolCondition: WeatherCondition? = null,
    val smhiSymbolCode: Int? = null, // SMHI raw 1-27, SMHI-forecast only
)

/** A location's set of observations for a time window (data-model.md "ObservationSeries"). */
@Serializable
data class ObservationSeries(
    val location: Location,
    val window: ObservationWindow,
    val observations: List<WeatherObservation>,
    val status: ObservationStatus,
    val primarySource: DataSource? = null,
    val forecastFromFallbackSource: Boolean = false,
    val forecastIssuedAt: String? = null,
)
