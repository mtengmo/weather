package com.tengmo.vader.location

import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.LocationSource
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LocationNameRepairTest {
    private val placeholder = Location(59.8429669, 17.6305465, "Current location", LocationSource.CurrentPosition)
    private var stored: Location? = placeholder
    private var persisted = 0

    private fun repair(name: String?) = LocationNameRepair(
        resolveName = { _, _, _ -> name },
        readStored = { stored },
        persist = { stored = it; persisted++ },
    )

    @Test fun repairsStoredPlaceholderOnce() = runTest {
        val r = repair("Uppsala")
        assertEquals("Uppsala", r.repair(stored!!, "sv")?.displayName)
        assertEquals("Uppsala", stored!!.displayName)
        assertNull(r.repair(stored!!, "sv")) // already good: nothing to do
        assertEquals(1, persisted)
    }

    @Test fun repairsBlankAndLocalisedPlaceholders() = runTest {
        for (n in listOf("", "  ", "Min plats", "My location")) {
            stored = placeholder.copy(displayName = n)
            assertEquals("Uppsala", repair("Uppsala").repair(stored!!, "sv")?.displayName)
        }
    }

    @Test fun failedLookupLeavesStateUntouched() = runTest {
        assertNull(repair(null).repair(placeholder, "en"))
        assertEquals(0, persisted)
    }

    @Test fun goodNameIsNeverOverwritten() = runTest {
        stored = placeholder.copy(displayName = "Stockholm")
        assertNull(repair("Uppsala").repair(stored!!, "en"))
        assertEquals("Stockholm", stored!!.displayName)
        // A name that arrived while the lookup ran is not clobbered either.
        val old = placeholder
        stored = placeholder.copy(displayName = "Knivsta")
        assertNull(repair("Uppsala").repair(old, "en"))
        assertEquals("Knivsta", stored!!.displayName)
    }

    @Test fun favoritesAreNeverRepairedAndSelectionChangeWins() = runTest {
        val fav = placeholder.copy(displayName = "", source = LocationSource.Favorite)
        stored = fav
        assertNull(repair("Uppsala").repair(fav, "en"))
        stored = Location(1.0, 1.0, "Elsewhere", LocationSource.Favorite)
        assertNull(repair("Uppsala").repair(placeholder, "en"))
        assertEquals("Elsewhere", stored!!.displayName)
    }
}

class BackgroundLocationFollowerTest {
    private val stockholm = Location(59.3293, 18.0686, "Stockholm", LocationSource.CurrentPosition)
    private var saved: Location? = null

    private val follower = BackgroundLocationFollower(
        resolveLocation = { lat, lon, _ -> Location(lat, lon, "Uppsala", LocationSource.CurrentPosition) },
        persist = { saved = it },
    )

    private fun fix(lat: Double, lon: Double, age: Long = 60_000, acc: Float? = 1000f) =
        BackgroundLocationFollower.Fix(lat, lon, age, acc)

    @Test fun haversineIsAccurate() {
        // Stockholm - Uppsala is about 64 km.
        val d = haversineMeters(59.3293, 18.0686, 59.8586, 17.6389)
        assertTrue(d in 60_000.0..68_000.0)
        assertEquals(0.0, haversineMeters(1.0, 1.0, 1.0, 1.0), 0.001)
    }

    @Test fun movedBeyondThresholdUpdatesStoredPosition() = runTest {
        val r = follower.follow(stockholm, fix(59.8586, 17.6389), "en")
        assertEquals("Uppsala", r?.displayName)
        assertEquals(r, saved)
    }

    @Test fun smallMoveIsIgnored() = runTest {
        assertNull(follower.follow(stockholm, fix(59.3400, 18.0700), "en")) // ~1.2 km
        assertNull(saved)
    }

    @Test fun staleOrImpreciseFixIsDiscarded() = runTest {
        assertNull(follower.follow(stockholm, fix(59.8586, 17.6389, age = 25L * 3_600_000), "en"))
        assertNull(follower.follow(stockholm, fix(59.8586, 17.6389, acc = 6000f), "en"))
        assertFalse(LocationFollowPolicy.isUsable(-1, 10f))
    }

    @Test fun neverOverridesFavoriteSelection() = runTest {
        val fav = stockholm.copy(source = LocationSource.Favorite)
        assertNull(follower.follow(fav, fix(59.8586, 17.6389), "en"))
        assertNull(follower.follow(null, fix(59.8586, 17.6389), "en"))
        assertNull(follower.follow(stockholm, null, "en"))
        assertNull(saved)
    }
}
