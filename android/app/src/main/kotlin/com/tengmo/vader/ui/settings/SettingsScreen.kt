package com.tengmo.vader.ui.settings

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material3.Switch
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.tengmo.vader.location.hasBackgroundLocationPermission
import com.tengmo.vader.location.rememberBackgroundLocationState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
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
private fun SectionTitle(text: String) = Text(text, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)

/** Opt-in "Follow my location in the background" (default off). Turning it on walks through the
 *  staged permission flow (foreground, then "Allow all the time"); it only stays on while the
 *  background permission is actually held. */
@Composable
private fun FollowLocationRow(enabled: Boolean, onChange: (Boolean) -> Unit) {
    val context = LocalContext.current
    var hasBackground by remember { mutableStateOf(hasBackgroundLocationPermission(context)) }
    var pendingEnable by remember { mutableStateOf(false) }
    val permission = rememberBackgroundLocationState { granted ->
        hasBackground = granted
        if (granted && pendingEnable) {
            pendingEnable = false
            onChange(true)
        }
    }
    // Returning from the system settings screen (Android 11+ "Allow all the time").
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        hasBackground = hasBackgroundLocationPermission(context)
        if (pendingEnable && hasBackground) {
            pendingEnable = false
            onChange(true)
        }
    }
    val checked = enabled && hasBackground
    val title = stringResource(R.string.settings_followBackground_title)
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .toggleable(
                    value = checked,
                    role = Role.Switch,
                    onValueChange = { on ->
                        if (!on) {
                            pendingEnable = false
                            onChange(false)
                        } else if (hasBackground) {
                            onChange(true)
                        } else {
                            pendingEnable = true
                            permission.request()
                        }
                    },
                ),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(title, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
            Switch(checked = checked, onCheckedChange = null)
        }
        Text(
            stringResource(R.string.settings_followBackground_desc),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (pendingEnable && !hasBackground) {
            Text(stringResource(R.string.settings_followBackground_needsPermission), style = MaterialTheme.typography.bodyMedium)
            TextButton(onClick = {
                context.startActivity(
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null)),
                )
            }) { Text(stringResource(R.string.settings_followBackground_openSettings)) }
        }
    }
}

/** T054 — Settings screen (US4): every option the web's SettingsMenu/ThemeToggle/UnitToggle/
 *  LanguageToggle/HighLowToggle/NearbyStationCountControl offers, plus the how-it-works, privacy
 *  and attribution information (FR-004, FR-019). */
@OptIn(ExperimentalLayoutApi::class)
@Suppress("UNUSED_PARAMETER")
@Composable
fun SettingsScreen(viewModel: SettingsViewModel = viewModel()) {
    val prefs by viewModel.preferences.collectAsState(initial = UserPreferences())
    var showHowItWorks by remember { mutableStateOf(false) }
    var showPrivacy by remember { mutableStateOf(false) }

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Theme.
        SectionTitle(stringResource(R.string.settings_theme))
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

        FollowLocationRow(prefs.followLocationInBackground, viewModel::setFollowLocationInBackground)

        TextButton(onClick = { showHowItWorks = !showHowItWorks }) { Text(stringResource(R.string.footer_howThisWorks)) }
        if (showHowItWorks) HowItWorksView()
        TextButton(onClick = { showPrivacy = !showPrivacy }) { Text(stringResource(R.string.footer_privacy)) }
        if (showPrivacy) PrivacyNoticeView()

        AttributionView()
    }
}
