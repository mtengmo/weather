package com.tengmo.vader.data.model

import kotlinx.serialization.Serializable

// T013 — new entities for this feature (data-model.md "Widget" / "WidgetTarget" /
// "CachedWeatherSnapshot"), covering US6/FR-021-030.

enum class WidgetSize { Small, Medium }

enum class WidgetTargetKind { Favorite, MyLocation }

/** Which place a widget instance shows (FR-025). Exactly one of [favoriteId] /
 *  [lastKnownLocation] is meaningful, depending on [kind]. */
data class WidgetTarget(
    val kind: WidgetTargetKind,
    val favoriteId: String? = null, // set when kind == Favorite
    val lastKnownLocation: Location? = null, // set when kind == MyLocation (FR-026, FR-028)
    val backgroundLocationGranted: Boolean = false,
)

/** One configured home-screen widget instance (FR-021/FR-022). */
data class Widget(
    val widgetId: Int, // Android's system-assigned AppWidget instance ID
    val size: WidgetSize,
    val target: WidgetTarget,
    val lastSnapshot: CachedWeatherSnapshot? = null,
)

/** The most recently successfully loaded weather data for a location — used for offline display
 *  (FR-020) and as a widget's last-drawn content while a refresh is pending (FR-029). */
@Serializable
data class CachedWeatherSnapshot(
    val location: Location,
    val loadedAt: String, // ISO-8601 — drives "last updated" / offline indication
    val currentConditionSummary: CurrentConditionSummary,
)

/** Enough fields to redraw the Overview and both widget sizes without a network round-trip. */
@Serializable
data class CurrentConditionSummary(
    val condition: WeatherCondition?,
    val smhiSymbolCode: Int?,
    val temperature: Double?,
    val high: Double?,
    val low: Double?,
    val chanceOfRain: Int?,
    val nextHours: List<WeatherObservation>, // short forward-looking strip for the medium widget
)
