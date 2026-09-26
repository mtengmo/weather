package com.tengmo.vader.data.source

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive

// T018 — SMHI's own coverage rule is "nearest active temperature station within 50km"
// (SmhiSource.isCovered, ported from smhiProvider.ts). This file carries the point-in-polygon
// helper ported from src/services/geo.ts, used separately by WeatherRepository to test a
// warning's own GeoJSON area against a location (contracts/weather-data-sources.md).

/** A [lon, lat] point. */
typealias GeoPoint = Pair<Double, Double>

/** Minimal GeoJSON Polygon/MultiPolygon — coordinates as ring lists of [lon, lat] pairs, mirroring
 *  src/services/geo.ts's `GeoPolygon`/`GeoMultiPolygon`. */
sealed class GeoGeometry {
    data class Polygon(val rings: List<List<GeoPoint>>) : GeoGeometry()
    data class MultiPolygon(val polygons: List<List<List<GeoPoint>>>) : GeoGeometry()
}

private fun pointInRing(lon: Double, lat: Double, ring: List<GeoPoint>): Boolean {
    var inside = false
    var j = ring.size - 1
    for (i in ring.indices) {
        val (xi, yi) = ring[i]
        val (xj, yj) = ring[j]
        val intersects = (yi > lat) != (yj > lat) &&
            lon < (xj - xi) * (lat - yi) / (yj - yi) + xi
        if (intersects) inside = !inside
        j = i
    }
    return inside
}

/** Direct port of src/services/geo.ts's `pointInPolygon` — used to match an SMHI warning's own
 *  area geometry against a location (FR-004's warnings requirement). */
fun pointInPolygon(latitude: Double, longitude: Double, geometry: GeoGeometry): Boolean = when (geometry) {
    is GeoGeometry.Polygon -> geometry.rings.any { pointInRing(longitude, latitude, it) }
    is GeoGeometry.MultiPolygon -> geometry.polygons.any { polygon -> polygon.any { pointInRing(longitude, latitude, it) } }
}

private fun JsonElement.toPoint(): GeoPoint {
    val arr = jsonArray
    return arr[0].jsonPrimitive.double to arr[1].jsonPrimitive.double
}

private fun JsonElement.toRing(): List<GeoPoint> = jsonArray.map { it.toPoint() }

/** Parses a raw GeoJSON `{type, coordinates}` pair (SMHI's warning `area.geometry`) into
 *  [GeoGeometry] — mirrors src/services/geo.ts's `GeoGeometry` union. Returns null for any
 *  unrecognized/malformed geometry, so callers can skip that one warning area gracefully. */
fun parseGeoGeometry(type: String, coordinates: JsonElement): GeoGeometry? = runCatching {
    when (type) {
        "Polygon" -> GeoGeometry.Polygon((coordinates as JsonArray).map { it.toRing() })
        "MultiPolygon" -> GeoGeometry.MultiPolygon(
            (coordinates as JsonArray).map { polygon -> (polygon as JsonArray).map { it.toRing() } },
        )
        else -> null
    }
}.getOrNull()
