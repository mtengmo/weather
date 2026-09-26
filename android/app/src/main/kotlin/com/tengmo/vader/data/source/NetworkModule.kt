package com.tengmo.vader.data.source

import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

/** Shared Ktor client + JSON config for all four data sources (research.md §5). Lenient/
 *  ignoreUnknownKeys since these are public third-party APIs this app doesn't control the
 *  schema of — a new field they add must never break parsing. */
object NetworkModule {
    val json: Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
    }

    fun createClient(): HttpClient = HttpClient(Android) {
        install(ContentNegotiation) {
            json(json)
        }
    }
}
