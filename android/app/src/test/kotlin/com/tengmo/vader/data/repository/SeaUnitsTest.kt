package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.UnitSystem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SeaUnitsTest {
    @Test fun waveHeightConversion() {
        assertEquals(2.0, convertWaveHeight(2.0, UnitSystem.Metric)!!, 1e-9)
        assertEquals(6.56168, convertWaveHeight(2.0, UnitSystem.Imperial)!!, 1e-9)
        assertNull(convertWaveHeight(null, UnitSystem.Imperial))
    }

    @Test fun waterLevelConversion() {
        assertEquals(25.4, convertWaterLevel(25.4, UnitSystem.Metric)!!, 1e-9)
        assertEquals(10.0, convertWaterLevel(25.4, UnitSystem.Imperial)!!, 1e-9)
        assertNull(convertWaterLevel(null, UnitSystem.Metric))
    }

    @Test fun unitLabels() {
        assertEquals("m", lengthUnitLabel(UnitSystem.Metric))
        assertEquals("ft", lengthUnitLabel(UnitSystem.Imperial))
        assertEquals("cm", levelUnitLabel(UnitSystem.Metric))
        assertEquals("in", levelUnitLabel(UnitSystem.Imperial))
    }

    @Test fun waveLevels() {
        assertEquals(1, waveHeightLevel(0.49))
        assertEquals(2, waveHeightLevel(0.5))
        assertEquals(3, waveHeightLevel(1.0))
        assertEquals(4, waveHeightLevel(2.0))
        assertEquals(4, waveHeightLevel(3.0))
        assertEquals(5, waveHeightLevel(3.01))
        assertEquals(listOf(0.0, 0.5, 1.0, 2.0, 3.0), WAVE_LEVEL_LOWER_BOUNDS_M)
    }
}
