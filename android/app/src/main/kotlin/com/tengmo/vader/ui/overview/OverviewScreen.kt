package com.tengmo.vader.ui.overview

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tengmo.vader.R
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.UserPreferences
import com.tengmo.vader.data.model.WeatherObservation
import com.tengmo.vader.data.repository.capForecastReach
import com.tengmo.vader.data.repository.todayAggregateOf
import com.tengmo.vader.data.repository.windowAroundToday
import com.tengmo.vader.data.repository.convertTemperature
import com.tengmo.vader.data.repository.formatValue
import com.tengmo.vader.data.repository.isNight
import com.tengmo.vader.data.repository.WeatherConditionInput
import com.tengmo.vader.data.repository.deriveWeatherCondition
import com.tengmo.vader.location.rememberLocationPermissionState
import com.tengmo.vader.ui.LaunchScreen
import com.tengmo.vader.ui.DataFreshnessIndicator
import androidx.compose.ui.platform.LocalContext
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val HOUR_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("HH")

/** T037 — the Overview screen (US1): assembles the warning banner, Today summary card, hourly
 *  strip, and 7-day forecast strip, bound to [OverviewViewModel]. The app bar (Scaffold) shows
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

    // A location picked elsewhere (map pin, favorites list) is stored as the last-viewed
    // location; pick it up here so returning Home shows it (web parity: selectLocation lands on
    // the Overview, App.tsx).
    val stored = prefs.lastViewedLocation
    LaunchedEffect(stored) {
        val shown = (state.locationState as? LocationLoadState.Ready)?.location
        if (stored != null && stored != shown && shown != null) {
            viewModel.selectLocation(stored, remember = false)
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
                permissionGranted = permission.isGranted,
                onRequestPermission = permission::request,
                onSearchPlace = onOpenFavorites,
            )
            is LocationLoadState.Ready -> {
                PullToRefreshBox(
                    isRefreshing = state.isUserRefreshing,
                    onRefresh = { viewModel.refresh(force = true, userInitiated = true) },
                    modifier = Modifier.fillMaxSize(),
                ) {
                Column(
                    Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
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
                        currentCondition = current?.let {
                            deriveWeatherCondition(
                                WeatherConditionInput(
                                    it.temperature, it.precipitation, it.windSpeed, it.cloudCoverPercent,
                                    it.timestamp, it.symbolCondition, it.chanceOfRain,
                                ),
                            )
                        },
                        currentTemperature = current?.temperature,
                        currentFeelsLike = state.currentFeelsLike,
                        todaysRainTotalMm = state.todaysRainTotalMm,
                        informationalWarnings = state.warnings.filter { it.isInformational },
                        currentHumidity = current?.relativeHumidity,
                    )

                    HourlyStrip(state.observations, prefs)

                    WeeklyForecastStrip(windowAroundToday(capForecastReach(state.dailyAggregates, 7), 7), prefs.unit)
                }
                }
            }
        }
    }
}

/** Next-24-hours strip: hour, icon, temperature — a compact take on the web's
 *  WeatherIconOverview 24-hour timeline (WeatherIconOverview.tsx, 007/008). */
@Composable
private fun HourlyStrip(observations: List<WeatherObservation>, prefs: UserPreferences) {
    val now = System.currentTimeMillis()
    val upcoming = observations
        .filter { Instant.parse(it.timestamp).toEpochMilli() >= now - 3600_000 }
        .take(24)
    if (upcoming.isEmpty()) return

    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        items(upcoming, key = { it.timestamp }) { obs ->
            val condition = deriveWeatherCondition(
                WeatherConditionInput(
                    obs.temperature, obs.precipitation, obs.windSpeed, obs.cloudCoverPercent,
                    obs.timestamp, obs.symbolCondition, obs.chanceOfRain,
                ),
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    Instant.parse(obs.timestamp).atZone(ZoneId.systemDefault()).format(HOUR_FORMAT),
                    fontSize = 12.sp,
                )
                WeatherIconImage(
                    smhiSymbolCode = obs.smhiSymbolCode,
                    condition = condition,
                    isNight = isNight(obs.timestamp),
                    temperatureCelsius = obs.temperature,
                    contentDescription = null,
                    modifier = Modifier.size(36.dp),
                )
                Text("${formatValue(convertTemperature(obs.temperature, prefs.unit), 0)}°", fontSize = 13.sp)
            }
        }
    }
}
