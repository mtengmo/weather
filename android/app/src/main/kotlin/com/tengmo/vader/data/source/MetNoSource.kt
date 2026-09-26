package com.tengmo.vader.data.source

import com.tengmo.vader.data.model.ObservationWindow
import com.tengmo.vader.data.model.WeatherCondition
import com.tengmo.vader.data.model.WeatherObservation
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import kotlinx.serialization.Serializable
import java.time.Instant

// T016 — port of src/services/metNoProvider.ts (contracts/weather-data-sources.md). MET
// Norway's terms require an identifying User-Agent (browsers set one implicitly; a native app
// must set it explicitly) — kept as a small addition over the web app's own fetch calls.
class MetNoSource(private val client: HttpClient) {
    companion object {
        private const val BASE_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact"
        private const val USER_AGENT = "TengmoVaderAndroid/1.0 github.com/mtengmo/weather"

        private fun round(value: Double): Double = Math.round(value * 1_000_000) / 1_000_000.0
    }

    @Serializable
    private data class InstantDetails(
        val air_temperature: Double? = null,
        val wind_speed: Double? = null,
        val wind_from_direction: Double? = null,
        val relative_humidity: Double? = null,
        val cloud_area_fraction: Double? = null,
    )

    @Serializable
    private data class SummaryBlock(val symbol_code: String? = null)

    @Serializable
    private data class NextHoursDetails(val precipitation_amount: Double? = null)

    @Serializable
    private data class NextHours(val summary: SummaryBlock? = null, val details: NextHoursDetails? = null)

    @Serializable
    private data class Next6Hours(val summary: SummaryBlock? = null)

    @Serializable
    private data class TimeSeriesData(
        val instant: InstantWrapper? = null,
        val next_1_hours: NextHours? = null,
        val next_6_hours: Next6Hours? = null,
    )

    @Serializable
    private data class InstantWrapper(val details: InstantDetails? = null)

    @Serializable
    private data class TimeSeriesEntry(val time: String, val data: TimeSeriesData)

    @Serializable
    private data class Meta(val updated_at: String? = null)

    @Serializable
    private data class Properties(val meta: Meta? = null, val timeseries: List<TimeSeriesEntry> = emptyList())

    @Serializable
    private data class MetNoResponse(val properties: Properties? = null)

    data class ForecastResult(val observations: List<WeatherObservation>, val issuedAt: String?)

    /** MET Norway's own string symbol code -> WeatherCondition by substring, in the same order as
     *  metNoProvider.ts's `classifyMetNoSymbol` (thunder, fog, sleet, snow, rain, clearsky,
     *  fair/partlycloudy, cloud). "light" gets its own tier; an unprefixed code folds into the
     *  heavy tier. Null for an unrecognized code so callers fall back to threshold classification. */
    fun classifyMetNoSymbol(code: String): WeatherCondition? = when {
        code.contains("thunder") -> WeatherCondition.Thunderstorm
        code.contains("fog") -> WeatherCondition.Foggy
        code.contains("sleet") -> WeatherCondition.Sleet
        code.contains("snow") -> if (code.contains("light")) WeatherCondition.LightSnow else WeatherCondition.HeavySnow
        code.contains("rain") -> if (code.contains("light")) WeatherCondition.LightRain else WeatherCondition.HeavyRain
        code.contains("clearsky") -> if (code.contains("night")) WeatherCondition.ClearNight else WeatherCondition.ClearDay
        code.contains("fair") || code.contains("partlycloudy") -> WeatherCondition.PartlyCloudy
        code.contains("cloud") -> WeatherCondition.Cloudy
        else -> null
    }

    private fun forecastHours(window: ObservationWindow) = when (window) {
        ObservationWindow.Last24Hours -> 24
        ObservationWindow.Last7Days -> 24 * 7
        ObservationWindow.Last30Days -> 0
    }

    /** Forecast-only observations after "now", capped per window (metNoProvider.ts
     *  `getForecastOnly`). MET Norway covers any lat/lon, so there is no coverage gate. */
    suspend fun getForecast(latitude: Double, longitude: Double, window: ObservationWindow): ForecastResult {
        val hours = forecastHours(window)
        if (hours == 0) return ForecastResult(emptyList(), null)
        return runCatching {
            val response: MetNoResponse = client.get(BASE_URL) {
                header("User-Agent", USER_AGENT)
                parameter("lat", round(latitude))
                parameter("lon", round(longitude))
            }.body()
            val props = response.properties
            val series = props?.timeseries.orEmpty()
            if (series.isEmpty()) return@runCatching ForecastResult(emptyList(), null)

            val now = System.currentTimeMillis()
            val observations = series
                .filter { Instant.parse(it.time).toEpochMilli() > now }
                .take(hours)
                .map { entry ->
                    val details = entry.data.instant?.details
                    val symbolCode = entry.data.next_1_hours?.summary?.symbol_code
                        ?: entry.data.next_6_hours?.summary?.symbol_code
                    WeatherObservation(
                        timestamp = entry.time,
                        temperature = details?.air_temperature,
                        precipitation = entry.data.next_1_hours?.details?.precipitation_amount,
                        windSpeed = details?.wind_speed,
                        windDirection = details?.wind_from_direction,
                        cloudCoverPercent = details?.cloud_area_fraction?.toInt(),
                        relativeHumidity = details?.relative_humidity?.toInt(),
                        symbolCondition = symbolCode?.let(::classifyMetNoSymbol),
                        isForecast = true,
                    )
                }
            ForecastResult(observations, props?.meta?.updated_at)
        }.getOrDefault(ForecastResult(emptyList(), null))
    }
}
