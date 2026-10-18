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
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.core.app.ActivityCompat
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

    /** True once the user has denied the prompt and Android will no longer show it (denied
     *  twice, or "don't ask again"): the only way back is the app's system settings. */
    var isPermanentlyDenied by mutableStateOf(false)
        internal set

    fun request() = requestPermission()
}

private fun Context.findActivity(): Activity? {
    var c: Context? = this
    while (c is ContextWrapper) {
        if (c is Activity) return c
        c = c.baseContext
    }
    return null
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

    var permanentlyDenied by remember { mutableStateOf(false) }
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
    ) { results ->
        granted = results.values.any { it }
        // After a denial, "should show rationale" is false only when the prompt is now blocked.
        val activity = context.findActivity()
        permanentlyDenied = !granted && activity != null &&
            !ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.ACCESS_FINE_LOCATION)
    }

    val state = remember {
        LocationPermissionState(granted = granted) {
            launcher.launch(
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
            )
        }
    }
    state.isGranted = granted
    state.isPermanentlyDenied = permanentlyDenied && !granted
    return state
}
