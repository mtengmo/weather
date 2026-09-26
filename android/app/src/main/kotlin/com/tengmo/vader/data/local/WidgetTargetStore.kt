package com.tengmo.vader.data.local

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.WidgetTarget
import com.tengmo.vader.data.model.WidgetTargetKind
import com.tengmo.vader.data.source.NetworkModule
import kotlinx.coroutines.flow.first

private val Context.widgetTargetDataStore by preferencesDataStore(name = "widget_targets")

/** T062 — per-widget target persistence (favorite/My-location, FR-025), keyed by Android's
 *  AppWidget instance ID (data-model.md "WidgetTarget"). */
class WidgetTargetStore(context: Context) {
    private val dataStore = context.widgetTargetDataStore

    private fun kindKey(widgetId: Int) = stringPreferencesKey("widget_${widgetId}_kind")
    private fun favoriteIdKey(widgetId: Int) = stringPreferencesKey("widget_${widgetId}_favoriteId")
    private fun lastLocationKey(widgetId: Int) = stringPreferencesKey("widget_${widgetId}_lastLocation")
    private fun backgroundGrantedKey(widgetId: Int) = booleanPreferencesKey("widget_${widgetId}_bgGranted")

    suspend fun setTarget(widgetId: Int, target: WidgetTarget) {
        dataStore.edit { prefs ->
            prefs[kindKey(widgetId)] = target.kind.name
            target.favoriteId?.let { prefs[favoriteIdKey(widgetId)] = it }
            target.lastKnownLocation?.let {
                prefs[lastLocationKey(widgetId)] = NetworkModule.json.encodeToString(Location.serializer(), it)
            }
            prefs[backgroundGrantedKey(widgetId)] = target.backgroundLocationGranted
        }
    }

    suspend fun getTarget(widgetId: Int): WidgetTarget? {
        val prefs = dataStore.data.first()
        val kind = prefs[kindKey(widgetId)]?.let { runCatching { WidgetTargetKind.valueOf(it) }.getOrNull() } ?: return null
        return WidgetTarget(
            kind = kind,
            favoriteId = prefs[favoriteIdKey(widgetId)],
            lastKnownLocation = prefs[lastLocationKey(widgetId)]?.let {
                runCatching { NetworkModule.json.decodeFromString(Location.serializer(), it) }.getOrNull()
            },
            backgroundLocationGranted = prefs[backgroundGrantedKey(widgetId)] ?: false,
        )
    }

    suspend fun removeTarget(widgetId: Int) {
        dataStore.edit { prefs ->
            prefs.remove(kindKey(widgetId))
            prefs.remove(favoriteIdKey(widgetId))
            prefs.remove(lastLocationKey(widgetId))
            prefs.remove(backgroundGrantedKey(widgetId))
        }
    }

    /** All widget IDs with a stored target — used by the periodic refresh worker (T067) to know
     *  which widgets to refresh without the OS's own widget-manager APIs being queried each time. */
    suspend fun allWidgetIds(): List<Int> =
        dataStore.data.first().asMap().keys
            .mapNotNull { key ->
                if (!key.name.endsWith("_kind")) return@mapNotNull null
                key.name.removePrefix("widget_").removeSuffix("_kind").toIntOrNull()
            }
}
