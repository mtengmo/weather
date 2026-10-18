package com.tengmo.vader.ui.overview

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tengmo.vader.R
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.UserPreferences
import com.tengmo.vader.data.repository.capForecastReach
import com.tengmo.vader.data.repository.todayAggregateOf
import com.tengmo.vader.data.repository.observationIcon
import com.tengmo.vader.location.rememberLocationPermissionState
import com.tengmo.vader.ui.LaunchScreen
import com.tengmo.vader.ui.DataFreshnessIndicator
import androidx.compose.ui.platform.LocalContext
import com.tengmo.vader.ui.TimeFormat
import com.tengmo.vader.ui.appLocale
import com.tengmo.vader.ui.overview.timeline.OverviewTimeline


/** T037 — the Overview screen (US1): assembles the warning banner, Today summary card, timeline, bound to [OverviewViewModel]. The app bar (Scaffold) shows
 *  the place name and provides navigation, so this screen has no header or nav buttons. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OverviewScreen(
    onOpenFavorites: () -> Unit,
    viewModel: OverviewViewModel = viewModel(),
) {
    val context = LocalContext.current
    val preferencesStore = ServiceLocator.get(context).preferencesStore
    val prefs by preferencesStore.preferences.collectAsState(initial = UserPreferences())
    val state by viewModel.uiState.collectAsState()
    val permission = rememberLocationPermissionState()

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

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
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
                        android.content.Intent(
                            android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            android.net.Uri.fromParts("package", context.packageName, null),
                        ),
                    )
                },
                onRetry = { viewModel.useCurrentLocation(permission.isGranted) },
                onSearchPlace = onOpenFavorites,
            )
            is LocationLoadState.Ready -> {
                val pullState = rememberPullToRefreshState()
                PullToRefreshBox(
                    isRefreshing = state.isUserRefreshing,
                    onRefresh = { viewModel.refresh(force = true, userInitiated = true) },
                    modifier = Modifier.fillMaxSize(),
                    state = pullState,
                    indicator = {
                        PullToRefreshDefaults.Indicator(
                            state = pullState,
                            isRefreshing = state.isUserRefreshing,
                            modifier = Modifier.align(Alignment.TopCenter),
                            containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    },
                ) {
                Column(
                    Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(start = 12.dp, end = 12.dp, bottom = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    RefreshCoordinator(
                        lastUpdatedEpochMillis = state.lastUpdatedEpochMillis,
                        enabled = !state.isRefreshing,
                        onRefresh = { viewModel.refresh(force = false, userInitiated = false) },
                    )
                    DataFreshnessIndicator(
                        lastUpdatedEpochMillis = state.lastUpdatedEpochMillis,
                        isUpdating = state.isRefreshing,
                        showingCachedData = state.showingCachedData,
                        hasAnyData = state.observations.isNotEmpty(),
                        onRefresh = { viewModel.refresh(force = true, userInitiated = true) },
                    )

                    if (state.loadFailed) {
                        Text(stringResource(R.string.weatherOverview_unavailable), color = MaterialTheme.colorScheme.error)
                    }

                    WarningBanner(warnings = state.warnings.filter { !it.isInformational })

                    // Today's card is forward-looking: the (now, now+24h] bucket (web 023).
                    val today = todayAggregateOf(capForecastReach(state.dailyAggregates, 7))
                    val current = state.currentObservation
                    TodaySummaryCard(
                        today = today,
                        unit = prefs.unit,
                        location = loc.location,
                        currentIcon = current?.let { observationIcon(it, java.time.ZoneId.systemDefault()) },
                        currentTemperature = current?.temperature,
                        currentFeelsLike = state.currentFeelsLike,
                        restOfDay = state.restOfDay,
                        informationalWarnings = state.warnings.filter { it.isInformational },
                        currentHumidity = current?.relativeHumidity,
                    )

                    OverviewTimeline(
                        timeline = state.timeline,
                        mode = state.timelineMode,
                        extendedForecast = state.extendedForecast,
                        isLoading = state.isTimelineLoading,
                        onModeChange = viewModel::setTimelineMode,
                        onExtendedChange = viewModel::setExtendedForecast,
                    )
                }
                }
            }
        }
    }
}
