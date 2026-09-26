package com.tengmo.vader.location

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.google.android.gms.location.LocationResult
import com.tengmo.vader.work.LocationChangeRefreshTrigger

/** Receives the significant-location-change updates requested by [SignificantLocationTracker] and
 *  hands the newest position to the widget refresh (T068). Registered in the manifest. */
class LocationChangeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION) return
        val location = LocationResult.extractResult(intent)?.lastLocation ?: return
        LocationChangeRefreshTrigger.enqueue(context, location.latitude, location.longitude)
    }

    companion object {
        const val ACTION = "com.tengmo.vader.LOCATION_CHANGED"
    }
}
