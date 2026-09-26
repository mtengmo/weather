package com.tengmo.vader.location

import android.annotation.SuppressLint
import android.content.Context
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.tasks.await

/** T031 — one-shot current-position resolution via FusedLocationProviderClient, foreground only.
 *  [Priority.PRIORITY_BALANCED_POWER_ACCURACY] is coarse-tolerant (FR-017): it succeeds from
 *  coarse-only permission grants, unlike PRIORITY_HIGH_ACCURACY. */
class CurrentLocationProvider(context: Context) {
    private val client = LocationServices.getFusedLocationProviderClient(context)

    data class Coordinates(val latitude: Double, val longitude: Double)

    @SuppressLint("MissingPermission") // caller gates this on LocationPermissionState.isGranted
    suspend fun getCurrentLocation(): Coordinates? = runCatching {
        val request = CurrentLocationRequest.Builder()
            .setPriority(Priority.PRIORITY_BALANCED_POWER_ACCURACY)
            .build()
        val location = client.getCurrentLocation(request, null).await() ?: return null
        Coordinates(location.latitude, location.longitude)
    }.getOrNull()
}
