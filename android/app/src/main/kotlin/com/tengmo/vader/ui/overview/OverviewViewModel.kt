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
import com.tengmo.vader.data.repository.MultiSourceForecastEntry
import com.tengmo.vader.data.repository.TimelineData
import com.tengmo.vader.data.repository.TimelineMode
import com.tengmo.vader.data.repository.build3DayTimeline
import com.tengmo.vader.data.repository.buildDailyTimeline
import com.tengmo.vader.data.repository.buildHourlyTimeline
import com.tengmo.vader.data.repository.mergeMultiSourceIntoTimeline
import com.tengmo.vader.data.repository.resolveEffectiveLocale
import com.tengmo.vader.data.model.WeatherObservation
import com.tengmo.vader.data.model.WeatherWarning
import com.tengmo.vader.data.repository.deriveFeelsLike
import com.tengmo.vader.data.repository.nearestObservationOf
import com.tengmo.vader.data.repository.RestOfDayAggregate
import com.tengmo.vader.data.repository.restOfDayAggregate
import com.tengmo.vader.data.repository.toDailyAggregates
import com.tengmo.vader.data.model.needsNameRepair
import com.tengmo.vader.location.CurrentLocationProvider
import com.tengmo.vader.location.LocationNameRepair
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.withContext
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
    val restOfDay: RestOfDayAggregate? = null,
    val warnings: List<WeatherWarning> = emptyList(),
    /** Language the shown warnings were fetched in; a mismatch with the app language triggers a re-fetch. */
    val warningsLanguage: String? = null,
    val uvRiskHours: Set<Long> = emptySet(),
    val lastUpdatedEpochMillis: Long? = null,
    val isRefreshing: Boolean = false,
    /** True only while a user-initiated (pull / button) refresh runs — drives the pull spinner. */
    val isUserRefreshing: Boolean = false,
    val loadFailed: Boolean = false,
    /** True when the shown data came from the on-device cache because the network fetch failed
     *  (FR-020) — the UI pairs it with lastUpdatedEpochMillis for the offline indicator. */
    val showingCachedData: Boolean = false,
    /** Selected Overview timeline resolution (session only, default 24 Hours). */
    val timelineMode: TimelineMode = TimelineMode.Hours24,
    /** "Show next 48 hours" (24h mode only; session only, default off). */
    val extendedForecast: Boolean = false,
    /** Ready-to-render timeline for [timelineMode]; null until the first series arrives. */
    val timeline: TimelineData? = null,
    /** True while the hourly (24h/48h) series is being fetched over the network. */
    val isTimelineLoading: Boolean = false,
)

class OverviewViewModel(application: Application) : AndroidViewModel(application) {
    private val services = ServiceLocator.get(application)
    private val locationProvider = CurrentLocationProvider(application)

    private val _uiState = MutableStateFlow(OverviewUiState())
    val uiState: StateFlow<OverviewUiState> = _uiState.asStateFlow()

    private var started = false

    // Timeline inputs. Hourly series are kept per forecast reach (index 0 = 24h, 1 = 48h) so they never mix.
    private val hourlyObservations = arrayOfNulls<List<WeatherObservation>>(2)
    private val hourlyLoadedAt = LongArray(2)
    private val hourlyMultiSource = arrayOfNulls<List<MultiSourceForecastEntry>>(2)
    private var weeklyMultiSource: List<MultiSourceForecastEntry> = emptyList()
    private var timelineJob: Job? = null

    private fun slot(extended: Boolean) = if (extended) 1 else 0

    /** Switches the timeline resolution (24 Hours / 3 Days / 7 Days). The extended flag only
     *  applies in 24h mode. */
    fun setTimelineMode(mode: TimelineMode) {
        if (_uiState.value.timelineMode == mode) return
        _uiState.update { it.copy(timelineMode = mode) }
        rebuildTimeline()
    }

    /** Toggles "Show next 48 hours" (only meaningful in 24h mode). Loads the 48h series
     *  cache-first, then from the network when missing or stale. */
    fun setExtendedForecast(extended: Boolean) {
        if (_uiState.value.extendedForecast == extended) return
        _uiState.update { it.copy(extendedForecast = extended) }
        rebuildTimeline()
        val current = (_uiState.value.locationState as? LocationLoadState.Ready)?.location ?: return
        viewModelScope.launch {
            loadHourly(current, force = false)
            rebuildTimeline()
        }
    }

    /** Recomputes [OverviewUiState.timeline] off the main thread. Also call after an app-language
     *  change so labels follow the new locale. */
    fun rebuildTimeline() {
        timelineJob?.cancel()
        timelineJob = viewModelScope.launch {
            val state = _uiState.value
            val prefs = runCatching { services.preferencesStore.preferences.first() }.getOrNull()
            val locale = prefs?.let { resolveEffectiveLocale(it.language) } ?: java.util.Locale.ENGLISH
            val unit = prefs?.unit ?: com.tengmo.vader.data.model.DEFAULT_UNIT_SYSTEM
            val extended = state.extendedForecast
            val hourly = hourlyObservations[slot(extended)]
            val hourlyMulti = hourlyMultiSource[slot(extended)].orEmpty()
            val weeklyMulti = weeklyMultiSource
            val uv = state.uvRiskHours
            val weekly = state.observations
            val timeline = withContext(Dispatchers.Default) {
                if (weekly.isEmpty() && hourly == null) return@withContext null
                val now = System.currentTimeMillis()
                val zone = ZoneId.systemDefault()
                when (state.timelineMode) {
                    TimelineMode.Hours24 -> mergeMultiSourceIntoTimeline(
                        buildHourlyTimeline(hourly ?: hourlyFromWeekly(weekly, extended), now, zone, extended, unit, uv, locale),
                        hourlyMulti, unit,
                    )
                    TimelineMode.Days3 -> mergeMultiSourceIntoTimeline(build3DayTimeline(weekly, now, zone, unit, uv, locale), weeklyMulti, unit)
                    TimelineMode.Days7 -> mergeMultiSourceIntoTimeline(buildDailyTimeline(weekly, now, zone, unit, uv, locale), weeklyMulti, unit)
                }
            }
            val restOfDay = (hourly ?: weekly).takeIf { it.isNotEmpty() }?.let { restOfDayAggregate(it) }
            _uiState.update { it.copy(timeline = timeline, restOfDay = restOfDay) }
        }
    }

    /** Fallback while the dedicated hourly series is not loaded: the last 24 observed hours and
     *  the following forecast hours cut from the 7-day series. */
    private fun hourlyFromWeekly(weekly: List<WeatherObservation>, extended: Boolean): List<WeatherObservation> {
        val observed = weekly.filter { !it.isForecast }.takeLast(24)
        val forecast = weekly.filter { it.isForecast }.take(if (extended) 48 else 24)
        return observed + forecast
    }

    /** Cache-first load of the hourly (Last24Hours) series for the current forecast reach. */
    private suspend fun loadHourly(location: Location, force: Boolean) {
        val extended = _uiState.value.extendedForecast
        val i = slot(extended)
        val repo = services.weatherRepository
        if (hourlyObservations[i] == null) {
            services.snapshotStore.loadHourlySeries(location.latitude, location.longitude, extended)?.let { (series, at) ->
                hourlyObservations[i] = series.observations
                hourlyLoadedAt[i] = at
            }
        }
        val stale = hourlyObservations[i] == null || System.currentTimeMillis() - hourlyLoadedAt[i] > CACHE_MAX_AGE_MS
        if (!force && !stale) return
        _uiState.update { it.copy(isTimelineLoading = true) }
        val fetched = runCatching {
            repo.getObservations(location.latitude, location.longitude, ObservationWindow.Last24Hours, extended)
        }.getOrNull()?.takeIf { it.observations.isNotEmpty() }
        if (fetched != null) {
            val at = System.currentTimeMillis()
            hourlyObservations[i] = fetched.observations
            hourlyLoadedAt[i] = at
            services.snapshotStore.saveHourlySeries(fetched, at, extended)
        }
        hourlyMultiSource[i] = runCatching {
            repo.getMultiSourceForecast(location.latitude, location.longitude, ObservationWindow.Last24Hours, extended)
        }.getOrNull() ?: hourlyMultiSource[i]
        _uiState.update { it.copy(isTimelineLoading = false) }
    }

    /** Restores the last-viewed location if one exists; otherwise resolves the device's current
     *  position when [permissionGranted] (US1 scenarios 1-4). Safe to call again after the user
     *  grants permission. */
    fun start(permissionGranted: Boolean) {
        if (started && _uiState.value.locationState is LocationLoadState.Ready) {
            repairNameIfNeeded() // warm start: a placeholder may still be stored
            return
        }
        started = true
        viewModelScope.launch {
            val prefs: UserPreferences = services.preferencesStore.preferences.first()
            val lastViewed = prefs.lastViewedLocation
            if (lastViewed != null) {
                selectLocation(lastViewed, remember = false)
                repairNameIfNeeded()
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
        val resolved = services.weatherRepository.resolveCurrentLocationName(
            coords.latitude, coords.longitude, services.preferencesStore.effectiveLanguage(),
        )
        selectLocation(resolved)
        if (resolved.needsNameRepair()) repairNameIfNeeded()
    }

    private var repairJob: Job? = null

    private val nameRepair = LocationNameRepair(
        resolveName = { lat, lon, language -> services.weatherRepository.resolvePlaceName(lat, lon, language) },
        readStored = { services.preferencesStore.preferences.first().lastViewedLocation },
        persist = { services.preferencesStore.setLastViewedLocation(it) },
    )

    /** Background, non-blocking: if the stored current position has no real name (blank or an old
     *  "Current location" placeholder), resolve it from its coordinates (name cache first, then the
     *  rate-limited network lookup) and persist the real name once. Failure keeps the state as is. */
    private fun repairNameIfNeeded() {
        if (repairJob?.isActive == true) return
        repairJob = viewModelScope.launch {
            val stored = services.preferencesStore.preferences.first().lastViewedLocation ?: return@launch
            if (!stored.needsNameRepair()) return@launch
            val fixed = nameRepair.repair(stored, services.preferencesStore.effectiveLanguage()) ?: return@launch
            applyResolvedName(fixed)
        }
    }

    /** Shows [location]'s name on the already-loaded place (same coordinates) without reloading data. */
    fun applyResolvedName(location: Location) {
        val shown = (_uiState.value.locationState as? LocationLoadState.Ready)?.location ?: return
        if (shown.latitude != location.latitude || shown.longitude != location.longitude) return
        if (shown.displayName == location.displayName) return
        _uiState.update { it.copy(locationState = LocationLoadState.Ready(shown.copy(displayName = location.displayName))) }
    }

    fun selectLocation(location: Location, remember: Boolean = true) {
        viewModelScope.launch {
            if (remember) services.preferencesStore.setLastViewedLocation(location)
            hourlyObservations.fill(null)
            hourlyMultiSource.fill(null)
            weeklyMultiSource = emptyList()
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

    private suspend fun currentLanguage(): String =
        resolveEffectiveLocale(services.preferencesStore.preferences.first().language).language

    /** Re-fetches only the warnings when the app language changed since they were loaded, so the
     *  banner text always matches the language the rest of the screen is in. */
    fun refreshWarningsForLanguage() {
        val current = (_uiState.value.locationState as? LocationLoadState.Ready)?.location ?: return
        viewModelScope.launch {
            val language = currentLanguage()
            if (_uiState.value.warningsLanguage == null || _uiState.value.warningsLanguage == language) return@launch
            val warnings = runCatching { services.weatherRepository.getWarningsForLocation(current.latitude, current.longitude, language) }.getOrNull()
                ?: return@launch
            _uiState.value = _uiState.value.copy(warnings = warnings, warningsLanguage = language)
        }
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

        loadHourly(location, force)
        if (fetchExtras || needFetch) {
            weeklyMultiSource = runCatching {
                repo.getMultiSourceForecast(lat, lon, ObservationWindow.Last7Days)
            }.getOrNull() ?: weeklyMultiSource
        }
        if (fetchExtras || needFetch) {
            val language = currentLanguage()
            val warnings = runCatching { repo.getWarningsForLocation(lat, lon, language) }.getOrNull()
            val uvRisk = runCatching { repo.getUvRisk(lat, lon, ObservationWindow.Last7Days) }.getOrNull()
            _uiState.value = _uiState.value.copy(
                warnings = warnings ?: _uiState.value.warnings,
                warningsLanguage = if (warnings != null) language else _uiState.value.warningsLanguage,
                uvRiskHours = uvRisk ?: _uiState.value.uvRiskHours,
            )
        }
        _uiState.value = _uiState.value.copy(isRefreshing = false, isUserRefreshing = false)
        rebuildTimeline()
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
            lastUpdatedEpochMillis = loadedAt,
            loadFailed = false,
            showingCachedData = fromCache,
        )
        rebuildTimeline()
    }

    private companion object {
        const val CACHE_MAX_AGE_MS = 15 * 60_000L
    }
}
