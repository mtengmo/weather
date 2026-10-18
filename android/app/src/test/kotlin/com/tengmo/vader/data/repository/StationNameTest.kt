package com.tengmo.vader.data.repository

import org.junit.Assert.assertEquals
import org.junit.Test

class StationNameTest {
    @Test
    fun stripsTrailingAutMarker() {
        assertEquals("Uppsala", stripStationAutoSuffix("Uppsala Aut"))
    }

    @Test
    fun stripsTrailingAMarker() {
        assertEquals("Stockholm", stripStationAutoSuffix("Stockholm A"))
    }

    @Test
    fun leavesNamesWithoutMarkerUnchanged() {
        assertEquals("Uppsala", stripStationAutoSuffix("Uppsala"))
        assertEquals("Uppsala Flygplats", stripStationAutoSuffix("Uppsala Flygplats"))
    }

    @Test
    fun onlyStripsWholeTrailingWord() {
        assertEquals("Vidsel", stripStationAutoSuffix("Vidsel Aut"))
        assertEquals("Nordaut", stripStationAutoSuffix("Nordaut"))
        assertEquals("Aust", stripStationAutoSuffix("Aust"))
    }

    @Test
    fun isCaseSensitive() {
        assertEquals("Uppsala aut", stripStationAutoSuffix("Uppsala aut"))
        assertEquals("Uppsala a", stripStationAutoSuffix("Uppsala a"))
    }

    @Test
    fun doesNotStripNameThatIsOnlyTheMarker() {
        assertEquals("Aut", stripStationAutoSuffix("Aut"))
        assertEquals("A", stripStationAutoSuffix("A"))
    }
}
