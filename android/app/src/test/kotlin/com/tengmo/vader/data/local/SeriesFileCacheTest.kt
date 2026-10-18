package com.tengmo.vader.data.local

import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.LocationSource
import com.tengmo.vader.data.model.ObservationSeries
import com.tengmo.vader.data.model.ObservationStatus
import com.tengmo.vader.data.model.ObservationWindow
import com.tengmo.vader.data.model.WeatherObservation
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.util.Locale

class SeriesFileCacheTest {
    @get:Rule val tmp = TemporaryFolder()

    private val json = Json { ignoreUnknownKeys = true }
    private fun cache(dir: File = File(tmp.root, "series")) = SeriesFileCache(dir, json)

    private fun series(lat: Double, lon: Double, temp: Double = 1.0) = ObservationSeries(
        location = Location(lat, lon, "Place", LocationSource.Favorite),
        window = ObservationWindow.Last7Days,
        observations = listOf(WeatherObservation(timestamp = "2026-01-01T00:00:00Z", temperature = temp)),
        status = ObservationStatus.Ready,
    )

    @Test fun roundTrip() {
        val c = cache()
        val s = series(59.859, 17.639)
        c.save(s, 123L)
        assertEquals(s to 123L, c.load(59.859, 17.639))
    }

    @Test fun missingIsNull() {
        assertNull(cache().load(1.0, 2.0))
    }

    @Test fun corruptIsNull() {
        val c = cache()
        c.save(series(1.0, 2.0), 1L)
        File(tmp.root, "series/${SeriesFileCache.keyFor(1.0, 2.0)}.json").writeText("{not json")
        assertNull(c.load(1.0, 2.0))
    }

    @Test fun overwriteIsAtomicAndLeavesNoTemp() {
        val c = cache()
        c.save(series(1.0, 2.0, temp = 1.0), 1L)
        c.save(series(1.0, 2.0, temp = 9.0), 2L)
        val (s, at) = c.load(1.0, 2.0)!!
        assertEquals(9.0, s.observations[0].temperature!!, 0.0)
        assertEquals(2L, at)
        assertEquals(1, File(tmp.root, "series").listFiles()!!.size)
    }

    @Test fun pruneKeepsOnlyListed() {
        val c = cache()
        c.save(series(1.0, 2.0), 1L)
        c.save(series(3.0, 4.0), 1L)
        c.prune(setOf(SeriesFileCache.keyFor(3.0, 4.0)))
        assertNull(c.load(1.0, 2.0))
        assertNotNull(c.load(3.0, 4.0))
    }

    @Test fun deleteRemoves() {
        val c = cache()
        c.save(series(1.0, 2.0), 1L)
        c.delete(1.0, 2.0)
        assertNull(c.load(1.0, 2.0))
    }

    @Test fun keysUseDotDecimalUnderSwedishLocale() {
        val old = Locale.getDefault()
        try {
            Locale.setDefault(Locale("sv", "SE"))
            val key = SeriesFileCache.keyFor(59.8591, 17.6389)
            assertEquals("series_59.859_17.639", key)
            assertTrue(!key.contains(','))
        } finally {
            Locale.setDefault(old)
        }
    }
}
