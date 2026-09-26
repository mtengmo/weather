package com.tengmo.vader.data.model

// T012 — mirrors web's Theme/UnitSystem/LanguagePreference/WeatherMetric/NearbyStationCount/
// HighLowVisibility + their defaults (data-model.md "UserPreferences"), FR-006.

enum class Theme { Midnight, Ivory }
val DEFAULT_THEME = Theme.Midnight

enum class UnitSystem { Metric, Imperial }
val DEFAULT_UNIT_SYSTEM = UnitSystem.Metric

enum class LanguagePreference { Auto, En, Sv }
val DEFAULT_LANGUAGE_PREFERENCE = LanguagePreference.Auto

enum class WeatherMetric { Temperature, Rain, Wind, Cloud }
val DEFAULT_METRIC = WeatherMetric.Temperature

/** 0-4 (spec.md FR-006). */
typealias NearbyStationCount = Int
const val DEFAULT_NEARBY_STATION_COUNT: NearbyStationCount = 0
val VALID_NEARBY_STATION_COUNTS = 0..4

typealias HighLowVisibility = Boolean
const val DEFAULT_HIGH_LOW_VISIBLE: HighLowVisibility = false

/** Single record, persisted on-device (FR-006, FR-007). */
data class UserPreferences(
    val theme: Theme = DEFAULT_THEME,
    val unit: UnitSystem = DEFAULT_UNIT_SYSTEM,
    val language: LanguagePreference = DEFAULT_LANGUAGE_PREFERENCE,
    val nearbyStationCount: NearbyStationCount = DEFAULT_NEARBY_STATION_COUNT,
    val highLowVisible: HighLowVisibility = DEFAULT_HIGH_LOW_VISIBLE,
    val lastViewedLocation: Location? = null,
)
