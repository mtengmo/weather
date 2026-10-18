package com.tengmo.vader.data.repository

import com.tengmo.vader.data.local.PlaceNameCache
import com.tengmo.vader.data.model.DataSource
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.isPlaceholderName
import com.tengmo.vader.data.model.LocationSource
import com.tengmo.vader.data.model.NearbyStationSeries
import com.tengmo.vader.data.model.ObservationSeries
import com.tengmo.vader.data.model.ObservationStatus
import com.tengmo.vader.data.model.ObservationWindow
import com.tengmo.vader.data.model.WeatherObservation
import com.tengmo.vader.data.model.WeatherWarning
import com.tengmo.vader.data.source.MetNoSource
import com.tengmo.vader.data.source.NominatimSource
import com.tengmo.vader.data.source.OpenMeteoSource
import com.tengmo.vader.data.source.SmhiSource
import com.tengmo.vader.data.source.parseGeoGeometry
import com.tengmo.vader.data.source.pointInPolygon
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

/** One source's own forecast-only entry (mirrors weatherApi.ts's `MultiSourceForecastEntry`,
 *  used by the Overview/Details "multi-source" comparison — FR-004). */
data class MultiSourceForecastEntry(
    val source: String, // "smhi" | "open-meteo" | "met-no"
    val observations: List<WeatherObservation>,
    val issuedAt: String?,
)

/**
 * T019 — port of src/services/weatherApi.ts. Implements the source-selection contract from
 * contracts/weather-data-sources.md: SMHI first when the location is SMHI-covered (with an
 * Open-Meteo forecast-only merge if SMHI's own forecast came back empty, and a silent full
 * fallback to Open-Meteo if SMHI itself failed), otherwise Open-Meteo directly.
 */
class WeatherRepository(
    private val smhi: SmhiSource,
    private val openMeteo: OpenMeteoSource,
    private val metNo: MetNoSource,
    private val nominatim: NominatimSource,
    private val nameCache: PlaceNameCache? = null,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private val UPCOMING_WINDOW_MS = 48L * 60 * 60 * 1000

    private val SEVERITY_ORDER = mapOf(
        "MESSAGE" to 0, "YELLOW" to 1, "ORANGE" to 2, "RED" to 3,
        "CLASS_1" to 1, "CLASS_2" to 2, "CLASS_3" to 3,
    )

    private fun severityRank(code: String) = SEVERITY_ORDER[code] ?: -1

    private fun expectsForecast(window: ObservationWindow) = window != ObservationWindow.Last30Days

    suspend fun isSmhiCovered(latitude: Double, longitude: Double): Boolean =
        runCatching { smhi.isCovered(latitude, longitude) }.getOrDefault(false)

    /** Faithful port of weatherApi.ts's `getObservations` — see
     *  contracts/weather-data-sources.md's "Source-selection contract". */
    suspend fun getObservations(
        latitude: Double,
        longitude: Double,
        window: ObservationWindow,
        extendedForecast: Boolean = false,
    ): ObservationSeries = getObservationsRaw(latitude, longitude, window, extendedForecast).let {
        it.copy(observations = backfillTrailingObservationGap(it.observations))
    }

    private suspend fun getObservationsRaw(
        latitude: Double,
        longitude: Double,
        window: ObservationWindow,
        extendedForecast: Boolean,
    ): ObservationSeries {
        if (isSmhiCovered(latitude, longitude)) {
            val smhiResult = runCatching { smhi.getObservations(latitude, longitude, window, extendedForecast) }.getOrNull()
            if (smhiResult != null) {
                val hasForecast = smhiResult.observations.any { it.isForecast }
                if (expectsForecast(window) && !hasForecast) {
                    val fallbackForecast = runCatching {
                        openMeteo.getForecastOnly(latitude, longitude, window, extendedForecast)
                    }.getOrDefault(emptyList())
                    if (fallbackForecast.isNotEmpty()) {
                        return smhiResult.copy(
                            observations = smhiResult.observations + fallbackForecast,
                            forecastFromFallbackSource = true,
                            primarySource = DataSource.Smhi,
                        )
                    }
                }
                return smhiResult.copy(primarySource = DataSource.Smhi)
            }
            // SMHI failed for an in-coverage location — silently fall back to Open-Meteo.
        }
        return openMeteo.getObservations(latitude, longitude, window, extendedForecast).copy(primarySource = DataSource.OpenMeteo)
    }

    /** UV-risk hour buckets (STRÅNG, SMHI-only) — empty for non-SMHI-covered locations. */
    suspend fun getUvRisk(latitude: Double, longitude: Double, window: ObservationWindow): Set<Long> {
        if (!isSmhiCovered(latitude, longitude)) return emptySet()
        return smhi.getUvRiskHours(latitude, longitude, window)
    }

    /** Active/upcoming warnings for a location — port of weatherApi.ts's
     *  `getWarningsForLocation` including its severity sort and 48h "upcoming" window. */
    suspend fun getWarningsForLocation(latitude: Double, longitude: Double, language: String = "en"): List<WeatherWarning> {
        if (!isSmhiCovered(latitude, longitude)) return emptyList()
        val raw = smhi.getActiveWarningsRaw()
        val now = System.currentTimeMillis()
        val warnings = mutableListOf<WeatherWarning>()

        for (warning in raw) {
            for (area in warning.warningAreas) {
                val validFrom = runCatching { java.time.Instant.parse(area.approximateStart).toEpochMilli() }.getOrNull() ?: continue
                val validUntil = area.approximateEnd?.let {
                    runCatching { java.time.Instant.parse(it).toEpochMilli() }.getOrNull()
                }
                if (validFrom > now + UPCOMING_WINDOW_MS) continue
                if (validUntil != null && validUntil <= now) continue

                val geometry = parseGeoGeometry(area.area.geometry.type, area.area.geometry.coordinates) ?: continue
                if (!pointInPolygon(latitude, longitude, geometry)) continue

                // SMHI publishes `sv` and `en` for each text field: prefer the app language and flag
                // the fallback (textLanguage) so the UI can say so instead of silently mixing.
                val sv = language == "sv"
                warnings += WeatherWarning(
                    id = "${warning.id}-${area.id}",
                    severityCode = area.warningLevel.code ?: "",
                    severityLabel = (if (sv) area.warningLevel.sv ?: area.warningLevel.en else area.warningLevel.en ?: area.warningLevel.sv) ?: "",
                    title = (if (sv) warning.event.sv ?: warning.event.en else warning.event.en ?: warning.event.sv) ?: "",
                    textLanguage = if (sv) (if (warning.event.sv != null) "sv" else "en") else (if (warning.event.en != null) "en" else "sv"),
                    areaName = (if (sv) area.areaName.sv ?: area.areaName.en else area.areaName.en ?: area.areaName.sv) ?: "",
                    description = area.descriptions.joinToString("\n\n") { d ->
                        val title = (if (sv) d.title.sv ?: d.title.en else d.title.en ?: d.title.sv) ?: ""
                        val text = (if (sv) d.text.sv ?: d.text.en else d.text.en ?: d.text.sv) ?: ""
                        "$title: $text"
                    },
                    validFrom = area.approximateStart,
                    validUntil = area.approximateEnd,
                    isActive = validFrom <= now,
                    isInformational = area.warningLevel.code == "MESSAGE",
                )
            }
        }

        return warnings.sortedWith(
            compareByDescending<WeatherWarning> { it.isActive }.thenByDescending { severityRank(it.severityCode) },
        )
    }

    /** Nearby-station comparison series (Graph view, FR-004/FR-006) — port of weatherApi.ts's
     *  `getNearbyStationSeries`: fetches count+1 stations and drops the nearest (already used
     *  for the location's own series), each fetch independent so one failure doesn't drop others. */
    suspend fun getNearbyStationSeries(
        latitude: Double,
        longitude: Double,
        window: ObservationWindow,
        count: Int,
    ): List<NearbyStationSeries> {
        if (count == 0 || !isSmhiCovered(latitude, longitude)) return emptyList()
        val stations = runCatching { smhi.nearestStations(latitude, longitude, count + 1) }.getOrNull() ?: return emptyList()
        val comparisonStations = stations.drop(1).take(count)

        return coroutineScope {
            comparisonStations.map { station ->
                async {
                    runCatching {
                        NearbyStationSeries(station, smhi.getObservations(station.latitude, station.longitude, window))
                    }.getOrNull()
                }
            }.mapNotNull { it.await() }
        }
    }

    /** Every source's own forecast-only observations, fetched independently
     *  (port of weatherApi.ts's `getMultiSourceForecast`). */
    suspend fun getMultiSourceForecast(
        latitude: Double,
        longitude: Double,
        window: ObservationWindow,
        extendedForecast: Boolean = false,
    ): List<MultiSourceForecastEntry> =
        coroutineScope {
            val smhiDeferred = async {
                if (!isSmhiCovered(latitude, longitude)) return@async null
                // Forecast-only path — avoids re-fetching all seven observation parameters (025).
                runCatching { smhi.getForecastOnly(latitude, longitude, window, extendedForecast) }.getOrNull()
            }
            val openMeteoDeferred = async { runCatching { openMeteo.getForecastOnly(latitude, longitude, window, extendedForecast) }.getOrNull() }
            val metNoDeferred = async { runCatching { metNo.getForecast(latitude, longitude, window, extendedForecast) }.getOrNull() }

            val entries = mutableListOf<MultiSourceForecastEntry>()
            smhiDeferred.await()?.takeIf { it.observations.isNotEmpty() }
                ?.let { entries += MultiSourceForecastEntry("smhi", it.observations, it.issuedAt) }
            openMeteoDeferred.await()?.takeIf { it.isNotEmpty() }?.let { entries += MultiSourceForecastEntry("open-meteo", it, null) }
            metNoDeferred.await()?.takeIf { it.observations.isNotEmpty() }
                ?.let { entries += MultiSourceForecastEntry("met-no", it.observations, it.issuedAt) }
            entries
        }

    /** Cache-first reverse geocoding; a successful network name is cached for ~30 days. */
    suspend fun reverseGeocodeName(latitude: Double, longitude: Double, language: String = "en"): String? {
        nameCache?.get(latitude, longitude, language, clock())?.let { return it }
        val name = nominatim.reverseGeocode(latitude, longitude, language)?.takeIf { it.isNotBlank() }
        if (name != null) nameCache?.put(latitude, longitude, language, name, clock())
        return name
    }

    /** Stores a name resolved elsewhere (favorite / map pick) so it is never looked up again. */
    fun rememberPlaceName(latitude: Double, longitude: Double, language: String, name: String) {
        if (!isPlaceholderName(name)) nameCache?.put(latitude, longitude, language, name, clock())
    }

    suspend fun searchPlaces(query: String): List<OpenMeteoSource.PlaceCandidate> = openMeteo.searchPlaces(query)

    /** The best name for a coordinate (cache, then reverse geocoding, then the nearest SMHI
     *  station's name), or null when nothing could be resolved. Never returns a placeholder. */
    suspend fun resolvePlaceName(latitude: Double, longitude: Double, language: String = "en"): String? {
        reverseGeocodeName(latitude, longitude, language)?.let { return it }
        if (!isSmhiCovered(latitude, longitude)) return null
        return runCatching { smhi.nearestStations(latitude, longitude, 1).firstOrNull()?.displayName }
            .getOrNull()?.takeIf { !isPlaceholderName(it) }
    }

    /** Resolves a bare coordinate into a current-position [Location]. When no name can be found the
     *  displayName is BLANK (the UI shows a localised "My location"); a placeholder is never stored. */
    suspend fun resolveCurrentLocationName(latitude: Double, longitude: Double, language: String = "en"): Location =
        Location(latitude, longitude, resolvePlaceName(latitude, longitude, language).orEmpty(), LocationSource.CurrentPosition)
}

/**
 * Source-agnostic safety net for the empty "current hour" slot ("—°", no icon): when the series'
 * trailing observed (non-forecast) entries carry no temperature, they are replaced by the nearest
 * forecast hour's values (timestamp kept, marked as forecast). Older mid-series gaps are left alone.
 * No-op without a forecast entry. Complements SmhiSource's exact-hour `fillTrailingObservationGap`.
 */
fun backfillTrailingObservationGap(observations: List<WeatherObservation>): List<WeatherObservation> {
    val firstForecast = observations.indexOfFirst { it.isForecast }
    if (firstForecast <= 0) return observations
    val donor = observations.subList(firstForecast, observations.size).firstOrNull { it.temperature != null }
        ?: return observations
    val result = observations.toMutableList()
    for (i in firstForecast - 1 downTo 0) {
        if (result[i].temperature != null) break
        result[i] = donor.copy(timestamp = result[i].timestamp, isForecast = true)
    }
    return result
}
