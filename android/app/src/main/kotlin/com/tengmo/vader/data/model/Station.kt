package com.tengmo.vader.data.model

import kotlinx.serialization.Serializable

// T010 — mirrors web's StationInfo/NearbyStationSeries (data-model.md "StationInfo /
// NearbyStationSeries"), used by the Graph view's nearby-station comparison (US2, FR-006).

@Serializable
data class StationInfo(
    val id: String,
    val displayName: String,
    val distanceKm: Double,
    val latitude: Double,
    val longitude: Double,
)

@Serializable
data class NearbyStationSeries(
    val station: StationInfo,
    val series: ObservationSeries,
)
