package com.tengmo.vader.data.local

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.tengmo.vader.data.model.DEFAULT_HIGH_LOW_VISIBLE
import com.tengmo.vader.data.model.DEFAULT_LANGUAGE_PREFERENCE
import com.tengmo.vader.data.model.DEFAULT_NEARBY_STATION_COUNT
import com.tengmo.vader.data.model.DEFAULT_THEME
import com.tengmo.vader.data.model.DEFAULT_UNIT_SYSTEM
import com.tengmo.vader.data.model.LanguagePreference
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.Theme
import com.tengmo.vader.data.model.UnitSystem
import com.tengmo.vader.data.model.UserPreferences
import com.tengmo.vader.data.source.NetworkModule
import kotlinx.coroutines.flow.map

private val Context.preferencesDataStoreInstance by preferencesDataStore(name = "user_preferences")

/** T022 — DataStore-backed settings persistence (FR-006/FR-007), Android counterpart of web's
 *  useThemePreference/useUnitPreference/useLanguagePreference/useNearbyStationCountPreference/
 *  useHighLowVisibilityPreference hooks and the last-viewed-location cache. */
class PreferencesStore(context: Context) {
    private val dataStore = context.preferencesDataStoreInstance

    private object Keys {
        val theme = stringPreferencesKey("theme")
        val unit = stringPreferencesKey("unit")
        val language = stringPreferencesKey("language")
        val nearbyStationCount = intPreferencesKey("nearby_station_count")
        val highLowVisible = booleanPreferencesKey("high_low_visible")
        val lastViewedLocation = stringPreferencesKey("last_viewed_location_json")
    }

    val preferences = dataStore.data.map { prefs ->
        UserPreferences(
            theme = prefs[Keys.theme]?.let { runCatching { Theme.valueOf(it) }.getOrNull() } ?: DEFAULT_THEME,
            unit = prefs[Keys.unit]?.let { runCatching { UnitSystem.valueOf(it) }.getOrNull() } ?: DEFAULT_UNIT_SYSTEM,
            language = prefs[Keys.language]?.let { runCatching { LanguagePreference.valueOf(it) }.getOrNull() }
                ?: DEFAULT_LANGUAGE_PREFERENCE,
            nearbyStationCount = prefs[Keys.nearbyStationCount] ?: DEFAULT_NEARBY_STATION_COUNT,
            highLowVisible = prefs[Keys.highLowVisible] ?: DEFAULT_HIGH_LOW_VISIBLE,
            lastViewedLocation = prefs[Keys.lastViewedLocation]?.let {
                runCatching { NetworkModule.json.decodeFromString(Location.serializer(), it) }.getOrNull()
            },
        )
    }

    suspend fun setTheme(theme: Theme) = dataStore.edit { it[Keys.theme] = theme.name }
    suspend fun setUnit(unit: UnitSystem) = dataStore.edit { it[Keys.unit] = unit.name }
    suspend fun setLanguage(language: LanguagePreference) = dataStore.edit { it[Keys.language] = language.name }
    suspend fun setNearbyStationCount(count: Int) = dataStore.edit { it[Keys.nearbyStationCount] = count }
    suspend fun setHighLowVisible(visible: Boolean) = dataStore.edit { it[Keys.highLowVisible] = visible }
    suspend fun clearLastViewedLocation() = dataStore.edit { it.remove(Keys.lastViewedLocation) }
    suspend fun setLastViewedLocation(location: Location) = dataStore.edit {
        it[Keys.lastViewedLocation] = NetworkModule.json.encodeToString(Location.serializer(), location)
    }
}
