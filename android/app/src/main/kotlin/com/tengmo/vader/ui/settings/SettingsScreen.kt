package com.tengmo.vader.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tengmo.vader.R
import com.tengmo.vader.data.model.LanguagePreference
import com.tengmo.vader.data.model.Theme
import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.model.UserPreferences
import com.tengmo.vader.data.model.VALID_NEARBY_STATION_COUNTS
import com.tengmo.vader.ui.AttributionView
import com.tengmo.vader.ui.HowItWorksView
import com.tengmo.vader.ui.PrivacyNoticeView

@Composable
private fun SectionTitle(text: String) = Text(text, fontSize = 16.sp, color = MaterialTheme.colorScheme.primary)

/** T054 — Settings screen (US4): every option the web's SettingsMenu/ThemeToggle/UnitToggle/
 *  LanguageToggle/HighLowToggle/NearbyStationCountControl offers, plus the how-it-works, privacy
 *  and attribution information (FR-004, FR-019). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(onHome: () -> Unit, viewModel: SettingsViewModel = viewModel()) {
    val prefs by viewModel.preferences.collectAsState(initial = UserPreferences())
    var showHowItWorks by remember { mutableStateOf(false) }
    var showPrivacy by remember { mutableStateOf(false) }

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        TextButton(onClick = onHome) { Text(stringResource(R.string.app_homeButton)) }
        Text(stringResource(R.string.settingsMenu_settings), fontSize = 22.sp)

        // Theme.
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(prefs.theme == Theme.Midnight, { viewModel.setTheme(Theme.Midnight) }, { Text(stringResource(R.string.themeToggle_dark)) })
            FilterChip(prefs.theme == Theme.Ivory, { viewModel.setTheme(Theme.Ivory) }, { Text(stringResource(R.string.themeToggle_light)) })
        }

        // Units.
        SectionTitle(stringResource(R.string.unitToggle_ariaLabel))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(prefs.unit == UnitSystem.Metric, { viewModel.setUnit(UnitSystem.Metric) }, { Text("°C, mm, m/s") })
            FilterChip(prefs.unit == UnitSystem.Imperial, { viewModel.setUnit(UnitSystem.Imperial) }, { Text("°F, in, mph") })
        }

        // Language.
        SectionTitle(stringResource(R.string.settingsMenu_language))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(prefs.language == LanguagePreference.Auto, { viewModel.setLanguage(LanguagePreference.Auto) }, { Text(stringResource(R.string.languageToggle_auto)) })
            FilterChip(prefs.language == LanguagePreference.En, { viewModel.setLanguage(LanguagePreference.En) }, { Text(stringResource(R.string.languageToggle_english)) })
            FilterChip(prefs.language == LanguagePreference.Sv, { viewModel.setLanguage(LanguagePreference.Sv) }, { Text(stringResource(R.string.languageToggle_swedish)) })
        }

        // Nearby stations (0-4).
        SectionTitle(stringResource(R.string.nearbyStationCount_label))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            VALID_NEARBY_STATION_COUNTS.forEach { count ->
                FilterChip(prefs.nearbyStationCount == count, { viewModel.setNearbyStationCount(count) }, { Text(count.toString()) })
            }
        }

        // High/low lines.
        SectionTitle(stringResource(R.string.highLowToggle_ariaLabel))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(prefs.highLowVisible, { viewModel.setHighLowVisible(true) }, { Text(stringResource(R.string.highLowToggle_on)) })
            FilterChip(!prefs.highLowVisible, { viewModel.setHighLowVisible(false) }, { Text(stringResource(R.string.highLowToggle_off)) })
        }

        TextButton(onClick = { showHowItWorks = !showHowItWorks }) { Text(stringResource(R.string.footer_howThisWorks)) }
        if (showHowItWorks) HowItWorksView()
        TextButton(onClick = { showPrivacy = !showPrivacy }) { Text(stringResource(R.string.footer_privacy)) }
        if (showPrivacy) PrivacyNoticeView()

        AttributionView()
    }
}
