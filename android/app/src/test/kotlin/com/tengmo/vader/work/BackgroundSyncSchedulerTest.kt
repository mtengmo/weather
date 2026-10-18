package com.tengmo.vader.work

import androidx.work.NetworkType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BackgroundSyncSchedulerTest {
    @Test fun constraintsRequireNetworkAndBatteryNotLow() {
        val c = BackgroundSyncScheduler.constraints()
        assertEquals(NetworkType.CONNECTED, c.requiredNetworkType)
        assertTrue(c.requiresBatteryNotLow())
    }

    @Test fun uniqueNamesAreStable() {
        assertEquals("background-sync", BackgroundSyncScheduler.UNIQUE_NAME)
        assertEquals("widget-refresh-periodic", BackgroundSyncScheduler.LEGACY_PERIODIC_NAME)
    }
}
