package com.tengmo.vader.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tengmo.vader.R

/** "How this works" (FR-004) — the web HowItWorks.tsx text, assembled from the same i18n pieces
 *  (intro, windows, chart observed-vs-forecast legend, data sources, UV badge, warnings). */
@Composable
fun HowItWorksView() {
    val windows = "${stringResource(R.string.howItWorks_windowsIntro)} ${stringResource(R.string.weatherOverview_windowLabel24h)}, " +
        "${stringResource(R.string.weatherOverview_windowLabel3d)} ${stringResource(R.string.howItWorks_and)} " +
        "${stringResource(R.string.weatherOverview_windowLabel7d)} ${stringResource(R.string.howItWorks_windowsOutro)}"
    val chart = "${stringResource(R.string.howItWorks_chartIntro)} ${stringResource(R.string.howItWorks_observedWord)} " +
        "${stringResource(R.string.howItWorks_chartMiddle)} ${stringResource(R.string.howItWorks_forecastWord)}" +
        stringResource(R.string.howItWorks_chartOutro)
    val uv = "${stringResource(R.string.howItWorks_uvPrefix)} ${stringResource(R.string.weatherOverview_highUv)} " +
        stringResource(R.string.howItWorks_uvSuffix)

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(stringResource(R.string.howItWorks_intro), fontSize = 13.sp)
        Text(windows, fontSize = 13.sp)
        Text(chart, fontSize = 13.sp)
        Text(stringResource(R.string.howItWorks_dataSources), fontSize = 13.sp)
        Text(uv, fontSize = 13.sp)
        Text(stringResource(R.string.howItWorks_warnings), fontSize = 13.sp)
    }
}
