package com.tengmo.vader.location

import android.annotation.SuppressLint
import android.content.Context
import android.os.SystemClock
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.tasks.await

/**
 * Lowest-power location read for the background worker: the cached last-known fix from Play
 * Services. It never requests a new fix (no priority, no updates), so GPS is never turned on.
 */
class LastKnownLocationReader(private val context: Context) {
    @SuppressLint("MissingPermission") // gated on hasBackgroundLocationPermission by the caller
    suspend fun read(): BackgroundLocationFollower.Fix? = runCatching {
        val location = LocationServices.getFusedLocationProviderClient(context).lastLocation.await() ?: return null
        val ageMs = (SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos) / 1_000_000
        BackgroundLocationFollower.Fix(
            location.latitude, location.longitude, ageMs,
            if (location.hasAccuracy()) location.accuracy else null,
        )
    }.getOrNull()
}
