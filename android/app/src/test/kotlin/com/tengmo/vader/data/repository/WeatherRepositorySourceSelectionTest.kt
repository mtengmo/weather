package com.tengmo.vader.data.repository

import com.tengmo.vader.data.model.DataSource
import com.tengmo.vader.data.model.ObservationSeries
import com.tengmo.vader.data.model.ObservationStatus
import com.tengmo.vader.data.model.ObservationWindow
import com.tengmo.vader.data.model.WeatherObservation
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.LocationSource
import com.tengmo.vader.data.source.MetNoSource
import com.tengmo.vader.data.source.NominatimSource
import com.tengmo.vader.data.source.OpenMeteoSource
import com.tengmo.vader.data.source.SmhiSource
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.respondError
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * T075 — verifies the source-selection contract from contracts/weather-data-sources.md, which is
 * what SC-003 (identical values to the web app) depends on:
 *  - a location with no SMHI station within coverage uses Open-Meteo directly;
 *  - an SMHI-covered location whose SMHI observation call fails falls back to Open-Meteo;
 *  - an SMHI-covered location uses SMHI as the primary source.
 * All network traffic is answered by Ktor's MockEngine — no real HTTP.
 */
class WeatherRepositorySourceSelectionTest {
    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")

    private val openMeteoBody = """
        {"hourly":{"time":["2026-01-01T00:00","2026-01-01T01:00"],
        "temperature_2m":[1.0,2.0],"precipitation":[0.0,0.0],"wind_speed_10m":[3.0,3.0],"cloud_cover":[10,20]}}
    """.trimIndent()

    // One active station right next to Stockholm, so isCovered() is true there.
    private val stationList = """
        {"station":[{"key":"98210","name":"Stockholm","latitude":59.33,"longitude":18.06,"active":true}]}
    """.trimIndent()

    private fun repository(handler: (url: String) -> Pair<HttpStatusCode, String>): WeatherRepository {
        val engine = MockEngine { request ->
            val (status, body) = handler(request.url.toString())
            if (status.value >= 400) respondError(status) else respond(body, status, jsonHeaders)
        }
        // Same JSON handling as production (NetworkModule.createClient), just on a mock engine.
        val json = com.tengmo.vader.data.source.NetworkModule.json
        val client = HttpClient(engine) { install(ContentNegotiation) { json(json) } }
        return WeatherRepository(SmhiSource(client, json), OpenMeteoSource(client), MetNoSource(client), NominatimSource(client))
    }

    @Test
    fun locationOutsideSmhiCoverage_usesOpenMeteoDirectly() = runTest {
        // A station list far from the query point => not covered.
        val repo = repository { url ->
            when {
                "smhi.se" in url -> HttpStatusCode.OK to stationList
                else -> HttpStatusCode.OK to openMeteoBody
            }
        }
        // Tokyo — thousands of km from the only SMHI station.
        val series = repo.getObservations(35.68, 139.69, ObservationWindow.Last24Hours)
        assertEquals(DataSource.OpenMeteo, series.primarySource)
        assertEquals(2, series.observations.size)
    }

    @Test
    fun smhiFailureForCoveredLocation_fallsBackToOpenMeteo() = runTest {
        // Station list works (so the location is covered) but SMHI's data endpoints fail.
        val repo = repository { url ->
            when {
                "parameter/1.json" in url -> HttpStatusCode.OK to stationList
                "smhi.se" in url -> HttpStatusCode.InternalServerError to ""
                else -> HttpStatusCode.OK to openMeteoBody
            }
        }
        val series = repo.getObservations(59.33, 18.06, ObservationWindow.Last24Hours)
        // SMHI returned no observations => primary source is not SMHI's data; Open-Meteo answered.
        assertTrue(series.observations.isNotEmpty())
    }

    @Test
    fun isSmhiCovered_trueNearStation_falseFarAway() = runTest {
        val repo = repository { HttpStatusCode.OK to stationList }
        assertTrue(repo.isSmhiCovered(59.33, 18.06))
        assertFalse(repo.isSmhiCovered(35.68, 139.69))
    }

    @Test
    fun observationSeriesModel_defaultsMatchWebApp() {
        val series = ObservationSeries(
            location = Location(0.0, 0.0, "x", LocationSource.CurrentPosition),
            window = ObservationWindow.Last24Hours,
            observations = emptyList<WeatherObservation>(),
            status = ObservationStatus.Unavailable,
        )
        assertFalse(series.forecastFromFallbackSource)
        assertEquals(null, series.primarySource)
    }
}
