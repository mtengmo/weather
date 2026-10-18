package com.tengmo.vader.data.local

import com.tengmo.vader.data.source.NetworkModule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class PlaceNameCacheTest {
    @get:Rule val tmp = TemporaryFolder()

    private fun cache(ttl: Long = 1000L, file: File = File(tmp.root, "n/names.json")) = PlaceNameCache(file, NetworkModule.json, ttl)

    @Test fun roundTripsAndRoundsCoordinatesToThreeDecimals() {
        val c = cache()
        c.put(59.8429669, 17.6305465, "sv", "Uppsala", 0)
        assertEquals("Uppsala", c.get(59.84296, 17.63052, "sv", 10))
        assertNull(c.get(59.8439, 17.6305, "sv", 10))
    }

    @Test fun expiresAfterTtl() {
        val c = cache(ttl = 1000)
        c.put(1.0, 2.0, "en", "X", 0)
        assertEquals("X", c.get(1.0, 2.0, "en", 1000))
        assertNull(c.get(1.0, 2.0, "en", 1001))
    }

    @Test fun keysIncludeLanguage() {
        val c = cache()
        c.put(1.0, 2.0, "sv", "Göteborg", 0)
        assertNull(c.get(1.0, 2.0, "en", 1))
        c.put(1.0, 2.0, "en", "Gothenburg", 0)
        assertEquals("Göteborg", c.get(1.0, 2.0, "sv", 1))
        assertEquals("Gothenburg", c.get(1.0, 2.0, "en", 1))
    }

    @Test fun persistsAcrossInstancesAndIgnoresBlankNames() {
        val f = File(tmp.root, "names.json")
        cache(file = f).put(1.0, 2.0, "en", "  ", 0)
        assertNull(cache(file = f).get(1.0, 2.0, "en", 1))
        cache(file = f).put(1.0, 2.0, "en", "Lund", 0)
        assertEquals("Lund", cache(file = f).get(1.0, 2.0, "en", 1))
    }

    @Test fun corruptFileIsTreatedAsEmpty() {
        val f = File(tmp.root, "names.json").also { it.writeText("{not json") }
        assertNull(cache(file = f).get(1.0, 2.0, "en", 1))
    }
}
