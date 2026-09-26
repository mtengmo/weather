package com.tengmo.vader.data.source

import com.tengmo.vader.data.model.DataSource
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.LocationSource
import com.tengmo.vader.data.model.ObservationSeries
import com.tengmo.vader.data.model.ObservationStatus
import com.tengmo.vader.data.model.ObservationWindow
import com.tengmo.vader.data.model.WeatherObservation
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import kotlinx.serialization.Serializable

// T015 — port of src/services/openMeteoProvider.ts (forecast/observations) and
// src/services/geocodingApi.ts (place search) — contracts/weather-data-sources.md's worldwide
// fallback source.
class OpenMeteoSource(private val client: HttpClient) {
    companion object {
        private const val FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
        private const val GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
        private val NORDIC_COUNTRY_CODES = setOf("SE", "NO", "DK", "FI", "IS")

        private fun pastDaysFor(window: ObservationWindow) = when (window) {
            ObservationWindow.Last24Hours -> 2
            ObservationWindow.Last7Days -> 8
            ObservationWindow.Last30Days -> 31
        }

        private fun forecastDaysFor(window: ObservationWindow) = when (window) {
            ObservationWindow.Last24Hours -> 2
            ObservationWindow.Last7Days -> 8
            ObservationWindow.Last30Days -> 1
        }
    }

    @Serializable
    private data class Hourly(
        val time: List<String> = emptyList(),
        val temperature_2m: List<Double?> = emptyList(),
        val precipitation: List<Double?> = emptyList(),
        val wind_speed_10m: List<Double?> = emptyList(),
        val cloud_cover: List<Double?> = emptyList(),
        val wind_direction_10m: List<Double?> = emptyList(),
        val wind_gusts_10m: List<Double?> = emptyList(),
        val relative_humidity_2m: List<Double?> = emptyList(),
        val precipitation_probability: List<Double?> = emptyList(),
    )

    @Serializable
    private data class ForecastResponse(val hourly: Hourly? = null)

    private suspend fun fetchHourlyPoints(
        latitude: Double,
        longitude: Double,
        window: ObservationWindow,
    ): List<WeatherObservation>? = runCatching {
        val response: ForecastResponse = client.get(FORECAST_URL) {
            parameter("latitude", latitude)
            parameter("longitude", longitude)
            parameter(
                "hourly",
                "temperature_2m,precipitation,wind_speed_10m,cloud_cover,wind_direction_10m," +
                    "wind_gusts_10m,relative_humidity_2m,precipitation_probability",
            )
            parameter("wind_speed_unit", "ms")
            parameter("past_days", pastDaysFor(window))
            parameter("forecast_days", forecastDaysFor(window))
            parameter("timezone", "UTC")
        }.body()
        val h = response.hourly ?: return@runCatching null
        // Open-Meteo returns UTC wall-clock times with no zone and no seconds ("2026-06-15T12:00")
        // because timezone=UTC was requested — parse as a UTC LocalDateTime (Instant.parse would
        // reject the missing seconds) and normalize to a real instant for every downstream consumer.
        h.time.mapIndexed { i, ts ->
            WeatherObservation(
                timestamp = java.time.LocalDateTime.parse(ts).toInstant(java.time.ZoneOffset.UTC).toString(),
                temperature = h.temperature_2m.getOrNull(i),
                precipitation = h.precipitation.getOrNull(i),
                windSpeed = h.wind_speed_10m.getOrNull(i),
                windDirection = h.wind_direction_10m.getOrNull(i),
                windGust = h.wind_gusts_10m.getOrNull(i),
                cloudCoverPercent = h.cloud_cover.getOrNull(i)?.toInt(),
                relativeHumidity = h.relative_humidity_2m.getOrNull(i)?.toInt(),
                chanceOfRain = h.precipitation_probability.getOrNull(i)?.toInt(),
            )
        }
    }.getOrNull()

    private fun windowHours(window: ObservationWindow) = when (window) {
        ObservationWindow.Last24Hours -> 24
        ObservationWindow.Last7Days -> 24 * 7
        ObservationWindow.Last30Days -> 24 * 30
    }

    private fun forecastHours(window: ObservationWindow) = when (window) {
        ObservationWindow.Last24Hours -> 24
        ObservationWindow.Last7Days -> 24 * 7
        ObservationWindow.Last30Days -> 0
    }

    private fun epochMillisOf(o: WeatherObservation) = java.time.Instant.parse(o.timestamp).toEpochMilli()

    /** Past `windowHours` of readings followed by the forecast (tagged isForecast), or an
     *  Unavailable empty series when the fetch failed (openMeteoProvider.ts `getObservations`). */
    suspend fun getObservations(latitude: Double, longitude: Double, window: ObservationWindow): ObservationSeries {
        val base = Location(latitude, longitude, "", LocationSource.CurrentPosition)
        val all = fetchHourlyPoints(latitude, longitude, window)
            ?: return ObservationSeries(base, window, emptyList(), ObservationStatus.Unavailable, DataSource.OpenMeteo)

        val now = System.currentTimeMillis()
        val elapsed = all.filter { epochMillisOf(it) <= now }
        val observations = elapsed.takeLast(windowHours(window))
        val upcoming = all.filter { epochMillisOf(it) > now }.map { it.copy(isForecast = true) }.take(forecastHours(window))

        return ObservationSeries(
            location = base,
            window = window,
            observations = observations + upcoming,
            status = ObservationStatus.Ready,
            primarySource = DataSource.OpenMeteo,
        )
    }

    /** Forecast-only points (SMHI's fallback when its own forecast is empty), or empty on failure. */
    suspend fun getForecastOnly(latitude: Double, longitude: Double, window: ObservationWindow): List<WeatherObservation> {
        val all = fetchHourlyPoints(latitude, longitude, window) ?: return emptyList()
        val now = System.currentTimeMillis()
        return all.filter { epochMillisOf(it) > now }.map { it.copy(isForecast = true) }.take(forecastHours(window))
    }

    data class PlaceCandidate(val latitude: Double, val longitude: Double, val displayName: String)

    @Serializable
    private data class GeocodingResult(
        val latitude: Double,
        val longitude: Double,
        val name: String,
        val admin1: String? = null,
        val country: String? = null,
        val country_code: String? = null,
    )

    @Serializable
    private data class GeocodingResponse(val results: List<GeocodingResult> = emptyList())

    /** Place search, Nordic-preferring stable sort (matches geocodingApi.ts's `searchPlaces`). */
    suspend fun searchPlaces(query: String): List<PlaceCandidate> {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return emptyList()
        val response: GeocodingResponse = client.get(GEOCODING_URL) {
            parameter("name", trimmed)
            parameter("count", 5)
            parameter("language", "en")
            parameter("format", "json")
        }.body()
        return response.results
            .mapIndexed { index, r ->
                Triple(
                    PlaceCandidate(
                        r.latitude,
                        r.longitude,
                        listOfNotNull(r.name, r.admin1, r.country).joinToString(", "),
                    ),
                    r.country_code in NORDIC_COUNTRY_CODES,
                    index,
                )
            }
            .sortedWith(compareByDescending<Triple<PlaceCandidate, Boolean, Int>> { it.second }.thenBy { it.third })
            .map { it.first }
    }
}
