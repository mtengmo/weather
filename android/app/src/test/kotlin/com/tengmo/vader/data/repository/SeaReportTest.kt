package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.AreaForecast
import com.tengmo.vader.data.model.CoastalArea
import com.tengmo.vader.data.model.SeaDistrictText
import com.tengmo.vader.data.model.SeaReportRaw
import com.tengmo.vader.data.model.SeaReportTexts
import com.tengmo.vader.data.model.WindText
import com.tengmo.vader.data.source.GeoGeometry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SeaReportTest {
    private fun square(lon0: Double, lat0: Double, size: Double) = GeoGeometry.Polygon(
        listOf(listOf(lon0 to lat0, lon0 + size to lat0, lon0 + size to lat0 + size, lon0 to lat0 + size, lon0 to lat0)),
    )

    private val inner = CoastalArea(1, "Inner", listOf(10), square(17.0, 59.0, 2.0))
    private val north = CoastalArea(2, "North", listOf(20), square(17.0, 64.0, 1.0))
    private val lake = CoastalArea(250, "Lake", listOf(10), square(0.0, 0.0, 1.0))
    private val noDistricts = CoastalArea(3, "None", emptyList(), square(30.0, 30.0, 1.0))

    @Test fun picksContainingArea() {
        val p = pickCoastalArea(listOf(north, inner), 59.5, 18.0)!!
        assertEquals("Inner", p.area.name)
        assertEquals(0.0, p.distanceKm, 0.0)
    }

    @Test fun picksNearestVertexWithinRangeElseNull() {
        // Lat 61.5: Inner's top edge (61.0) is ~55 km away, North's bottom edge (64.0) ~280 km.
        val p = pickCoastalArea(listOf(north, inner), 61.5, 18.0)!!
        assertEquals("Inner", p.area.name)
        assertEquals(true, p.distanceKm > 0 && p.distanceKm <= MAX_AREA_DISTANCE_KM)
        assertNull(pickCoastalArea(listOf(north, inner), 70.0, 18.0))
    }

    @Test fun excludesHighIdsAndAreasWithoutDistricts() {
        assertNull(pickCoastalArea(listOf(lake, noDistricts), 0.5, 0.5))
        assertNull(pickCoastalArea(listOf(lake, noDistricts), 30.5, 30.5))
    }

    private val raw = SeaReportRaw(
        SeaReportTexts(
            "Overview", "2026-10-28T08:00:00Z",
            listOf(SeaDistrictText(listOf(10), "A"), SeaDistrictText(listOf(10, 11), "A"), SeaDistrictText(listOf(20), "B")),
        ),
        listOf(inner),
        listOf(AreaForecast(1, "Inner", "Mulet", listOf(WindText("Idag", "SV 8"))), AreaForecast(2, "x", null, emptyList())),
    )

    @Test fun buildsReportWithDedupedTextsAndSwedishForecast() {
        val v = buildSeaReport(raw, 59.5, 18.0, "sv")
        assertEquals("Inner", v.areaName)
        assertEquals(listOf("A"), v.areaTexts)
        assertEquals("Mulet", v.forecast!!.sky)
    }

    @Test fun noForecastForEnglishAndOverviewOnlyOutsideAreas() {
        assertNull(buildSeaReport(raw, 59.5, 18.0, "en").forecast)
        val far = buildSeaReport(raw, 10.0, 100.0, "sv")
        assertNull(far.areaName)
        assertEquals("Overview", far.overview)
        assertEquals(emptyList<String>(), far.areaTexts)
    }
}
