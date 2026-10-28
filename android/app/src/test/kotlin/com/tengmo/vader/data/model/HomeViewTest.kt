package com.tengmo.vader.data.model

import org.junit.Assert.assertEquals
import org.junit.Test

class HomeViewTest {
    @Test fun parsesKnownValues() {
        assertEquals(HomeView.Sea, parseHomeView("sea"))
        assertEquals(HomeView.Overview, parseHomeView("overview"))
    }

    @Test fun unknownOrMissingFallsBackToOverview() {
        assertEquals(HomeView.Overview, parseHomeView(null))
        assertEquals(HomeView.Overview, parseHomeView(""))
        assertEquals(HomeView.Overview, parseHomeView("SEA"))
        assertEquals(HomeView.Overview, parseHomeView("map"))
    }

    @Test fun storedValueRoundTrips() {
        HomeView.entries.forEach { assertEquals(it, parseHomeView(it.storedValue())) }
        assertEquals(HomeView.Overview, UserPreferences().homeView)
    }
}
