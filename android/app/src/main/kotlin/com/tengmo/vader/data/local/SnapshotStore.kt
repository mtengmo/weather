package com.tengmo.vader.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.tengmo.vader.data.model.CachedWeatherSnapshot
import com.tengmo.vader.data.model.ObservationSeries
import com.tengmo.vader.data.source.NetworkModule
import kotlinx.coroutines.flow.first
import androidx.datastore.preferences.core.booleanPreferencesKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

private val Context.snapshotDataStore by preferencesDataStore(name = "weather_snapshots")

/**
 * T023 — on-device cache of successfully loaded weather (FR-020, FR-029), in two forms:
 *
 *  - the full 7-day [ObservationSeries] per location, so a reopened-offline app can show real
 *    data with a clear "last updated" time instead of an empty screen;
 *  - a compact [CachedWeatherSnapshot] per widget instance, holding just what the two widget sizes
 *    draw (data-model.md "CachedWeatherSnapshot"), so a widget can redraw between refreshes or
 *    offline without touching the network (contracts/widget-app-interface.md).
 */
class SnapshotStore(context: Context) {
    private val dataStore = context.snapshotDataStore

    // --- per-widget snapshot -------------------------------------------------------------------

    private fun widgetKey(widgetId: Int) = stringPreferencesKey("widget_snapshot_$widgetId")

    suspend fun saveWidgetSnapshot(widgetId: Int, snapshot: CachedWeatherSnapshot) {
        dataStore.edit {
            it[widgetKey(widgetId)] = NetworkModule.json.encodeToString(CachedWeatherSnapshot.serializer(), snapshot)
        }
    }

    suspend fun loadWidgetSnapshot(widgetId: Int): CachedWeatherSnapshot? {
        val raw = dataStore.data.first()[widgetKey(widgetId)] ?: return null
        return runCatching {
            NetworkModule.json.decodeFromString(CachedWeatherSnapshot.serializer(), raw)
        }.getOrNull()
    }

    suspend fun removeWidgetSnapshot(widgetId: Int) {
        dataStore.edit { it.remove(widgetKey(widgetId)) }
    }

    // --- full-series cache for offline display -------------------------------------------------
    // Warnings/UV aren't cached: they're SMHI extras that simply show nothing when stale.

    private val seriesCache = SeriesFileCache(File(context.cacheDir, "series"), NetworkModule.json)
    private val migratedKey = booleanPreferencesKey("series_migrated_to_files")

    /** One-time removal of the legacy `series_*` entries from the DataStore. */
    private suspend fun migrateLegacySeries() {
        if (dataStore.data.first()[migratedKey] == true) return
        dataStore.edit { prefs ->
            prefs.asMap().keys.filter { it.name.startsWith("series_") }.forEach { prefs.remove(it) }
            prefs[migratedKey] = true
        }
    }

    suspend fun saveSeries(series: ObservationSeries, loadedAtEpochMillis: Long) {
        migrateLegacySeries()
        withContext(Dispatchers.IO) { seriesCache.save(series, loadedAtEpochMillis) }
    }

    /** The cached series and the time it was loaded, or null when nothing is cached (or unreadable). */
    suspend fun loadSeries(latitude: Double, longitude: Double): Pair<ObservationSeries, Long>? {
        migrateLegacySeries()
        return withContext(Dispatchers.IO) { seriesCache.load(latitude, longitude) }
    }

    /** Drops cached series for every location not in [keep] (latitude to longitude). */
    suspend fun pruneSeries(keep: Collection<Pair<Double, Double>>) {
        val keys = keep.map { SeriesFileCache.keyFor(it.first, it.second) }.toSet()
        withContext(Dispatchers.IO) { seriesCache.prune(keys) }
    }
}
