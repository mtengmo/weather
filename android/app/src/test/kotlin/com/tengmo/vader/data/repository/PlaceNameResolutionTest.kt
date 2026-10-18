package com.tengmo.vader.data.repository

import com.tengmo.vader.data.local.PlaceNameCache
import com.tengmo.vader.data.model.LocationSource
import com.tengmo.vader.data.source.MetNoSource
import com.tengmo.vader.data.source.NetworkModule
import com.tengmo.vader.data.source.NominatimSource
import com.tengmo.vader.data.source.OpenMeteoSource
import com.tengmo.vader.data.source.SmhiSource
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
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class PlaceNameResolutionTest {
    @get:Rule val tmp = TemporaryFolder()

    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")
    private val stationList = """{"station":[{"key":"98210","name":"Stockholm","latitude":59.33,"longitude":18.06,"active":true}]}"""
    private var nominatimCalls = 0
    private val nominatimUrls = mutableListOf<String>()
    private var clock = 0L

    private fun repo(nominatim: () -> Pair<HttpStatusCode, String>): WeatherRepository {
        val engine = MockEngine { request ->
            val url = request.url.toString()
            if ("nominatim" in url) {
                nominatimCalls++
                nominatimUrls += url
                val (s, b) = nominatim()
                if (s.value >= 400) respondError(s) else respond(b, s, jsonHeaders)
            } else {
                respond(stationList, HttpStatusCode.OK, jsonHeaders)
            }
        }
        val client = HttpClient(engine) { install(ContentNegotiation) { json(NetworkModule.json) } }
        return WeatherRepository(
            SmhiSource(client, NetworkModule.json), OpenMeteoSource(client), MetNoSource(client),
            NominatimSource(client, minIntervalMs = 0, retryBackoffMs = 0),
            PlaceNameCache(File(tmp.root, "names.json"), NetworkModule.json), { clock },
        )
    }

    private fun city(name: String) = HttpStatusCode.OK to "{\"address\":{\"city\":\"$name\"}}"

    @Test fun bothLookupsFail_nameIsBlankNeverPlaceholder() = runTest {
        val r = repo { HttpStatusCode.InternalServerError to "" }
        // Tokyo: outside SMHI coverage, Nominatim down.
        val loc = r.resolveCurrentLocationName(35.68, 139.69, "en")
        assertEquals("", loc.displayName)
        assertEquals(LocationSource.CurrentPosition, loc.source)
        assertEquals(2, nominatimCalls) // initial + one retry
    }

    @Test fun cacheHitAvoidsNetwork() = runTest {
        val r = repo { city("Uppsala") }
        assertEquals("Uppsala", r.resolvePlaceName(59.8430, 17.6310, "sv"))
        assertEquals("Uppsala", r.resolvePlaceName(59.8432, 17.6312, "sv")) // same 3-decimal key
        assertEquals(1, nominatimCalls)
    }

    @Test fun cacheExpiresAfterThirtyDays() = runTest {
        val r = repo { city("Uppsala") }
        r.resolvePlaceName(59.8429, 17.6305, "sv")
        clock += PlaceNameCache.DEFAULT_TTL_MS + 1
        r.resolvePlaceName(59.8429, 17.6305, "sv")
        assertEquals(2, nominatimCalls)
    }

    @Test fun cacheIsKeyedByLanguageAndRequestCarriesIt() = runTest {
        val r = repo { city("Uppsala") }
        r.resolvePlaceName(59.8, 17.6, "sv")
        r.resolvePlaceName(59.8, 17.6, "en")
        assertEquals(2, nominatimCalls)
        assertTrue(nominatimUrls[0].contains("accept-language=sv"))
        assertTrue(nominatimUrls[1].contains("accept-language=en"))
        assertTrue(nominatimUrls[0].contains("zoom=10"))
    }

    private fun addr(fields: String) = HttpStatusCode.OK to "{\"address\":{$fields}}"

    @Test fun addressFieldPriority() = runTest {
        val r = repo { addr("\"county\":\"C\",\"municipality\":\"M\",\"suburb\":\"S\",\"village\":\"V\",\"town\":\"T\"") }
        assertEquals("T", r.resolvePlaceName(1.0, 1.0, "en"))
        val r2 = repo { addr("\"county\":\"C\",\"municipality\":\"M\",\"suburb\":\"S\"") }
        assertEquals("S", r2.resolvePlaceName(2.0, 2.0, "en"))
        val r3 = repo { addr("\"county\":\"C\",\"municipality\":\"M\",\"city\":\"Ci\",\"town\":\"T\"") }
        assertEquals("Ci", r3.resolvePlaceName(3.0, 3.0, "en"))
    }

    @Test fun transientFailureRetriesAndFailedLookupIsNotCached() = runTest {
        var n = 0
        val r = repo { if (n++ == 0) HttpStatusCode.TooManyRequests to "" else city("Lund") }
        assertEquals("Lund", r.resolvePlaceName(55.7, 13.2, "en"))
        assertNull(repo { HttpStatusCode.NotFound to "" }.resolvePlaceName(10.0, 10.0, "en"))
    }
}
