package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.DataSource
import com.tengmo.vader.data.model.Location
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
    suspend fun getObservations(latitude: Double, longitude: Double, window: ObservationWindow): ObservationSeries {
        if (isSmhiCovered(latitude, longitude)) {
            val smhiResult = runCatching { smhi.getObservations(latitude, longitude, window) }.getOrNull()
            if (smhiResult != null) {
                val hasForecast = smhiResult.observations.any { it.isForecast }
                if (expectsForecast(window) && !hasForecast) {
                    val fallbackForecast = runCatching {
                        openMeteo.getForecastOnly(latitude, longitude, window)
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
        return openMeteo.getObservations(latitude, longitude, window).copy(primarySource = DataSource.OpenMeteo)
    }

    /** UV-risk hour buckets (STRÅNG, SMHI-only) — empty for non-SMHI-covered locations. */
    suspend fun getUvRisk(latitude: Double, longitude: Double, window: ObservationWindow): Set<Long> {
        if (!isSmhiCovered(latitude, longitude)) return emptySet()
        return smhi.getUvRiskHours(latitude, longitude, window)
    }

    /** Active/upcoming warnings for a location — port of weatherApi.ts's
     *  `getWarningsForLocation` including its severity sort and 48h "upcoming" window. */
    suspend fun getWarningsForLocation(latitude: Double, longitude: Double): List<WeatherWarning> {
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

                warnings += WeatherWarning(
                    id = "${warning.id}-${area.id}",
                    severityCode = area.warningLevel.code ?: "",
                    severityLabel = area.warningLevel.en ?: area.warningLevel.sv ?: "",
                    title = warning.event.en ?: warning.event.sv ?: "",
                    areaName = area.areaName.en ?: area.areaName.sv ?: "",
                    description = area.descriptions.joinToString("\n\n") { d ->
                        "${d.title.en ?: d.title.sv ?: ""}: ${d.text.en ?: d.text.sv ?: ""}"
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
    suspend fun getMultiSourceForecast(latitude: Double, longitude: Double, window: ObservationWindow): List<MultiSourceForecastEntry> =
        coroutineScope {
            val smhiDeferred = async {
                if (!isSmhiCovered(latitude, longitude)) return@async null
                // Forecast-only path — avoids re-fetching all seven observation parameters (025).
                runCatching { smhi.getForecastOnly(latitude, longitude, window) }.getOrNull()
            }
            val openMeteoDeferred = async { runCatching { openMeteo.getForecastOnly(latitude, longitude, window) }.getOrNull() }
            val metNoDeferred = async { runCatching { metNo.getForecast(latitude, longitude, window) }.getOrNull() }

            val entries = mutableListOf<MultiSourceForecastEntry>()
            smhiDeferred.await()?.takeIf { it.observations.isNotEmpty() }
                ?.let { entries += MultiSourceForecastEntry("smhi", it.observations, it.issuedAt) }
            openMeteoDeferred.await()?.takeIf { it.isNotEmpty() }?.let { entries += MultiSourceForecastEntry("open-meteo", it, null) }
            metNoDeferred.await()?.takeIf { it.observations.isNotEmpty() }
                ?.let { entries += MultiSourceForecastEntry("met-no", it.observations, it.issuedAt) }
            entries
        }

    suspend fun reverseGeocodeName(latitude: Double, longitude: Double): String? =
        nominatim.reverseGeocode(latitude, longitude)

    suspend fun searchPlaces(query: String): List<OpenMeteoSource.PlaceCandidate> = openMeteo.searchPlaces(query)

    /** Resolves a bare coordinate into a [Location] with the best available display name —
     *  the nearest SMHI station's own name if covered, else reverse geocoding. */
    suspend fun resolveCurrentLocationName(latitude: Double, longitude: Double): Location {
        val name = if (isSmhiCovered(latitude, longitude)) {
            smhi.nearestStations(latitude, longitude, 1).firstOrNull()?.displayName
        } else {
            null
        } ?: reverseGeocodeName(latitude, longitude) ?: "Current location"
        return Location(latitude, longitude, name, LocationSource.CurrentPosition)
    }
}
