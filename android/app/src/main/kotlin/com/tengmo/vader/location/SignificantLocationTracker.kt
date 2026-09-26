package com.tengmo.vader.location

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

/**
 * T061 / FR-026 / research.md §3 — significant-location-change tracking for "My location"
 * widgets. Deliberately *not* continuous tracking: a low-power, city-level request with a large
 * minimum displacement, so the OS only wakes us when the phone has moved to a different town, and
 * the location subsystem stays idle otherwise (SC-012 battery budget). Updates are delivered to
 * [LocationChangeReceiver] via a PendingIntent, so no foreground service or notification is needed.
 * Only ever started once background location is granted and a "My location" widget exists.
 */
object SignificantLocationTracker {
    /** "Noticeably moved" — roughly a different town. */
    const val MIN_DISPLACEMENT_METERS = 10_000f

    /** Checks at most every 15 minutes; with the displacement gate, well inside SC-011's 30 min. */
    private const val INTERVAL_MS = 15 * 60_000L

    private fun pendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, LocationChangeReceiver::class.java).setAction(LocationChangeReceiver.ACTION)
        // Location updates are written into the intent by Play Services, so it must be mutable.
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
        return PendingIntent.getBroadcast(context, 0, intent, flags)
    }

    @SuppressLint("MissingPermission") // gated on hasBackgroundLocationPermission below
    fun start(context: Context) {
        if (!hasBackgroundLocationPermission(context)) return
        val request = LocationRequest.Builder(Priority.PRIORITY_LOW_POWER, INTERVAL_MS)
            .setMinUpdateDistanceMeters(MIN_DISPLACEMENT_METERS)
            .setMinUpdateIntervalMillis(INTERVAL_MS)
            .build()
        LocationServices.getFusedLocationProviderClient(context)
            .requestLocationUpdates(request, pendingIntent(context))
    }

    fun stop(context: Context) {
        LocationServices.getFusedLocationProviderClient(context).removeLocationUpdates(pendingIntent(context))
    }
}
