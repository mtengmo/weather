package com.tengmo.vader.data.source

import com.tengmo.vader.data.model.SeaMetric
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.respondError
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class SeaSourcesTest {
    private val json = NetworkModule.json
    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")

    private fun client(requests: MutableList<String> = java.util.Collections.synchronizedList(mutableListOf()), handler: (String) -> Pair<HttpStatusCode, String>): HttpClient {
        val engine = MockEngine { request ->
            val url = request.url.toString()
            requests += url
            val (status, body) = handler(url)
            if (status.value >= 400) respondError(status) else respond(body, status, jsonHeaders)
        }
        return HttpClient(engine) { install(ContentNegotiation) { json(json) } }
    }

    // --- Marine ---------------------------------------------------------------------------------

    @Test
    fun marine_requestsParamsAndScalesValues() = runTest {
        val requests = java.util.Collections.synchronizedList(mutableListOf<String>())
        val body = """{"hourly_units":{"ocean_current_velocity":"km/h"},
            "hourly":{"time":[1700000000,1700003600],"wave_height":[1.5,null],"sea_level_height_msl":[0.12,0.2],
            "ocean_current_velocity":[3.6,7.2],"wave_period":[5.0,"x"]}}"""
        val result = MarineSource(client(requests) { HttpStatusCode.OK to body }, json).fetchMarineForecast(59.3, 18.0)
        val url = requests.single()
        assertTrue(url.startsWith("https://marine-api.open-meteo.com/v1/marine"))
        for (p in listOf("past_days=7", "forecast_days=7", "timeformat=unixtime", "cell_selection=sea", "latitude=59.3")) {
            assertTrue("$p in $url", url.contains(p))
        }
        assertTrue(url.contains("sea_surface_temperature"))
        assertEquals(2, result.hours.size)
        assertEquals(1_700_000_000_000L, result.hours[0].time)
        assertEquals(1.5, result.hours[0].waveHeight!!, 1e-9)
        assertNull(result.hours[1].waveHeight)
        assertNull(result.hours[1].wavePeriod)
        assertEquals(12.0, result.hours[0].seaLevelCm!!, 1e-9)
        assertEquals(1.0, result.hours[0].currentSpeed!!, 1e-9)
        assertEquals(2.0, result.hours[1].currentSpeed!!, 1e-9)
        assertNull(result.hours[0].swellWaveHeight)
    }

    @Test
    fun marine_knotsFactorAndErrors() = runTest {
        assertEquals(0.5144, MarineSource.currentSpeedFactor("kn"), 1e-9)
        assertEquals(1.0, MarineSource.currentSpeedFactor("m/s"), 1e-9)
        assertEquals(1.0, MarineSource.currentSpeedFactor(null), 1e-9)
        try {
            MarineSource(client { HttpStatusCode.InternalServerError to "" }, json).fetchMarineForecast(1.0, 2.0)
            fail("expected error")
        } catch (_: IllegalStateException) {
        }
    }

    // --- SMHI ocean observations ----------------------------------------------------------------

    private val stationList = """{"station":[
        {"key":"1","title":"Far - Faraway","summary":"Latitud: 65.0 Longitud: 20.0","active":true},
        {"key":"2","title":"Sthlm - Stockholm - Djurgarden","summary":"Latitud: 59.32 Longitud: 18.08","active":true},
        {"key":"3","title":"Inactive - Near","summary":"Latitud: 59.33 Longitud: 18.07","active":false},
        {"key":"4","title":"Nopos - X","summary":"no position","active":true},
        {"key":"5","title":"Second - Second","summary":"Latitud: 59.5 Longitud: 18.3","active":true}]}"""

    @Test
    fun ocean_stationsByDistanceSkipsInactiveAndNamesAfterDash() {
        val arr = (json.parseToJsonElement(stationList) as JsonObject)["station"] as JsonArray
        val result = SmhiOceanSource.stationsByDistance(arr, 59.33, 18.07)
        assertEquals(listOf("2", "5", "1"), result.map { it.key })
        assertEquals("Stockholm - Djurgarden", result[0].name)
        assertTrue(result[0].distanceKm < 2.0)
    }

    @Test
    fun ocean_triesNextStationAndDropsNonNumeric() = runTest {
        val requests = java.util.Collections.synchronizedList(mutableListOf<String>())
        val c = client(requests) { url ->
            when {
                url.endsWith("/12.json") -> HttpStatusCode.OK to stationList
                url.contains("/station/2/") -> HttpStatusCode.OK to """{"value":[]}"""
                url.contains("/station/5/") ->
                    HttpStatusCode.OK to """{"value":[{"date":1000,"value":"3.5"},{"date":2000,"value":"abc"},{"date":3000,"value":4}]}"""
                else -> HttpStatusCode.NotFound to ""
            }
        }
        val obs = SmhiOceanSource(c, json).fetchSeaObservation(SeaMetric.WaterLevel, 59.33, 18.07)
        assertNotNull(obs)
        assertEquals("5", obs!!.station.key)
        assertEquals(listOf(1000L to 3.5, 3000L to 4.0), obs.points.map { it.time to it.value })
        assertTrue(requests.any { it.contains("/parameter/12/station/2/period/latest-day/data.json") })
    }

    private fun archiveCsv(vararg rows: Pair<Long, String>): String {
        val fmt = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(java.time.ZoneOffset.UTC)
        return "Stationsnamn;x\nDatum;Varde;Kvalitet;Djup\n" +
            rows.joinToString("\n") { (t, v) -> "${fmt.format(java.time.Instant.ofEpochMilli(t))};$v;G;0.0" } + "\n"
    }

    @Test
    fun ocean_parseArchiveCsvKeepsRecentNumericRows() {
        val csv = "header;line\n2020-01-01 00:00:00;1.0;G;0\n2026-10-27 10:00:00;2.5;G;0\n" +
            "2026-10-27 11:00:00;;G;0\n2026-10-27 12:00:00;abc;G;0\n2026-10-27 13:00:00;3.5;G;0\n"
        val since = java.time.Instant.parse("2026-10-27T00:00:00Z").toEpochMilli()
        val pts = SmhiOceanSource.parseArchiveCsv(csv, since)
        assertEquals(listOf(2.5, 3.5), pts.map { it.value })
        assertEquals(java.time.Instant.parse("2026-10-27T10:00:00Z").toEpochMilli(), pts[0].time)
    }

    @Test
    fun ocean_prependsArchiveOlderThanLive() = runTest {
        val now = System.currentTimeMillis()
        val live = (now - 3_600_000L) / 1000 * 1000 // CSV has second resolution
        val c = client { url ->
            when {
                url.endsWith("/12.json") -> HttpStatusCode.OK to stationList
                url.contains("/station/2/period/latest-day") -> HttpStatusCode.OK to """{"value":[{"date":$live,"value":"4"}]}"""
                url.contains("/station/2/period/corrected-archive/data.csv") ->
                    HttpStatusCode.OK to archiveCsv(now - 3 * 86_400_000L to "1.5", now - 2 * 86_400_000L to "2.5", live to "9", live + 1000 to "9")
                else -> HttpStatusCode.NotFound to ""
            }
        }
        val obs = SmhiOceanSource(c, json).fetchSeaObservation(SeaMetric.WaterLevel, 59.33, 18.07)!!
        assertEquals(listOf(1.5, 2.5, 4.0), obs.points.map { it.value })
    }

    @Test
    fun ocean_archiveFailureStillReturnsLiveData() = runTest {
        val c = client { url ->
            when {
                url.endsWith("/12.json") -> HttpStatusCode.OK to stationList
                url.contains("/station/2/period/latest-day") -> HttpStatusCode.OK to """{"value":[{"date":5000,"value":"4"}]}"""
                else -> HttpStatusCode.InternalServerError to ""
            }
        }
        val obs = SmhiOceanSource(c, json).fetchSeaObservation(SeaMetric.WaterLevel, 59.33, 18.07)!!
        assertEquals(listOf(4.0), obs.points.map { it.value })
    }

    @Test
    fun ocean_nullWhenNoStationHasDataAndStationListErrorThrows() = runTest {
        val c = client { url ->
            if (url.endsWith("/1.json")) HttpStatusCode.OK to stationList else HttpStatusCode.NotFound to ""
        }
        assertNull(SmhiOceanSource(c, json).fetchSeaObservation(SeaMetric.WaveHeight, 59.33, 18.07))
        try {
            SmhiOceanSource(client { HttpStatusCode.BadGateway to "" }, json).fetchSeaObservation(SeaMetric.SeaTemperature, 1.0, 1.0)
            fail("expected error")
        } catch (_: IllegalStateException) {
        }
    }

    // --- SMHI sea report ------------------------------------------------------------------------

    private val texts = """{"overview":" Stormy ","updated":"2026-10-28T08:00:00Z",
        "districts":[{"ids":[1,2],"text":"North text"},{"ids":[9],"text":"Other"},{"ids":[1],"text":""}]}"""
    private val areas = """{"features":[
        {"properties":{"id":5,"name":"Stockholms skargard","seaDistricts":[1]},
         "geometry":{"type":"Polygon","coordinates":[[[17,59],[19,59],[19,60],[17,60],[17,59]]]}},
        {"properties":{"id":250,"name":"Lake","seaDistricts":[1]},
         "geometry":{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}}]}"""
    private val forecasts =
        """[{"id":5,"name":"Skargard","overview":{"textSkyAndTempRange":"Mulet","textsWind":[{"timePrefix":"Idag","text":"SV 8"},{"text":"  "}]}}]"""

    @Test
    fun report_parsesAllParts() = runTest {
        val c = client { url ->
            when {
                url.endsWith("/seacomment/texts/sv") -> HttpStatusCode.OK to texts
                url.endsWith("/coastlines-lakes") -> HttpStatusCode.OK to areas
                url.endsWith("/area-forecast/all") -> HttpStatusCode.OK to forecasts
                else -> HttpStatusCode.NotFound to ""
            }
        }
        val raw = SmhiSeaReportSource(c, json).fetchSeaReport("sv")
        assertEquals("Stormy", raw.texts.overview)
        assertEquals(2, raw.texts.districts.size) // the empty-text district is dropped
        assertEquals(listOf(5), raw.areas.map { it.id }) // id >= 200 excluded
        assertEquals("Mulet", raw.forecasts.single().sky)
        assertEquals(1, raw.forecasts.single().winds.size)
        assertEquals("Idag", raw.forecasts.single().winds[0].prefix)
    }

    @Test
    fun report_optionalPartsMayFailButTextsAreRequired() = runTest {
        val onlyTexts = client { url ->
            if (url.contains("/seacomment/texts/en")) HttpStatusCode.OK to texts else HttpStatusCode.InternalServerError to ""
        }
        val raw = SmhiSeaReportSource(onlyTexts, json).fetchSeaReport("en")
        assertTrue(raw.areas.isEmpty())
        assertTrue(raw.forecasts.isEmpty())

        val requests = java.util.Collections.synchronizedList(mutableListOf<String>())
        val noTexts = client(requests) { HttpStatusCode.InternalServerError to "" }
        try {
            SmhiSeaReportSource(noTexts, json).fetchSeaReport("en")
            fail("expected error")
        } catch (_: IllegalStateException) {
        }
        assertTrue("forecast not requested for en", requests.none { it.contains("area-forecast") })
    }
}
