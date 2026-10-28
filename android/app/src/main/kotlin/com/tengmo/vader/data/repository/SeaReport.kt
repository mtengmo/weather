package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.CoastalArea
import com.tengmo.vader.data.model.SeaForecastView
import com.tengmo.vader.data.model.SeaReportRaw
import com.tengmo.vader.data.model.SeaReportView
import com.tengmo.vader.data.source.GeoGeometry
import com.tengmo.vader.data.source.SmhiSeaReportSource.Companion.MAX_COASTAL_ID
import com.tengmo.vader.data.source.pointInPolygon
import com.tengmo.vader.location.haversineMeters

// Port of the pure half of src/services/seaReport.ts.

const val MAX_AREA_DISTANCE_KM = 150.0

data class PickedArea(val area: CoastalArea, val distanceKm: Double)

private fun minVertexDistanceKm(geometry: GeoGeometry, lat: Double, lon: Double): Double {
    val rings = when (geometry) {
        is GeoGeometry.Polygon -> geometry.rings
        is GeoGeometry.MultiPolygon -> geometry.polygons.flatten()
    }
    var best = Double.POSITIVE_INFINITY
    for (ring in rings) for ((x, y) in ring) best = minOf(best, haversineMeters(lat, lon, y, x) / 1000.0)
    return best
}

/** The coastal area containing the point, else the nearest within [maxKm] (by closest polygon vertex). */
fun pickCoastalArea(areas: List<CoastalArea>, lat: Double, lon: Double, maxKm: Double = MAX_AREA_DISTANCE_KM): PickedArea? {
    val coastal = areas.filter { it.seaDistricts.isNotEmpty() && it.id < MAX_COASTAL_ID }
    coastal.firstOrNull { pointInPolygon(lat, lon, it.geometry) }?.let { return PickedArea(it, 0.0) }
    var best: PickedArea? = null
    for (area in coastal) {
        val d = minVertexDistanceKm(area.geometry, lat, lon)
        if (d <= maxKm && (best == null || d < best.distanceKm)) best = PickedArea(area, d)
    }
    return best
}

fun buildSeaReport(raw: SeaReportRaw, lat: Double, lon: Double, language: String): SeaReportView {
    val picked = pickCoastalArea(raw.areas, lat, lon)
        ?: return SeaReportView(raw.texts.overview, raw.texts.updated, null, emptyList(), null)
    val area = picked.area
    val texts = raw.texts.districts.filter { d -> d.ids.any { it in area.seaDistricts } }.map { it.text }.distinct()
    val fc = if (language == "sv") raw.forecasts.firstOrNull { it.id == area.id } else null
    return SeaReportView(
        overview = raw.texts.overview,
        updated = raw.texts.updated,
        areaName = area.name,
        areaTexts = texts,
        forecast = fc?.takeIf { it.sky != null || it.winds.isNotEmpty() }?.let { SeaForecastView(it.sky, it.winds) },
    )
}
