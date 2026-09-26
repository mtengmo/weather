package com.tengmo.vader.location

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import androidx.compose.ui.platform.LocalContext

/** T030 — foreground location permission flow (FR-016: platform's own prompt, with purpose text
 *  shown by the caller before triggering it, per @string/permission_foregroundRationale). */
class LocationPermissionState internal constructor(
    granted: Boolean,
    private val requestPermission: () -> Unit,
) {
    var isGranted by mutableStateOf(granted)
        internal set

    fun request() = requestPermission()
}

@Composable
fun rememberLocationPermissionState(): LocationPermissionState {
    val context = LocalContext.current
    fun currentlyGranted() =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    var granted by remember { mutableStateOf(currentlyGranted()) }

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
    ) { results ->
        granted = results.values.any { it }
    }

    val state = remember {
        LocationPermissionState(granted = granted) {
            launcher.launch(
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
            )
        }
    }
    state.isGranted = granted
    return state
}
