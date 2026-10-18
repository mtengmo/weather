package com.tengmo.vader.data.local

import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import java.io.File
import java.util.Locale

/**
 * Persistent coordinate -> place-name cache so a place is named over the network at most once per
 * ~30 days. Keys are coordinates rounded to 3 decimals (~100 m, Locale.ROOT) plus the app language,
 * so a language switch re-resolves once and never shows a stale-language name. One atomic JSON
 * file; plain JVM so it is unit-testable (same pattern as [SeriesFileCache]).
 */
class PlaceNameCache(
    private val file: File,
    private val json: Json,
    private val ttlMillis: Long = DEFAULT_TTL_MS,
) {
    @Serializable
    private data class Entry(val name: String, val savedAtEpochMillis: Long)

    private val serializer = MapSerializer(String.serializer(), Entry.serializer())

    /** The cached name, or null when missing, expired or unreadable. */
    @Synchronized
    fun get(latitude: Double, longitude: Double, language: String, nowMillis: Long): String? {
        val entry = readAll()[keyFor(latitude, longitude, language)] ?: return null
        if (nowMillis - entry.savedAtEpochMillis > ttlMillis) return null
        return entry.name.takeIf { it.isNotBlank() }
    }

    /** Stores [name] (ignored when blank). Expired entries are dropped and size is bounded. */
    @Synchronized
    fun put(latitude: Double, longitude: Double, language: String, name: String, nowMillis: Long) {
        val clean = name.trim()
        if (clean.isEmpty()) return
        val all = readAll().filterValues { nowMillis - it.savedAtEpochMillis <= ttlMillis }.toMutableMap()
        all[keyFor(latitude, longitude, language)] = Entry(clean, nowMillis)
        val bounded = if (all.size > MAX_ENTRIES) {
            all.entries.sortedByDescending { it.value.savedAtEpochMillis }.take(MAX_ENTRIES).associate { it.key to it.value }
        } else {
            all
        }
        write(bounded)
    }

    private fun readAll(): Map<String, Entry> {
        if (!file.isFile) return emptyMap()
        return runCatching { json.decodeFromString(serializer, file.readText()) }.getOrDefault(emptyMap())
    }

    private fun write(entries: Map<String, Entry>) {
        file.parentFile?.mkdirs()
        val tmp = File(file.parentFile, file.name + ".tmp")
        tmp.writeText(json.encodeToString(serializer, entries))
        if (!tmp.renameTo(file)) {
            file.delete()
            if (!tmp.renameTo(file)) tmp.delete()
        }
    }

    companion object {
        const val DEFAULT_TTL_MS = 30L * 24 * 60 * 60 * 1000
        private const val MAX_ENTRIES = 200

        fun keyFor(latitude: Double, longitude: Double, language: String): String =
            String.format(Locale.ROOT, "%.3f_%.3f_%s", latitude, longitude, language.lowercase(Locale.ROOT))
    }
}
