package com.tengmo.vader.data.source

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import kotlinx.serialization.Serializable

// T017 — direct port of src/services/geocoding.ts's `reverseGeocode`
// (contracts/weather-data-sources.md).
class NominatimSource(private val client: HttpClient) {
    companion object {
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

    /** Used only when a station's own name is unavailable (data-model.md's "Unnamed station"
     *  case). Returns null on any failure so callers fall back to their existing placeholder. */
    suspend fun reverseGeocode(latitude: Double, longitude: Double): String? = runCatching {
        val response: ReverseResponse = client.get(BASE_URL) {
            header("User-Agent", USER_AGENT)
            parameter("lat", latitude)
            parameter("lon", longitude)
            parameter("format", "jsonv2")
        }.body()
        val address = response.address ?: return null
        ADDRESS_FIELD_PREFERENCE.firstNotNullOfOrNull { field ->
            address.field(field)?.trim()?.ifEmpty { null }
        }
    }.getOrNull()
}
