package com.tengmo.vader.data.source

import com.tengmo.vader.data.model.AreaForecast
import com.tengmo.vader.data.model.CoastalArea
import com.tengmo.vader.data.model.SeaDistrictText
import com.tengmo.vader.data.model.SeaReportRaw
import com.tengmo.vader.data.model.SeaReportTexts
import com.tengmo.vader.data.model.WindText
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull

/** Port of src/services/seaReport.ts (fetch + parse half): SMHI's sjorapport. The text report is
 *  required; the coastline polygons and area forecasts are optional extras. */
class SmhiSeaReportSource(private val client: HttpClient, private val json: Json) {
    companion object {
        const val BASE = "https://wpt-a.smhi.se/backend_seacoast"

        /** Coastal areas have ids below this; larger ids are other (lake/sea) polygons. */
        const val MAX_COASTAL_ID = 200

        private fun JsonElement?.str(): String? =
            (this as? JsonPrimitive)?.takeIf { it.isString }?.contentOrNull?.trim()?.takeIf { it.isNotEmpty() }

        private fun JsonElement?.intIds(): List<Int> =
            (this as? JsonArray).orEmpty().mapNotNull { (it as? JsonPrimitive)?.takeIf { p -> !p.isString }?.intOrNull }

        fun parseTexts(body: JsonElement): SeaReportTexts? {
            val obj = body as? JsonObject ?: return null
            val overview = obj["overview"].str() ?: return null
            val districts = (obj["districts"] as? JsonArray).orEmpty().mapNotNull { d ->
                val o = d as? JsonObject ?: return@mapNotNull null
                val text = o["text"].str() ?: return@mapNotNull null
                SeaDistrictText(o["ids"].intIds(), text)
            }
            return SeaReportTexts(overview, obj["updated"].str(), districts)
        }

        fun parseAreas(body: JsonElement): List<CoastalArea> {
            val features = (body as? JsonObject)?.get("features") as? JsonArray ?: return emptyList()
            return features.mapNotNull { f ->
                val feature = f as? JsonObject ?: return@mapNotNull null
                val props = feature["properties"] as? JsonObject ?: return@mapNotNull null
                val geom = feature["geometry"] as? JsonObject ?: return@mapNotNull null
                val type = (geom["type"] as? JsonPrimitive)?.contentOrNull
                if (type != "Polygon" && type != "MultiPolygon") return@mapNotNull null
                val coordinates = geom["coordinates"] as? JsonArray ?: return@mapNotNull null
                val geometry = parseGeoGeometry(type, coordinates) ?: return@mapNotNull null
                val id = (props["id"] as? JsonPrimitive)?.takeIf { !it.isString }?.intOrNull ?: return@mapNotNull null
                val name = (props["name"] as? JsonPrimitive)?.takeIf { it.isString }?.contentOrNull ?: return@mapNotNull null
                val districts = props["seaDistricts"].intIds()
                if (id >= MAX_COASTAL_ID || districts.isEmpty()) return@mapNotNull null
                CoastalArea(id, name, districts, geometry)
            }
        }

        fun parseForecasts(body: JsonElement): List<AreaForecast> {
            val arr = body as? JsonArray ?: return emptyList()
            return arr.mapNotNull { a ->
                val o = a as? JsonObject ?: return@mapNotNull null
                val id = (o["id"] as? JsonPrimitive)?.takeIf { !it.isString }?.intOrNull ?: return@mapNotNull null
                val overview = o["overview"] as? JsonObject
                val winds = (overview?.get("textsWind") as? JsonArray).orEmpty().mapNotNull { w ->
                    val wo = w as? JsonObject ?: return@mapNotNull null
                    val text = wo["text"].str() ?: return@mapNotNull null
                    WindText(wo["timePrefix"].str(), text)
                }
                AreaForecast(id, o["name"].str() ?: "", overview?.get("textSkyAndTempRange").str(), winds)
            }
        }
    }

    private suspend fun getJson(url: String): JsonElement {
        val res = client.get(url)
        if (res.status.value !in 200..299) error("SMHI sea report: ${res.status.value}")
        return json.parseToJsonElement(res.bodyAsText())
    }

    /** Like runCatching, but a cancelled coroutine stays cancelled instead of becoming a failed Result. */
    private suspend fun attempt(block: suspend () -> JsonElement): Result<JsonElement> =
        try {
            Result.success(block())
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Result.failure(e)
        }

    /** Area forecasts exist in Swedish only, so they are skipped for other languages. */
    suspend fun fetchSeaReport(language: String): SeaReportRaw = coroutineScope {
        val texts = async { attempt { getJson("$BASE/seacomment/texts/$language") } }
        val areas = async { attempt { getJson("$BASE/seadistricts/coastlines-lakes") } }
        val forecasts = async { if (language == "sv") attempt { getJson("$BASE/area-forecast/all") } else null }
        val parsed = texts.await().getOrNull()?.let(::parseTexts) ?: error("SMHI sea report: no text")
        SeaReportRaw(
            texts = parsed,
            areas = areas.await().getOrNull()?.let(::parseAreas).orEmpty(),
            forecasts = forecasts.await()?.getOrNull()?.let(::parseForecasts).orEmpty(),
        )
    }
}
