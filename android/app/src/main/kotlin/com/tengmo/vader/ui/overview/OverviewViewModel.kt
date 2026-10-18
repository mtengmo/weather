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
import com.tengmo.vader.data.repository.nearestObservationOf
import com.tengmo.vader.data.repository.sumCalendarDayPrecipitation
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
    /** True only while a user-initiated (pull / button) refresh runs — drives the pull spinner. */
    val isUserRefreshing: Boolean = false,
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
                loadFailed = false,
            )
            // Cache first, then network only when stale; warnings/UV once per screen load.
            load(location, force = false, userInitiated = false, fetchExtras = true)
        }
    }

    /** Re-checks the current place. [force] always hits the network; otherwise only a cache older
     *  than [CACHE_MAX_AGE_MS] does. Only [userInitiated] refreshes show the pull spinner. */
    fun refresh(force: Boolean, userInitiated: Boolean) {
        val current = (_uiState.value.locationState as? LocationLoadState.Ready)?.location ?: return
        if (_uiState.value.isRefreshing) return
        viewModelScope.launch { load(current, force, userInitiated, fetchExtras = force) }
    }

    private suspend fun load(location: Location, force: Boolean, userInitiated: Boolean, fetchExtras: Boolean) {
        val repo = services.weatherRepository
        val lat = location.latitude
        val lon = location.longitude

        var cached = services.snapshotStore.loadSeries(lat, lon)
        if (cached != null) {
            applySeries(cached.first, cached.second, fromCache = false)
        }
        val stale = cached == null || System.currentTimeMillis() - cached.second > CACHE_MAX_AGE_MS
        val needFetch = force || stale

        if (needFetch) {
            _uiState.value = _uiState.value.copy(isRefreshing = true, isUserRefreshing = userInitiated)
            val fetched = runCatching {
                repo.getObservations(lat, lon, ObservationWindow.Last7Days)
            }.getOrNull()?.takeIf { it.observations.isNotEmpty() }
            if (fetched != null) {
                val loadedAt = System.currentTimeMillis()
                services.snapshotStore.saveSeries(fetched, loadedAt)
                cached = fetched to loadedAt
                applySeries(fetched, loadedAt, fromCache = false)
            } else if (cached != null) {
                // Network/source failure: keep showing the last successfully loaded data (FR-020).
                applySeries(cached.first, cached.second, fromCache = true)
            } else {
                _uiState.value = _uiState.value.copy(isRefreshing = false, isUserRefreshing = false, loadFailed = true)
                return
            }
        }

        if (fetchExtras || needFetch) {
            val warnings = runCatching { repo.getWarningsForLocation(lat, lon) }.getOrNull()
            val uvRisk = runCatching { repo.getUvRisk(lat, lon, ObservationWindow.Last7Days) }.getOrNull()
            _uiState.value = _uiState.value.copy(
                warnings = warnings ?: _uiState.value.warnings,
                uvRiskHours = uvRisk ?: _uiState.value.uvRiskHours,
            )
        }
        _uiState.value = _uiState.value.copy(isRefreshing = false, isUserRefreshing = false)
    }

    private fun applySeries(series: ObservationSeries, loadedAt: Long, fromCache: Boolean) {
        // Forward-looking "Now" reading (web 027): nearest forecast hour, not the latest observed one.
        val latestActual = nearestObservationOf(series.observations)
        _uiState.value = _uiState.value.copy(
            dailyAggregates = toDailyAggregates(series.observations, bucketCount = 7),
            observations = series.observations,
            currentObservation = latestActual,
            currentFeelsLike = latestActual?.let {
                deriveFeelsLike(it.temperature, it.windSpeed, it.relativeHumidity?.toDouble())
            },
            todaysRainTotalMm = sumCalendarDayPrecipitation(series.observations),
            lastUpdatedEpochMillis = loadedAt,
            loadFailed = false,
            showingCachedData = fromCache,
        )
    }

    private companion object {
        const val CACHE_MAX_AGE_MS = 15 * 60_000L
    }
}
