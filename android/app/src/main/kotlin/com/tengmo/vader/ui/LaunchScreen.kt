package com.tengmo.vader.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.background
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R

/** T039 / FR-015 — in-app loading state shown while the first location/weather resolves: the app
 *  icon over the theme background, never a blank screen. (The window-level splash shown before
 *  the first frame comes from the manifest's `Theme.TengmoVader.Launch`, res/drawable/
 *  launch_background.xml.) */
@Composable
fun LaunchScreen(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(painterResource(R.mipmap.ic_launcher_foreground), contentDescription = null, modifier = Modifier.size(96.dp))
        Text(stringResource(R.string.launch_loading), color = MaterialTheme.colorScheme.onBackground)
    }
}
