package com.tengmo.vader.ui.graph

import com.tengmo.vader.data.model.UserPreferences
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class GraphReloadKeyTest {
    @Test fun sameWhenUnchanged() {
        assertEquals(graphReloadKey(UserPreferences()), graphReloadKey(UserPreferences()))
    }

    @Test fun differsWhenNearbyCountChanges() {
        assertNotEquals(
            graphReloadKey(UserPreferences()),
            graphReloadKey(UserPreferences().copy(nearbyStationCount = 3)),
        )
    }
}
