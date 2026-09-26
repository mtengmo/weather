package com.tengmo.vader.ui.overview

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.DailyAggregate
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.ObservationSeries
import com.tengmo.vader.data.model.ObservationWindow
import com.tengmo.vader.data.model.UserPreferences
import com.tengmo.vader.data.model.WeatherObservation
import com.tengmo.vader.data.model.WeatherWarning
import com.tengmo.vader.data.repository.deriveFeelsLike
import com.tengmo.vader.data.repository.toDailyAggregates
import com.tengmo.vader.location.CurrentLocationProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** T032 — mirrors web's App.tsx: restores the last-viewed location, resolves the current
 *  position, and drives the Overview's data (FR-004). */
sealed class LocationLoadState {
    data object Loading : LocationLoadState()

    /** FR-016 / US1 scenario 3 — denied or unresolvable. */
    data object Unavailable : LocationLoadState()

    data class Ready(val location: Location) : LocationLoadState()
}

data class OverviewUiState(
    val locationState: LocationLoadState = LocationLoadState.Loading,
    val dailyAggregates: List<DailyAggregate> = emptyList(),
    val observations: List<WeatherObservation> = emptyList(),
    /** The latest actual (non-forecast) reading — drives the Today card's "Now" line. */
    val currentObservation: WeatherObservation? = null,
    val currentFeelsLike: Double? = null,
    /** Precipitation summed over today's local calendar day (033-todays-rain-total). */
    val todaysRainTotalMm: Double? = null,
    val warnings: List<WeatherWarning> = emptyList(),
    val uvRiskHours: Set<Long> = emptySet(),
    val lastUpdatedEpochMillis: Long? = null,
    val isRefreshing: Boolean = false,
    val loadFailed: Boolean = false,
    /** True when the shown data came from the on-device cache because the network fetch failed
     *  (FR-020) — the UI pairs it with lastUpdatedEpochMillis for the offline indicator. */
    val showingCachedData: Boolean = false,
)

class OverviewViewModel(application: Application) : AndroidViewModel(application) {
    private val services = ServiceLocator.get(application)
    private val locationProvider = CurrentLocationProvider(application)

    private val _uiState = MutableStateFlow(OverviewUiState())
    val uiState: StateFlow<OverviewUiState> = _uiState.asStateFlow()

    private var started = false

    /** Restores the last-viewed location if one exists; otherwise resolves the device's current
     *  position when [permissionGranted] (US1 scenarios 1-4). Safe to call again after the user
     *  grants permission. */
    fun start(permissionGranted: Boolean) {
        if (started && _uiState.value.locationState is LocationLoadState.Ready) return
        started = true
        viewModelScope.launch {
            val prefs: UserPreferences = services.preferencesStore.preferences.first()
            val lastViewed = prefs.lastViewedLocation
            if (lastViewed != null) {
                selectLocation(lastViewed, remember = false)
                return@launch
            }
            resolveCurrentPosition(permissionGranted)
        }
    }

    /** "Use current location" — always re-resolves the device position. */
    fun useCurrentLocation(permissionGranted: Boolean) {
        viewModelScope.launch { resolveCurrentPosition(permissionGranted) }
    }

    private suspend fun resolveCurrentPosition(permissionGranted: Boolean) {
        if (!permissionGranted) {
            _uiState.value = _uiState.value.copy(locationState = LocationLoadState.Unavailable)
            return
        }
        val coords = locationProvider.getCurrentLocation()
        if (coords == null) {
            _uiState.value = _uiState.value.copy(locationState = LocationLoadState.Unavailable)
            return
        }
        val resolved = services.weatherRepository.resolveCurrentLocationName(coords.latitude, coords.longitude)
        selectLocation(resolved)
    }

    fun selectLocation(location: Location, remember: Boolean = true) {
        viewModelScope.launch {
            if (remember) services.preferencesStore.setLastViewedLocation(location)
            _uiState.value = _uiState.value.copy(
                locationState = LocationLoadState.Ready(location),
                isRefreshing = true,
                loadFailed = false,
            )
            refresh(location)
        }
    }

    fun refreshCurrent() {
        val current = (_uiState.value.locationState as? LocationLoadState.Ready)?.location ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRefreshing = true)
            refresh(current)
        }
    }

    private suspend fun refresh(location: Location) {
        val repo = services.weatherRepository
        val fetched = runCatching {
            repo.getObservations(location.latitude, location.longitude, ObservationWindow.Last7Days)
        }.getOrNull()?.takeIf { it.observations.isNotEmpty() }

        val series: ObservationSeries
        val loadedAt: Long
        val fromCache: Boolean
        if (fetched != null) {
            series = fetched
            loadedAt = System.currentTimeMillis()
            fromCache = false
            services.snapshotStore.saveSeries(fetched, loadedAt)
        } else {
            // Network/source failure: fall back to the last successfully loaded data (FR-020).
            val cached = services.snapshotStore.loadSeries(location.latitude, location.longitude)
            if (cached == null) {
                _uiState.value = _uiState.value.copy(isRefreshing = false, loadFailed = true)
                return
            }
            series = cached.first
            loadedAt = cached.second
            fromCache = true
        }

        val warnings = if (fromCache) {
            emptyList()
        } else {
            runCatching { repo.getWarningsForLocation(location.latitude, location.longitude) }.getOrDefault(emptyList())
        }
        val uvRisk = if (fromCache) {
            emptySet()
        } else {
            runCatching {
                repo.getUvRisk(location.latitude, location.longitude, ObservationWindow.Last7Days)
            }.getOrDefault(emptySet())
        }

        val latestActual = series.observations.lastOrNull { !it.isForecast }
        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        val todaysRain = series.observations
            .filter { Instant.parse(it.timestamp).atZone(zone).toLocalDate() == today }
            .mapNotNull { it.precipitation }
            .takeIf { it.isNotEmpty() }
            ?.sum()

        _uiState.value = _uiState.value.copy(
            dailyAggregates = toDailyAggregates(series.observations, bucketCount = 7),
            observations = series.observations,
            currentObservation = latestActual,
            currentFeelsLike = latestActual?.let {
                deriveFeelsLike(it.temperature, it.windSpeed, it.relativeHumidity?.toDouble())
            },
            todaysRainTotalMm = todaysRain,
            warnings = warnings,
            uvRiskHours = uvRisk,
            lastUpdatedEpochMillis = loadedAt,
            isRefreshing = false,
            loadFailed = false,
            showingCachedData = fromCache,
        )
    }
}
