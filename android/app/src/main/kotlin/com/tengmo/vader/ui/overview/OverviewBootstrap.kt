package com.tengmo.vader.ui.overview

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalContext
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.UserPreferences
import com.tengmo.vader.location.LocationPermissionState
import com.tengmo.vader.ui.LaunchScreen
import com.tengmo.vader.ui.TimeFormat
import com.tengmo.vader.ui.appLocale

/**
 * The one app-wide location permission state, shared by [OverviewBootstrap] and every [LocationGate]
 * (two separate states would not see each other's grant or denial).
 */
val LocalLocationPermission = staticCompositionLocalOf<LocationPermissionState> {
    error("LocalLocationPermission not provided")
}

/**
 * Starts the shared [OverviewViewModel] and keeps it in step with the permission, app language and
 * stored (last-viewed) location. Lives above the nav host, so whichever tab the app opens on
 * (Overview or Sea) gets its data. Renders nothing.
 */
@Composable
fun OverviewBootstrap(viewModel: OverviewViewModel, permission: LocationPermissionState) {
    val context = LocalContext.current
    val preferencesStore = ServiceLocator.get(context).preferencesStore
    val prefs by preferencesStore.preferences.collectAsState(initial = UserPreferences())
    val state by viewModel.uiState.collectAsState()
    // Request location once on first composition when not yet granted (US1 scenario 1), then
    // (re)start whenever permission state changes.
    LaunchedEffect(Unit) {
        if (!permission.isGranted) permission.request()
    }
    LaunchedEffect(permission.isGranted) { viewModel.start(permission.isGranted) }
    val appLanguage = TimeFormat.language(appLocale())
    LaunchedEffect(appLanguage) {
        viewModel.refreshWarningsForLanguage()
        viewModel.rebuildTimeline()
    }

    // A location picked elsewhere (map pin, favorites list) is stored as the last-viewed
    // location; pick it up here so returning Home shows it (web parity: selectLocation lands on
    // the Overview, App.tsx).
    val stored = prefs.lastViewedLocation
    LaunchedEffect(stored) {
        val shown = (state.locationState as? LocationLoadState.Ready)?.location
        if (stored != null && stored != shown && shown != null) {
            if (stored.latitude == shown.latitude && stored.longitude == shown.longitude && stored.source == shown.source) {
                // Only the name changed (background re-resolution): relabel, never reload or re-persist.
                viewModel.applyResolvedName(stored)
            } else {
                viewModel.selectLocation(stored, remember = false)
            }
        } else if (stored == null && shown != null) {
            // "Use current location" clears the stored location — re-resolve the device position.
            viewModel.useCurrentLocation(permission.isGranted)
        }
    }
}

/**
 * Shows the launch screen while the location resolves and the "location unavailable" guidance when
 * it cannot; calls [content] with the shown place once it is ready. Shared by Overview and Sea.
 */
@Composable
fun LocationGate(
    state: OverviewUiState,
    viewModel: OverviewViewModel,
    onOpenFavorites: () -> Unit,
    content: @Composable (Location) -> Unit,
) {
    val context = LocalContext.current
    val permission = LocalLocationPermission.current
    when (val loc = state.locationState) {
        is LocationLoadState.Loading -> LaunchScreen()
        is LocationLoadState.Unavailable -> LocationUnavailableView(
            reason = when {
                !permission.isGranted && permission.isPermanentlyDenied -> LocationUnavailableReason.PermissionBlocked
                !permission.isGranted -> LocationUnavailableReason.NeedsPermission
                else -> LocationUnavailableReason.NoFix
            },
            onRequestPermission = permission::request,
            onOpenAppSettings = {
                context.startActivity(
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null)),
                )
            },
            onRetry = { viewModel.useCurrentLocation(permission.isGranted) },
            onSearchPlace = onOpenFavorites,
        )
        is LocationLoadState.Ready -> content(loc.location)
    }
}
