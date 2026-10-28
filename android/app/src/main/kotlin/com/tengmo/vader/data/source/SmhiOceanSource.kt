package com.tengmo.vader.data.source

import com.tengmo.vader.data.model.SeaMetric
import com.tengmo.vader.data.model.SeaObservation
import com.tengmo.vader.data.model.SeaPoint
import com.tengmo.vader.data.model.SeaStation
import com.tengmo.vader.location.haversineMeters
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.longOrNull

/** Port of src/services/seaObservations.ts: SMHI oceanographic observations (water level, wave
 *  height, sea temperature) from the nearest active station that actually reports data. */
class SmhiOceanSource(private val client: HttpClient, private val json: Json) {
    companion object {
        const val BASE_URL = "https://opendata-download-ocobs.smhi.se/api/version/latest/parameter"
        const val SEA_WEATHER_URL = "https://www.smhi.se/vader/vader-till-havs/hav--och-kustvader"

        /** How many of the nearest stations to try before giving up (some "active" stations have no data). */
        const val MAX_STATIONS_TRIED = 5

        val SEA_METRICS = listOf(SeaMetric.WaterLevel, SeaMetric.WaveHeight, SeaMetric.SeaTemperature)

        private val POSITION = Regex("""Latitud:\s*(-?[\d.]+)\s*Longitud:\s*(-?[\d.]+)""")

        /** Active stations with a position, nearest first; the name is the part after " - ". */
        fun stationsByDistance(stations: JsonArray, latitude: Double, longitude: Double): List<SeaStation> =
            stations.mapNotNull { el ->
                val s = el as? JsonObject ?: return@mapNotNull null
                if ((s["active"] as? JsonPrimitive)?.booleanOrNull == false) return@mapNotNull null
                val key = (s["key"] as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null
                val title = (s["title"] as? JsonPrimitive)?.contentOrNull ?: ""
                val summary = (s["summary"] as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null
                val m = POSITION.find(summary) ?: return@mapNotNull null
                val lat = m.groupValues[1].toDoubleOrNull() ?: return@mapNotNull null
                val lon = m.groupValues[2].toDoubleOrNull() ?: return@mapNotNull null
                val name = title.split(" - ").drop(1).joinToString(" - ").ifEmpty { title }
                SeaStation(key, name, haversineMeters(latitude, longitude, lat, lon) / 1000.0)
            }.sortedBy { it.distanceKm }

        /** How far back the corrected archive is read; matches the 7-day window of the sea view. */
        const val ARCHIVE_DAYS = 7

        private val ARCHIVE_LINE = Regex("""^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d);([^;]*)""")

        /** Hourly points from SMHI's corrected-archive CSV (UTC, `YYYY-MM-DD HH:MM:SS;value;quality;depth`)
         *  at or after [since]. The file is chronological and covers years, so it is scanned from the end. */
        fun parseArchiveCsv(csv: String, since: Long): List<SeaPoint> {
            val lines = csv.split("\n")
            val points = ArrayList<SeaPoint>()
            for (i in lines.indices.reversed()) {
                val m = ARCHIVE_LINE.find(lines[i].trimEnd('\r')) ?: continue
                val g = m.groupValues
                val time = java.time.LocalDateTime.of(
                    g[1].toInt(), g[2].toInt(), g[3].toInt(), g[4].toInt(), g[5].toInt(), g[6].toInt(),
                ).toInstant(java.time.ZoneOffset.UTC).toEpochMilli()
                if (time < since) break
                val value = g[7].trim().toDoubleOrNull()
                if (value != null && value.isFinite()) points.add(SeaPoint(time, value))
            }
            return points.reversed()
        }

        /** Readings of a `latest-day/data.json` body; non-numeric values are dropped. */
        fun parsePoints(body: String, json: Json): List<SeaPoint> {
            val values = json.parseToJsonElement(body).jsonObject["value"] as? JsonArray ?: return emptyList()
            return values.mapNotNull { el ->
                val v = el as? JsonObject ?: return@mapNotNull null
                val time = (v["date"] as? JsonPrimitive)?.longOrNull ?: return@mapNotNull null
                val value = (v["value"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
                if (value.isFinite()) SeaPoint(time, value) else null
            }
        }
    }

    /** Latest-day readings from the nearest station with data for a metric; null if none reports. */
    suspend fun fetchSeaObservation(metric: SeaMetric, latitude: Double, longitude: Double): SeaObservation? {
        val parameter = metric.parameter
        val listRes = client.get("$BASE_URL/$parameter.json")
        if (listRes.status.value !in 200..299) error("SMHI sea stations: ${listRes.status.value}")
        val stations = json.parseToJsonElement(listRes.bodyAsText()).jsonObject["station"] as? JsonArray ?: JsonArray(emptyList())
        val candidates = stationsByDistance(stations, latitude, longitude).take(MAX_STATIONS_TRIED)

        for (station in candidates) {
            val dataRes = client.get("$BASE_URL/$parameter/station/${station.key}/period/latest-day/data.json")
            if (dataRes.status.value !in 200..299) continue
            val points = parsePoints(dataRes.bodyAsText(), json)
            if (points.isEmpty()) continue
            val archive = fetchArchivePoints(parameter, station.key, points.minOf { it.time })
            return SeaObservation(metric, station, archive + points)
        }
        return null
    }

    /** Archive readings (checked, but about a day behind) preceding the live ones. Best effort: any failure gives none. */
    private suspend fun fetchArchivePoints(parameter: Int, stationKey: String, before: Long): List<SeaPoint> = try {
        val res = client.get("$BASE_URL/$parameter/station/$stationKey/period/corrected-archive/data.csv")
        if (res.status.value !in 200..299) emptyList()
        else parseArchiveCsv(res.bodyAsText(), System.currentTimeMillis() - ARCHIVE_DAYS * 86_400_000L).filter { it.time < before }
    } catch (e: kotlinx.coroutines.CancellationException) {
        throw e
    } catch (_: Exception) {
        emptyList()
    }
}
