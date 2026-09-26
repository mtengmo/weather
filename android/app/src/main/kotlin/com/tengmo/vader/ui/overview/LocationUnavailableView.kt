package com.tengmo.vader.ui.overview

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R

/** T038 — the "location unavailable" guidance (denied/unavailable, US1 scenario 3, FR-016): same
 *  message as the web app, plus a path to place search so the user can still get weather, and a
 *  re-request affordance when permission is simply not yet granted. */
@Composable
fun LocationUnavailableView(
    permissionGranted: Boolean,
    onRequestPermission: () -> Unit,
    onSearchPlace: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.app_locationUnavailable))
        if (!permissionGranted) {
            Text(stringResource(R.string.permission_foregroundRationale))
            Button(onClick = onRequestPermission) { Text(stringResource(R.string.permission_grantAction)) }
        }
        Button(onClick = onSearchPlace) { Text(stringResource(R.string.placeSearch_label)) }
    }
}
