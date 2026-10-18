package com.tengmo.vader.data.local

import com.tengmo.vader.data.model.ObservationSeries
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File
import java.util.Locale

/**
 * One JSON file per location under [dir], written atomically (temp file + rename). Plain JVM so it
 * is unit-testable. Keys are locale-independent (Locale.ROOT, 3 decimals).
 */
class SeriesFileCache(private val dir: File, private val json: Json) {

    @Serializable
    private data class CachedSeries(val loadedAtEpochMillis: Long, val series: ObservationSeries)

    @Synchronized
    fun save(series: ObservationSeries, loadedAtEpochMillis: Long) {
        val key = keyFor(series.location.latitude, series.location.longitude)
        dir.mkdirs()
        val text = json.encodeToString(CachedSeries.serializer(), CachedSeries(loadedAtEpochMillis, series))
        val tmp = File(dir, "$key.json.tmp")
        tmp.writeText(text)
        val target = fileFor(key)
        if (!tmp.renameTo(target)) {
            // Some filesystems refuse to rename over an existing file.
            target.delete()
            if (!tmp.renameTo(target)) {
                tmp.delete()
            }
        }
    }

    /** The cached series and its load time, or null when missing or unreadable. */
    @Synchronized
    fun load(latitude: Double, longitude: Double): Pair<ObservationSeries, Long>? {
        val file = fileFor(keyFor(latitude, longitude))
        if (!file.isFile) return null
        return runCatching {
            val c = json.decodeFromString(CachedSeries.serializer(), file.readText())
            c.series to c.loadedAtEpochMillis
        }.getOrNull()
    }

    @Synchronized
    fun delete(latitude: Double, longitude: Double) {
        fileFor(keyFor(latitude, longitude)).delete()
    }

    /** Deletes every cached file (and stray temp files) whose key is not in [keepKeys]. */
    @Synchronized
    fun prune(keepKeys: Set<String>) {
        val keepNames = keepKeys.map { "$it.json" }.toSet()
        dir.listFiles()?.forEach { f ->
            if (f.isFile && f.name !in keepNames) f.delete()
        }
    }

    private fun fileFor(key: String) = File(dir, "$key.json")

    companion object {
        fun keyFor(latitude: Double, longitude: Double): String =
            String.format(Locale.ROOT, "series_%.3f_%.3f", latitude, longitude)
    }
}
