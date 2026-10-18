package com.tengmo.vader.data.source

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import android.util.Log
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable

// T017 — direct port of src/services/geocoding.ts's `reverseGeocode`
// (contracts/weather-data-sources.md).
class NominatimSource(
    private val client: HttpClient,
    private val minIntervalMs: Long = 1_100,
    private val retryBackoffMs: Long = 800,
) {
    companion object {
        private const val TAG = "Nominatim"
        private const val MAX_ATTEMPTS = 2
        private const val BASE_URL = "https://nominatim.openstreetmap.org/reverse"
        private const val USER_AGENT =
            "vader.tengmo.com weather-history-app (reverse geocoding for unnamed stations)"
        private val ADDRESS_FIELD_PREFERENCE =
            listOf("city", "town", "village", "suburb", "municipality", "county")
    }

    @Serializable
    private data class Address(
        val city: String? = null,
        val town: String? = null,
        val village: String? = null,
        val suburb: String? = null,
        val municipality: String? = null,
        val county: String? = null,
    ) {
        fun field(name: String): String? = when (name) {
            "city" -> city
            "town" -> town
            "village" -> village
            "suburb" -> suburb
            "municipality" -> municipality
            "county" -> county
            else -> null
        }
    }

    @Serializable
    private data class ReverseResponse(val address: Address? = null)

    private val gate = Mutex()
    private var lastRequestAtNanos = 0L

    /** Reverse-geocodes to a city-level name in [language] (sv/en). Returns null when no name
     *  exists or the lookup failed (failures are logged, one retry after a short backoff).
     *  Requests are spaced >= [minIntervalMs] apart to respect Nominatim's 1 req/s policy. */
    suspend fun reverseGeocode(latitude: Double, longitude: Double, language: String = "en"): String? {
        repeat(MAX_ATTEMPTS) { attempt ->
            try {
                val response = throttled {
                    client.get(BASE_URL) {
                        header("User-Agent", USER_AGENT)
                        parameter("lat", latitude)
                        parameter("lon", longitude)
                        parameter("format", "jsonv2")
                        parameter("zoom", 10)
                        parameter("accept-language", language)
                    }
                }
                val code = response.status.value
                if (code == 429 || code >= 500) {
                    logWarn("reverse geocode HTTP $code (attempt ${attempt + 1})")
                } else if (code !in 200..299) {
                    logWarn("reverse geocode HTTP $code, giving up")
                    return null
                } else {
                    val body: ReverseResponse = response.body()
                    return body.address?.let { pickName(it) }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                logWarn("reverse geocode failed (attempt ${attempt + 1}): ${e.javaClass.simpleName} ${e.message}")
            }
            if (attempt < MAX_ATTEMPTS - 1) delay(retryBackoffMs)
        }
        return null
    }

    private fun pickName(address: Address): String? =
        ADDRESS_FIELD_PREFERENCE.firstNotNullOfOrNull { field -> address.field(field)?.trim()?.ifEmpty { null } }

    private suspend fun <T> throttled(block: suspend () -> T): T = gate.withLock {
        if (minIntervalMs > 0) {
            val waitMs = minIntervalMs - (System.nanoTime() - lastRequestAtNanos) / 1_000_000
            if (lastRequestAtNanos != 0L && waitMs > 0) delay(waitMs)
        }
        try {
            block()
        } finally {
            lastRequestAtNanos = System.nanoTime()
        }
    }

    private fun logWarn(message: String) {
        try {
            Log.w(TAG, message)
        } catch (_: Throwable) {
            // android.util.Log is not mocked in plain JVM unit tests
        }
    }
}
