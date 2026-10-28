package com.tengmo.vader.ui.navigation

import com.tengmo.vader.data.model.HomeView
import com.tengmo.vader.ui.Routes
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class HomeViewLogicTest {
    @Test fun startsOnStoredHomeView() {
        assertEquals(Routes.SEA, startRouteFor(HomeView.Sea, openedFromWidget = false))
        assertEquals(Routes.OVERVIEW, startRouteFor(HomeView.Overview, openedFromWidget = false))
    }

    @Test fun widgetTapAlwaysStartsOnOverview() {
        assertEquals(Routes.OVERVIEW, startRouteFor(HomeView.Sea, openedFromWidget = true))
    }

    @Test fun onlyOverviewAndSeaTabsAreSavedAsHomeView() {
        assertEquals(HomeView.Overview, homeViewChosenByTab(Routes.OVERVIEW))
        assertEquals(HomeView.Sea, homeViewChosenByTab(Routes.SEA))
        assertNull(homeViewChosenByTab(Routes.MAP))
        assertNull(homeViewChosenByTab(Routes.FAVORITES))
        assertNull(homeViewChosenByTab(Routes.GRAPH))
    }
}
