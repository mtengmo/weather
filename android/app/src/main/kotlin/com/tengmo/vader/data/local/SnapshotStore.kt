package com.tengmo.vader.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.tengmo.vader.data.model.CachedWeatherSnapshot
import com.tengmo.vader.data.model.ObservationSeries
import com.tengmo.vader.data.source.NetworkModule
import kotlinx.coroutines.flow.first
import kotlinx.serialization.Serializable

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

    @Serializable
    private data class CachedSeries(val loadedAtEpochMillis: Long, val series: ObservationSeries)

    private fun seriesKeyFor(latitude: Double, longitude: Double) =
        stringPreferencesKey("series_%.3f_%.3f".format(latitude, longitude))

    suspend fun saveSeries(series: ObservationSeries, loadedAtEpochMillis: Long) {
        val json = NetworkModule.json.encodeToString(
            CachedSeries.serializer(),
            CachedSeries(loadedAtEpochMillis, series),
        )
        dataStore.edit { it[seriesKeyFor(series.location.latitude, series.location.longitude)] = json }
    }

    /** The cached series and the time it was loaded, or null when nothing is cached (or unreadable). */
    suspend fun loadSeries(latitude: Double, longitude: Double): Pair<ObservationSeries, Long>? {
        val raw = dataStore.data.first()[seriesKeyFor(latitude, longitude)] ?: return null
        val cached = runCatching {
            NetworkModule.json.decodeFromString(CachedSeries.serializer(), raw)
        }.getOrNull() ?: return null
        return cached.series to cached.loadedAtEpochMillis
    }
}
