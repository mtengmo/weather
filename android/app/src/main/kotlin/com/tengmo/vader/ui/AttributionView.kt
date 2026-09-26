package com.tengmo.vader.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tengmo.vader.BuildConfig
import com.tengmo.vader.R

/** T072 — data-source attributions required by SMHI/Open-Meteo/MET Norway (CC BY 4.0)/OSM/
 *  RainViewer/OpenWeatherMap terms, plus the app version (the web footer shows its version too). */
@Composable
fun AttributionView() {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(stringResource(R.string.attribution_title), fontSize = 14.sp)
        Text(stringResource(R.string.attribution_smhi), fontSize = 12.sp)
        Text(stringResource(R.string.attribution_openMeteo), fontSize = 12.sp)
        Text(stringResource(R.string.attribution_metNo), fontSize = 12.sp)
        Text(stringResource(R.string.attribution_osm), fontSize = 12.sp)
        Text(stringResource(R.string.attribution_rainviewer), fontSize = 12.sp)
        if (BuildConfig.OPENWEATHERMAP_API_KEY.isNotBlank()) {
            Text(stringResource(R.string.attribution_owm), fontSize = 12.sp)
        }
        Text("v${BuildConfig.VERSION_NAME}", fontSize = 11.sp)
    }
}
