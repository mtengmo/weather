package com.tengmo.vader.data.model

import kotlinx.serialization.Serializable

// T007 — mirrors web's src/models/types.ts Location/LocationSource/FavoritePlace
// (data-model.md "Location" / "Favorite").

/** Which kind of place a [Location] represents (data-model.md). */
enum class LocationSource {
    CurrentPosition,
    Favorite,
}

/** A place weather is shown for — either the device's current position or a saved favorite. */
@Serializable
data class Location(
    val latitude: Double,
    val longitude: Double,
    val displayName: String,
    val source: LocationSource,
)

/** A saved [Location], persisted on-device (FR-006; max [FAVORITES_LIMIT] per device). */
@Serializable
data class Favorite(
    val id: String,
    val latitude: Double,
    val longitude: Double,
    val displayName: String,
    val addedAt: String, // ISO-8601 timestamp, mirrors web's FavoritePlace.addedAt
) {
    fun toLocation(): Location = Location(latitude, longitude, displayName, LocationSource.Favorite)
}

/** Same limit as web's `FAVORITES_LIMIT` (spec.md FR-006, US3 acceptance scenario 2). */
const val FAVORITES_LIMIT = 10
