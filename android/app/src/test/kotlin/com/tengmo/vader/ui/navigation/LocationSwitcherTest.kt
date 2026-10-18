package com.tengmo.vader.ui.navigation

import com.tengmo.vader.data.model.Favorite
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.LocationSource
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LocationSwitcherTest {
    private val fav = Favorite("1", 59.86, 17.64, "Uppsala", "2026-01-01T00:00:00Z")

    @Test fun matchesByCoordinates() {
        assertTrue(isSelectedFavorite(fav, Location(59.86, 17.64, "Other name", LocationSource.CurrentPosition)))
    }

    @Test fun differentOrNullIsNotSelected() {
        assertFalse(isSelectedFavorite(fav, Location(60.0, 17.64, "Uppsala", LocationSource.Favorite)))
        assertFalse(isSelectedFavorite(fav, null))
    }
}
