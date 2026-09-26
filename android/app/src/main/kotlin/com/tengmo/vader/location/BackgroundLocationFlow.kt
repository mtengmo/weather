package com.tengmo.vader.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat

/** True when the app may read location while it is not on screen ("Allow all the time") —
 *  runtime check, used by the widget refresh worker and the widget UI (FR-028). */
fun hasBackgroundLocationPermission(context: Context): Boolean {
    val foreground = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED
    if (!foreground) return false
    // Before Android 10 there is no separate background permission: foreground implies it.
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true
    return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) ==
        PackageManager.PERMISSION_GRANTED
}

/**
 * T060 / FR-027 — the staged background-location request: Android requires foreground location
 * first ("while using the app") and only then allows asking for "Allow all the time" (on Android
 * 11+ the second step sends the user to a system settings screen). This is only ever started from
 * "My location" widget setup — never at first launch — and the caller shows the explanation
 * (R.string.permission_backgroundRationale) *before* calling [request].
 */
class BackgroundLocationState internal constructor(
    foregroundGranted: Boolean,
    backgroundGranted: Boolean,
    private val requestForeground: () -> Unit,
    private val requestBackground: () -> Unit,
) {
    var isForegroundGranted by mutableStateOf(foregroundGranted)
        internal set
    var isBackgroundGranted by mutableStateOf(backgroundGranted)
        internal set

    /** Runs the next missing stage: foreground first, then background. */
    fun request() {
        if (!isForegroundGranted) requestForeground() else if (!isBackgroundGranted) requestBackground()
    }
}

@Composable
fun rememberBackgroundLocationState(onResult: (backgroundGranted: Boolean) -> Unit = {}): BackgroundLocationState {
    val context = LocalContext.current
    var foreground by remember { mutableStateOf(hasForeground(context)) }
    var background by remember { mutableStateOf(hasBackgroundLocationPermission(context)) }

    val backgroundLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        background = hasBackgroundLocationPermission(context)
        onResult(background)
    }
    val foregroundLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
        foreground = results.values.any { it }
        if (foreground && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !hasBackgroundLocationPermission(context)) {
            // Stage two, immediately after foreground is granted.
            backgroundLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        } else {
            background = hasBackgroundLocationPermission(context)
            onResult(background)
        }
    }

    return remember {
        BackgroundLocationState(
            foreground, background,
            requestForeground = {
                foregroundLauncher.launch(
                    arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                )
            },
            requestBackground = { backgroundLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION) },
        )
    }.also {
        it.isForegroundGranted = foreground
        it.isBackgroundGranted = background
    }
}

private fun hasForeground(context: Context) =
    ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED
