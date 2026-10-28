package com.tengmo.vader.data.source

import com.tengmo.vader.data.model.MarineForecast
import com.tengmo.vader.data.model.MarineHour
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.statement.bodyAsText
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject

/** Port of src/services/seaForecast.ts: hourly Open-Meteo Marine data, 7 days back to 7 ahead,
 *  from the sea cell nearest the point. */
class MarineSource(private val client: HttpClient, private val json: Json) {
    companion object {
        const val MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
        val HOURLY_VARS = listOf(
            "wave_height", "wave_direction", "wave_period", "wind_wave_height", "swell_wave_height",
            "swell_wave_direction", "swell_wave_period", "sea_surface_temperature", "sea_level_height_msl",
            "ocean_current_velocity", "ocean_current_direction",
        )

        fun currentSpeedFactor(unit: String?): Double = when (unit) {
            "km/h" -> 1.0 / 3.6
            "kn" -> 0.5144
            else -> 1.0 // m/s (or unknown)
        }

        /** Pure parser (testable): throws on malformed JSON, tolerates missing series. */
        fun parse(body: String, json: Json): MarineForecast {
            val root = json.parseToJsonElement(body).jsonObject
            val hourly = root["hourly"] as? JsonObject
            val times = (hourly?.get("time") as? JsonArray).orEmpty()
            val units = root["hourly_units"] as? JsonObject
            val speedFactor = currentSpeedFactor((units?.get("ocean_current_velocity") as? JsonPrimitive)?.contentOrNull)

            fun get(name: String, i: Int, scale: Double = 1.0): Double? {
                val el = (hourly?.get(name) as? JsonArray)?.getOrNull(i)
                if (el == null || el is JsonNull || el !is JsonPrimitive || el.isString) return null
                val v = el.doubleOrNull ?: return null
                return if (v.isFinite()) v * scale else null
            }

            val hours = times.mapIndexedNotNull { i, t ->
                val seconds = (t as? JsonPrimitive)?.doubleOrNull ?: return@mapIndexedNotNull null
                MarineHour(
                    time = (seconds * 1000).toLong(),
                    waveHeight = get("wave_height", i),
                    waveDirection = get("wave_direction", i),
                    wavePeriod = get("wave_period", i),
                    windWaveHeight = get("wind_wave_height", i),
                    swellWaveHeight = get("swell_wave_height", i),
                    swellWaveDirection = get("swell_wave_direction", i),
                    swellWavePeriod = get("swell_wave_period", i),
                    seaTemperature = get("sea_surface_temperature", i),
                    seaLevelCm = get("sea_level_height_msl", i, 100.0),
                    currentSpeed = get("ocean_current_velocity", i, speedFactor),
                    currentDirection = get("ocean_current_direction", i),
                )
            }
            return MarineForecast(hours)
        }
    }

    suspend fun fetchMarineForecast(latitude: Double, longitude: Double): MarineForecast {
        val response = client.get(MARINE_URL) {
            parameter("latitude", latitude)
            parameter("longitude", longitude)
            parameter("hourly", HOURLY_VARS.joinToString(","))
            parameter("past_days", 7)
            parameter("forecast_days", 7)
            parameter("timeformat", "unixtime")
            parameter("cell_selection", "sea")
        }
        if (response.status.value !in 200..299) error("Open-Meteo marine: ${response.status.value}")
        return parse(response.bodyAsText(), json)
    }
}
