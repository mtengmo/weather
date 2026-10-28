package com.tengmo.vader.ui.map

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.UserPreferences
import kotlinx.coroutines.launch

/** T046 — the rain-radar map screen (US2): the native map with the RainViewer radar layer, pins for favorites and the
 *  last-viewed location. Selecting a pin makes it the current location and returns Home. */
@Composable
fun MapScreen(onHome: () -> Unit) {
    val context = LocalContext.current
    val services = remember { ServiceLocator.get(context) }
    val scope = rememberCoroutineScope()
    val favorites by services.favoritesStore.favorites.collectAsState(initial = emptyList())
    val prefs by services.preferencesStore.preferences.collectAsState(initial = UserPreferences())

    val cached = prefs.lastViewedLocation
    val pins: List<Location> = favorites.map { it.toLocation() } +
        listOfNotNull(cached?.takeIf { c -> favorites.none { it.latitude == c.latitude && it.longitude == c.longitude } })

    var radarTileUrl by remember { mutableStateOf<String?>(null) }

    // Fetched once, independent of pin rendering — a slow/failed fetch never delays the pins
    // (FR-004, research.md §2 of 032).
    LaunchedEffect(pins.isNotEmpty()) {
        if (pins.isNotEmpty()) radarTileUrl = fetchRadarTileUrl(services.httpClient)
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (pins.isEmpty()) {
            Text(stringResource(R.string.mapView_empty))
            return@Column
        }

        MapSurface(
            pins = pins,
            radarTileUrl = radarTileUrl,
            onSelectLocation = { location ->
                scope.launch {
                    services.preferencesStore.setLastViewedLocation(location)
                    onHome()
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
        )
    }
}
