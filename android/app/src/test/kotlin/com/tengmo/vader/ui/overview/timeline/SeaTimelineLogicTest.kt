package com.tengmo.vader.ui.overview.timeline

import com.tengmo.vader.data.repository.DirectionConvention
import com.tengmo.vader.data.repository.TimelineRow
import com.tengmo.vader.data.repository.TimelineRowKind
import com.tengmo.vader.data.repository.TimelineRowPoint
import com.tengmo.vader.data.repository.waveLegendLabels
import com.tengmo.vader.ui.sea.parseReportUpdated
import com.tengmo.vader.ui.sea.seaLevelRangeText
import com.tengmo.vader.ui.sea.seaLevelText
import com.tengmo.vader.ui.sea.seaHeightText
import com.tengmo.vader.data.model.UnitSystem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class SeaTimelineLogicTest {
    private fun row(key: String = "waves", unit: String = "m", decimals: Int? = null, signed: Boolean = false, convention: DirectionConvention = DirectionConvention.From) =
        TimelineRow(key, unit, TimelineRowKind.Direction, emptyList(), decimals = decimals, signed = signed, directionConvention = convention)

    private fun point(v: Double?, period: Double? = null) = TimelineRowPoint(isForecast = false, value = v, period = period)

    @Test fun rowValueTextHonoursDecimalsAndSign() {
        assertEquals("1.2 m", rowValueText(row(decimals = 1), point(1.234)))
        assertEquals("+5 cm", rowValueText(row("waterLevel", "cm", 0, true), point(4.6)))
        assertEquals("-3 cm", rowValueText(row("waterLevel", "cm", 0, true), point(-3.2)))
        assertEquals("0 cm", rowValueText(row("waterLevel", "cm", 0, true), point(-0.2)))
        assertEquals("8.1 °C", rowValueText(row("seaTemperature", "°C", 1), point(8.14)))
        assertEquals("12%", rowValueText(row("x", "%", 0), point(12.0)))
        assertEquals("—", rowValueText(row(), point(null)))
    }

    @Test fun defaultDecimalsAreOneExceptTemperature() {
        assertEquals("2.0 m", rowValueText(row(), point(2.0)))
        assertEquals("5 °C", rowValueText(row("temperature", "°C"), point(5.4)))
    }

    @Test fun periodSuffixRoundsSeconds() {
        assertEquals("5 s", periodSuffix(point(1.0, 4.6)))
        assertNull(periodSuffix(point(1.0, null)))
    }

    @Test fun arrowPointsWhereTheFlowGoesToward() {
        assertEquals(270f, arrowRotation(row(), 90.0), 0.001f) // waves from the east travel west
        assertEquals(0f, arrowRotation(row(), 180.0), 0.001f) // from south -> toward north
        assertEquals(90f, arrowRotation(row(convention = DirectionConvention.Toward), 90.0), 0.001f)
    }

    @Test fun waveLegendMatchesWeb() {
        assertEquals(listOf("< 0.5 m", "0.5–1 m", "1–2 m", "2–3 m", "> 3 m"), waveLegendLabels())
    }

    @Test fun seaTextFormatting() {
        assertEquals("1.2 m", seaHeightText(1.2, UnitSystem.Metric))
        assertEquals("3.9 ft", seaHeightText(1.2, UnitSystem.Imperial))
        assertEquals("+12", seaLevelText(12.0, UnitSystem.Metric))
        assertEquals("-4", seaLevelText(-4.0, UnitSystem.Metric))
        assertEquals("-4 … +12 cm", seaLevelRangeText(-4.0, 12.0, UnitSystem.Metric))
        assertEquals("+10", seaLevelText(25.4, UnitSystem.Imperial))
    }

    @Test fun reportUpdatedParsesZuluAndOffsetStamps() {
        assertNotNull(parseReportUpdated("2026-10-28T08:00:00Z"))
        assertNotNull(parseReportUpdated("2026-10-28T09:00:00+01:00"))
        assertNull(parseReportUpdated("yesterday"))
        assertNull(parseReportUpdated(null))
    }
}
