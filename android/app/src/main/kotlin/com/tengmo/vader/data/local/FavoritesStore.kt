package com.tengmo.vader.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.tengmo.vader.data.model.FAVORITES_LIMIT
import com.tengmo.vader.data.model.Favorite
import com.tengmo.vader.data.source.NetworkModule
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.builtins.ListSerializer

private val Context.favoritesDataStore by preferencesDataStore(name = "favorites")

sealed class AddFavoriteResult {
    data object Added : AddFavoriteResult()
    data object Duplicate : AddFavoriteResult()
    data object LimitReached : AddFavoriteResult()
}

/** T021 — DataStore-backed favorites persistence (max [FAVORITES_LIMIT], FR-006/FR-007), the
 *  Android counterpart of src/services/favoritesStorage.ts. */
class FavoritesStore(context: Context) {
    private val dataStore = context.favoritesDataStore
    private val key = stringPreferencesKey("favorites_json")
    private val serializer = ListSerializer(Favorite.serializer())

    val favorites = dataStore.data.map { prefs ->
        prefs[key]?.let { json ->
            runCatching { NetworkModule.json.decodeFromString(serializer, json) }.getOrDefault(emptyList())
        } ?: emptyList()
    }

    suspend fun add(favorite: Favorite): AddFavoriteResult {
        var result: AddFavoriteResult = AddFavoriteResult.Added
        dataStore.edit { prefs ->
            val current = prefs[key]?.let {
                runCatching { NetworkModule.json.decodeFromString(serializer, it) }.getOrDefault(emptyList())
            } ?: emptyList()

            if (current.any { it.latitude == favorite.latitude && it.longitude == favorite.longitude }) {
                result = AddFavoriteResult.Duplicate
                return@edit
            }
            if (current.size >= FAVORITES_LIMIT) {
                result = AddFavoriteResult.LimitReached
                return@edit
            }
            prefs[key] = NetworkModule.json.encodeToString(serializer, current + favorite)
        }
        return result
    }

    suspend fun remove(favoriteId: String) {
        dataStore.edit { prefs ->
            val current = prefs[key]?.let {
                runCatching { NetworkModule.json.decodeFromString(serializer, it) }.getOrDefault(emptyList())
            } ?: emptyList()
            prefs[key] = NetworkModule.json.encodeToString(serializer, current.filterNot { it.id == favoriteId })
        }
    }
}
