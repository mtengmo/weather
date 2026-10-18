package com.tengmo.vader.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tengmo.vader.BuildConfig
import com.tengmo.vader.R

/** T072 — data-source attributions required by SMHI/Open-Meteo/MET Norway (CC BY 4.0)/OSM/
 *  RainViewer/OpenWeatherMap terms, plus the app version (the web footer shows its version too). */
@Composable
fun AttributionView() {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(stringResource(R.string.attribution_title), style = MaterialTheme.typography.bodyMedium)
        Text(stringResource(R.string.attribution_smhi), style = MaterialTheme.typography.bodySmall)
        Text(stringResource(R.string.attribution_openMeteo), style = MaterialTheme.typography.bodySmall)
        Text(stringResource(R.string.attribution_metNo), style = MaterialTheme.typography.bodySmall)
        Text(stringResource(R.string.attribution_osm), style = MaterialTheme.typography.bodySmall)
        Text(stringResource(R.string.attribution_rainviewer), style = MaterialTheme.typography.bodySmall)
        if (BuildConfig.OPENWEATHERMAP_API_KEY.isNotBlank()) {
            Text(stringResource(R.string.attribution_owm), style = MaterialTheme.typography.bodySmall)
        }
        Text("v${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.labelSmall)
    }
}
