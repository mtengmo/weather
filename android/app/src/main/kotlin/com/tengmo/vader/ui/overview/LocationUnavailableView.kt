package com.tengmo.vader.ui.overview

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R

/** Why the app has no location. Each reason gets its own message and next action. */
enum class LocationUnavailableReason {
    /** Permission not granted yet (never asked, or denied once and still askable). */
    NeedsPermission,

    /** Permission denied and Android will no longer show the prompt: only system settings can fix it. */
    PermissionBlocked,

    /** Permission granted, but no position came back (location services off, or no fix). */
    NoFix,
}

/** The "location unavailable" guidance (FR-016): one fact, the matching next action, and always a
 *  way to search for a place instead. */
@Composable
fun LocationUnavailableView(
    reason: LocationUnavailableReason,
    onRequestPermission: () -> Unit,
    onOpenAppSettings: () -> Unit,
    onRetry: () -> Unit,
    onSearchPlace: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        when (reason) {
            LocationUnavailableReason.NeedsPermission -> {
                Text(stringResource(R.string.locationUnavailable_needsPermission))
                Text(stringResource(R.string.permission_foregroundRationale))
                Button(onClick = onRequestPermission) { Text(stringResource(R.string.permission_grantAction)) }
            }
            LocationUnavailableReason.PermissionBlocked -> {
                Text(stringResource(R.string.locationUnavailable_blocked))
                Button(onClick = onOpenAppSettings) { Text(stringResource(R.string.locationUnavailable_openSettings)) }
            }
            LocationUnavailableReason.NoFix -> {
                Text(stringResource(R.string.locationUnavailable_noFix))
                Button(onClick = onRetry) { Text(stringResource(R.string.locationUnavailable_retry)) }
            }
        }
        OutlinedButton(onClick = onSearchPlace) { Text(stringResource(R.string.locationUnavailable_searchPlace)) }
    }
}
