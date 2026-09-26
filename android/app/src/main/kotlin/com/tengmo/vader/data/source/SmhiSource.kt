package com.tengmo.vader.data.source

import com.tengmo.vader.data.model.DataSource
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.LocationSource
import com.tengmo.vader.data.model.ObservationSeries
import com.tengmo.vader.data.model.ObservationStatus
import com.tengmo.vader.data.model.ObservationWindow
import com.tengmo.vader.data.model.StationInfo
import com.tengmo.vader.data.model.WeatherCondition
import com.tengmo.vader.data.model.WeatherObservation
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.ZonedDateTime
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/** Result of a forecast-only fetch: hourly points plus SMHI's own "issued at" time. */
data class SmhiForecastResult(val observations: List<WeatherObservation>, val issuedAt: String?)

/**
 * T014 — port of src/services/smhiProvider.ts (contracts/weather-data-sources.md). Faithful to the
 * web app's behaviour where it matters for value parity (SC-003):
 *  - each observed parameter is read from *its own* nearest active station; only the temperature
 *    station is required (no station => throws, and a failing temperature call throws too, which
 *    is what makes WeatherRepository fall back to Open-Meteo), the other parameters degrade to
 *    "no readings" individually;
 *  - observations are a dense hourly grid for the window (a null-valued hour where the station
 *    published nothing), never just the timestamps that happened to arrive;
 *  - the forecast comes from SMHI's point-forecast API (snow1g), one grid point for all metrics,
 *    is also a dense hourly grid, and backfills trailing observation gaps.
 */
class SmhiSource(private val client: HttpClient, private val json: Json) {
    companion object {
        private const val BASE_URL = "https://opendata-download-metobs.smhi.se/api/version/1.0"
        private const val WARNINGS_URL =
            "https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json"
        private const val FORECAST_BASE_URL =
            "https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point"
        private const val UV_BASE_URL =
            "https://opendata-download-metanalys.smhi.se/api/category/strang1g/version/1/geotype/point"

        const val TEMPERATURE_PARAM = 1
        const val WIND_DIRECTION_PARAM = 3
        const val WIND_PARAM = 4
        const val HUMIDITY_PARAM = 6
        const val PRECIPITATION_PARAM = 7
        const val CLOUD_PARAM = 16
        const val WIND_GUST_PARAM = 21
        const val UV_PARAMETER = 116
        const val UV_IRRADIANCE_PER_INDEX_UNIT = 25.0
        const val UV_RISK_THRESHOLD = 6.0
        const val COVERAGE_RADIUS_KM = 50.0

        private const val HOUR_MS = 3_600_000L

        private fun windowHours(window: ObservationWindow) = when (window) {
            ObservationWindow.Last24Hours -> 24
            ObservationWindow.Last7Days -> 24 * 7
            ObservationWindow.Last30Days -> 24 * 30
        }

        /** How many hours of forecast follow "now" per window (30 days has none). */
        fun forecastHours(window: ObservationWindow) = when (window) {
            ObservationWindow.Last24Hours -> 24
            ObservationWindow.Last7Days -> 24 * 7
            ObservationWindow.Last30Days -> 0
        }

        private fun period(window: ObservationWindow) = when (window) {
            ObservationWindow.Last24Hours -> "latest-day"
            ObservationWindow.Last7Days, ObservationWindow.Last30Days -> "latest-months"
        }

        // SMHI's Wsymb2 table (1-27) mapped to WeatherCondition, 1:1 with smhiProvider.ts's
        // SMHI_SYMBOL_CONDITIONS (1/2 resolve to clear-day/night by local hour).
        private val SYMBOL_CONDITIONS: Map<Int, String> = mapOf(
            1 to "clear", 2 to "clear",
            3 to "partly-cloudy", 4 to "partly-cloudy",
            5 to "cloudy", 6 to "cloudy",
            7 to "foggy",
            8 to "light-rain", 9 to "heavy-rain", 10 to "heavy-rain",
            11 to "thunderstorm",
            12 to "sleet", 13 to "sleet", 14 to "sleet",
            15 to "light-snow", 16 to "heavy-snow", 17 to "heavy-snow",
            18 to "light-rain", 19 to "heavy-rain", 20 to "heavy-rain",
            21 to "thunderstorm",
            22 to "sleet", 23 to "sleet", 24 to "sleet",
            25 to "light-snow", 26 to "heavy-snow", 27 to "heavy-snow",
        )

        fun symbolCodeToCondition(symbolCode: Int?, timestamp: String): WeatherCondition? {
            val mapped = symbolCode?.let { SYMBOL_CONDITIONS[it] } ?: return null
            return when (mapped) {
                "clear" -> {
                    val hour = Instant.parse(timestamp).atZone(ZoneId.systemDefault()).hour
                    if (hour < 6 || hour >= 20) WeatherCondition.ClearNight else WeatherCondition.ClearDay
                }
                "partly-cloudy" -> WeatherCondition.PartlyCloudy
                "cloudy" -> WeatherCondition.Cloudy
                "foggy" -> WeatherCondition.Foggy
                "light-rain" -> WeatherCondition.LightRain
                "heavy-rain" -> WeatherCondition.HeavyRain
                "thunderstorm" -> WeatherCondition.Thunderstorm
                "sleet" -> WeatherCondition.Sleet
                "light-snow" -> WeatherCondition.LightSnow
                "heavy-snow" -> WeatherCondition.HeavySnow
                else -> null
            }
        }

        /** SMHI's forecast API 404s once lat/lon exceed 6 decimals (smhiProvider.ts). */
        private fun roundCoordinate(value: Double) = Math.round(value * 1_000_000) / 1_000_000.0
    }

    // --- stations --------------------------------------------------------------------------------

    @Serializable
    private data class StationListResponse(val station: List<SmhiStationDto> = emptyList())

    @Serializable
    private data class SmhiStationDto(
        val key: String,
        val name: String? = null,
        val latitude: Double,
        val longitude: Double,
        val active: Boolean = false,
    )

    private val stationListCache = mutableMapOf<Int, List<SmhiStationDto>>()

    private suspend fun fetchStationList(parameter: Int): List<SmhiStationDto> {
        stationListCache[parameter]?.let { return it }
        val list = runCatching {
            val response: HttpResponse = client.get("$BASE_URL/parameter/$parameter.json")
            if (response.status.value !in 200..299) return@runCatching emptyList()
            json.decodeFromString<StationListResponse>(response.bodyAsText()).station
        }.getOrDefault(emptyList())
        // Only successful, non-empty lists are cached, so a transient failure is retried next time.
        if (list.isNotEmpty()) stationListCache[parameter] = list
        return list
    }

    private fun haversineKm(aLat: Double, aLon: Double, bLat: Double, bLon: Double): Double {
        val r = 6371.0
        val dLat = Math.toRadians(bLat - aLat)
        val dLon = Math.toRadians(bLon - aLon)
        val lat1 = Math.toRadians(aLat)
        val lat2 = Math.toRadians(bLat)
        val h = sin(dLat / 2).pow(2) + cos(lat1) * cos(lat2) * sin(dLon / 2).pow(2)
        return 2 * r * asin(min(1.0, sqrt(h)))
    }

    private suspend fun nearestActiveStations(parameter: Int, latitude: Double, longitude: Double, count: Int): List<StationInfo> =
        fetchStationList(parameter)
            .filter { it.active }
            .map {
                StationInfo(
                    id = it.key,
                    displayName = it.name?.trim()?.ifEmpty { null } ?: "Unnamed station",
                    distanceKm = haversineKm(latitude, longitude, it.latitude, it.longitude),
                    latitude = it.latitude,
                    longitude = it.longitude,
                )
            }
            .sortedBy { it.distanceKm }
            .take(count)

    suspend fun isCovered(latitude: Double, longitude: Double): Boolean {
        val nearest = nearestActiveStations(TEMPERATURE_PARAM, latitude, longitude, 1)
        return nearest.isNotEmpty() && nearest[0].distanceKm <= COVERAGE_RADIUS_KM
    }

    suspend fun nearestStations(latitude: Double, longitude: Double, count: Int): List<StationInfo> =
        nearestActiveStations(TEMPERATURE_PARAM, latitude, longitude, count)

    // --- observations ----------------------------------------------------------------------------

    @Serializable
    private data class SmhiValue(val date: Long, val value: String? = null)

    @Serializable
    private data class SmhiValuesResponse(val value: List<SmhiValue> = emptyList())

    /** Throws on a non-2xx response or unreadable body (smhiProvider.ts `fetchStationValues`) —
     *  the temperature call relies on this to trigger the caller's fallback to Open-Meteo. */
    private suspend fun fetchStationValues(parameter: Int, stationKey: String, window: ObservationWindow): List<SmhiValue> {
        val response: HttpResponse = client.get(
            "$BASE_URL/parameter/$parameter/station/$stationKey/period/${period(window)}/data.json",
        )
        if (response.status.value !in 200..299) throw IllegalStateException("SMHI request failed with status ${response.status.value}")
        return json.decodeFromString<SmhiValuesResponse>(response.bodyAsText()).value
    }

    /** A parameter read from its own nearest station; any failure degrades just that field to
     *  "no readings" rather than failing the whole request (smhiProvider.ts `fetchParameterValues`). */
    private suspend fun fetchParameterValues(parameter: Int, latitude: Double, longitude: Double, window: ObservationWindow): List<SmhiValue> {
        val nearest = nearestActiveStations(parameter, latitude, longitude, 1)
        if (nearest.isEmpty()) return emptyList()
        return runCatching { fetchStationValues(parameter, nearest[0].id, window) }.getOrDefault(emptyList())
    }

    private fun byHour(values: List<SmhiValue>): Map<Long, Double> {
        val map = HashMap<Long, Double>()
        for (v in values) {
            val number = v.value?.toDoubleOrNull() ?: continue
            map[Math.floorDiv(v.date, HOUR_MS)] = number
        }
        return map
    }

    private fun hourKeyToIso(hourKey: Long): String = Instant.ofEpochMilli(hourKey * HOUR_MS).toString()

    /**
     * Observed series for [window]: a dense hourly grid ending at the current hour, followed by the
     * forecast, with trailing observation gaps backfilled from the forecast.
     * @throws Exception when there is no station or the temperature call fails.
     */
    suspend fun getObservations(latitude: Double, longitude: Double, window: ObservationWindow): ObservationSeries {
        val nearestTemp = nearestActiveStations(TEMPERATURE_PARAM, latitude, longitude, 1)
        if (nearestTemp.isEmpty()) throw IllegalStateException("No active SMHI temperature station found")

        val temperature = byHour(fetchStationValues(TEMPERATURE_PARAM, nearestTemp[0].id, window))
        val precipitation = byHour(fetchParameterValues(PRECIPITATION_PARAM, latitude, longitude, window))
        val wind = byHour(fetchParameterValues(WIND_PARAM, latitude, longitude, window))
        val cloud = byHour(fetchParameterValues(CLOUD_PARAM, latitude, longitude, window))
        val windDirection = byHour(fetchParameterValues(WIND_DIRECTION_PARAM, latitude, longitude, window))
        val windGust = byHour(fetchParameterValues(WIND_GUST_PARAM, latitude, longitude, window))
        val humidity = byHour(fetchParameterValues(HUMIDITY_PARAM, latitude, longitude, window))

        val currentHour = Math.floorDiv(System.currentTimeMillis(), HOUR_MS)
        val observations = ((windowHours(window) - 1) downTo 0).map { i ->
            val key = currentHour - i
            WeatherObservation(
                timestamp = hourKeyToIso(key),
                temperature = temperature[key],
                precipitation = precipitation[key],
                windSpeed = wind[key],
                cloudCoverPercent = cloud[key]?.toInt(), // SMHI parameter 16 is already 0-100
                windDirection = windDirection[key],
                windGust = windGust[key],
                relativeHumidity = humidity[key]?.toInt(),
            )
        }.toMutableList()

        val forecastHoursNeeded = forecastHours(window)
        val forecastResult = if (forecastHoursNeeded > 0) fetchForecastTimeSeries(latitude, longitude) else null
        val timeSeries = forecastResult?.timeSeries ?: emptyMap()
        fillTrailingObservationGap(observations, timeSeries)
        val forecastObservations = buildForecastHourlySeries(forecastHoursNeeded, timeSeries)

        return ObservationSeries(
            location = Location(latitude, longitude, "", LocationSource.CurrentPosition),
            window = window,
            observations = observations + forecastObservations,
            status = ObservationStatus.Ready,
            primarySource = DataSource.Smhi,
            forecastIssuedAt = if (forecastObservations.isNotEmpty()) forecastResult?.issuedAt else null,
        )
    }

    // --- forecast (snow1g point API) -------------------------------------------------------------

    @Serializable
    private data class ForecastData(
        val air_temperature: Double? = null,
        val wind_speed: Double? = null,
        val wind_from_direction: Double? = null,
        val wind_speed_of_gust: Double? = null,
        val precipitation_amount_mean: Double? = null,
        val cloud_area_fraction: Double? = null, // octas 0-8, NOT the observation API's 0-100 scale
        val symbol_code: Double? = null,
        val probability_of_precipitation: Double? = null,
        val relative_humidity: Double? = null,
    )

    @Serializable
    private data class ForecastEntry(val time: String, val data: ForecastData = ForecastData())

    @Serializable
    private data class ForecastResponse(val createdTime: String? = null, val timeSeries: List<ForecastEntry> = emptyList())

    private class ForecastFetch(val timeSeries: Map<Long, ForecastData>, val issuedAt: String?)

    /** Forecast is a best-effort addition: any failure degrades to "no forecast" (smhiProvider.ts). */
    private suspend fun fetchForecastTimeSeries(latitude: Double, longitude: Double): ForecastFetch = runCatching {
        val lon = roundCoordinate(longitude)
        val lat = roundCoordinate(latitude)
        val response: HttpResponse = client.get("$FORECAST_BASE_URL/lon/$lon/lat/$lat/data.json")
        if (response.status.value !in 200..299) return@runCatching ForecastFetch(emptyMap(), null)
        val data = json.decodeFromString<ForecastResponse>(response.bodyAsText())
        ForecastFetch(
            timeSeries = data.timeSeries.associate { Math.floorDiv(Instant.parse(it.time).toEpochMilli(), HOUR_MS) to it.data },
            issuedAt = data.createdTime,
        )
    }.getOrDefault(ForecastFetch(emptyMap(), null))

    private fun forecastObservationForHour(hourKey: Long, data: ForecastData?): WeatherObservation {
        val timestamp = hourKeyToIso(hourKey)
        val code = data?.symbol_code?.toInt()
        return WeatherObservation(
            timestamp = timestamp,
            temperature = data?.air_temperature,
            precipitation = data?.precipitation_amount_mean,
            windSpeed = data?.wind_speed,
            cloudCoverPercent = data?.cloud_area_fraction?.let { (it * 12.5).toInt() },
            windDirection = data?.wind_from_direction,
            windGust = data?.wind_speed_of_gust,
            symbolCondition = symbolCodeToCondition(code, timestamp),
            smhiSymbolCode = code,
            chanceOfRain = data?.probability_of_precipitation?.toInt(),
            relativeHumidity = data?.relative_humidity?.toInt(),
            isForecast = true,
        )
    }

    private fun buildForecastHourlySeries(hoursNeeded: Int, timeSeries: Map<Long, ForecastData>): List<WeatherObservation> {
        if (hoursNeeded == 0 || timeSeries.isEmpty()) return emptyList()
        val currentHour = Math.floorDiv(System.currentTimeMillis(), HOUR_MS)
        return (1..hoursNeeded).map { i -> forecastObservationForHour(currentHour + i, timeSeries[currentHour + i]) }
    }

    /** The station hasn't published the current (or a just-elapsed) hour yet, leaving an all-null
     *  hole right where the chart moves from observed to forecast — backfill each *trailing* null
     *  hour from the forecast's reading for that exact hour (flagged as forecast) until a real
     *  reading or a missing forecast hour is reached (smhiProvider.ts `fillTrailingObservationGap`). */
    private fun fillTrailingObservationGap(observations: MutableList<WeatherObservation>, timeSeries: Map<Long, ForecastData>) {
        if (timeSeries.isEmpty()) return
        for (i in observations.indices.reversed()) {
            if (observations[i].temperature != null) break
            val hourKey = Math.floorDiv(Instant.parse(observations[i].timestamp).toEpochMilli(), HOUR_MS)
            val data = timeSeries[hourKey] ?: break
            observations[i] = forecastObservationForHour(hourKey, data)
        }
    }

    /** Forecast only, without the seven observation-parameter station fetches (025-reduce-api-requests). */
    suspend fun getForecastOnly(latitude: Double, longitude: Double, window: ObservationWindow): SmhiForecastResult {
        val hours = forecastHours(window)
        if (hours == 0) return SmhiForecastResult(emptyList(), null)
        val fetch = fetchForecastTimeSeries(latitude, longitude)
        val observations = buildForecastHourlySeries(hours, fetch.timeSeries)
        return SmhiForecastResult(observations, if (observations.isNotEmpty()) fetch.issuedAt else null)
    }

    // --- warnings --------------------------------------------------------------------------------

    // SMHI's Impact-Based Weather Warnings feed shape (contracts/weather-data-sources.md) — matches
    // weatherApi.ts's consumption of `warning.warningAreas[].{warningLevel,area,approximateStart,
    // approximateEnd,areaName,descriptions}` and `warning.{id,event}`.
    @Serializable
    data class LocalizedText(val en: String? = null, val sv: String? = null)

    @Serializable
    data class WarningLevel(val code: String? = null, val en: String? = null, val sv: String? = null)

    @Serializable
    data class WarningDescriptionEntry(val title: LocalizedText = LocalizedText(), val text: LocalizedText = LocalizedText())

    @Serializable
    data class WarningAreaGeometry(val type: String, val coordinates: kotlinx.serialization.json.JsonElement)

    @Serializable
    data class WarningAreaGeo(val geometry: WarningAreaGeometry)

    @Serializable
    data class WarningAreaDto(
        val id: String,
        val approximateStart: String,
        val approximateEnd: String? = null,
        val warningLevel: WarningLevel = WarningLevel(),
        val areaName: LocalizedText = LocalizedText(),
        val descriptions: List<WarningDescriptionEntry> = emptyList(),
        val area: WarningAreaGeo,
    )

    @Serializable
    data class WarningDto(
        val id: String,
        val event: LocalizedText = LocalizedText(),
        val warningAreas: List<WarningAreaDto> = emptyList(),
    )

    /** Raw feed — never throws; a failure is "no warnings" (smhiProvider.ts `getActiveWarnings`).
     *  WeatherRepository applies the coverage gate, geometry containment, validity window, sort. */
    suspend fun getActiveWarningsRaw(): List<WarningDto> = runCatching {
        val response: HttpResponse = client.get(WARNINGS_URL)
        if (response.status.value !in 200..299) return@runCatching emptyList()
        json.decodeFromString<List<WarningDto>>(response.bodyAsText())
    }.getOrDefault(emptyList())

    // --- UV (STRÅNG) -----------------------------------------------------------------------------

    @Serializable
    private data class StrangValue(val date_time: String, val value: Double)

    /** Hour-bucket keys (`floor(epochMs / 3_600_000)`, the same convention as [byHour]) whose UV
     *  Index meets the risk threshold. STRÅNG only publishes already-elapsed analyses, so no future
     *  hour is ever present. Never throws (smhiProvider.ts `getUvIndex`). */
    suspend fun getUvRiskHours(latitude: Double, longitude: Double, window: ObservationWindow): Set<Long> = runCatching {
        val days = maxOf(1, Math.ceil(windowHours(window) / 24.0).toInt())
        val from = ZonedDateTime.now(ZoneOffset.UTC).minusDays(days.toLong())
        val fromParam = "%04d%02d%02d".format(from.year, from.monthValue, from.dayOfMonth)
        val lon = roundCoordinate(longitude)
        val lat = roundCoordinate(latitude)
        val response: HttpResponse = client.get("$UV_BASE_URL/lon/$lon/lat/$lat/parameter/$UV_PARAMETER/data.json") {
            parameter("from", fromParam)
        }
        if (response.status.value !in 200..299) return@runCatching emptySet()
        json.decodeFromString<List<StrangValue>>(response.bodyAsText())
            .filter { it.value / UV_IRRADIANCE_PER_INDEX_UNIT >= UV_RISK_THRESHOLD }
            .map { Math.floorDiv(Instant.parse(it.date_time).toEpochMilli(), HOUR_MS) }
            .toSet()
    }.getOrDefault(emptySet())
}
