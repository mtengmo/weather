package com.tengmo.vader.ui.favorites

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.local.AddFavoriteResult
import com.tengmo.vader.data.model.Favorite
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.LocationSource
import com.tengmo.vader.data.source.OpenMeteoSource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.UUID

/** Which favorites error to show (mirrors the web's favoritesError.* keys). */
enum class FavoritesError { Duplicate, LimitReached }

/** T050 — favorites add (with the 10-item limit message, FR-006), remove, and select
 *  (useFavorites.ts + favoritesStorage.ts). */
class FavoritesViewModel(application: Application) : AndroidViewModel(application) {
    private val services = ServiceLocator.get(application)

    val favorites = services.favoritesStore.favorites

    private val _error = MutableStateFlow<FavoritesError?>(null)
    val error: StateFlow<FavoritesError?> = _error.asStateFlow()

    fun clearError() {
        _error.value = null
    }

    fun add(place: OpenMeteoSource.PlaceCandidate) {
        viewModelScope.launch {
            val favorite = Favorite(
                id = UUID.randomUUID().toString(),
                latitude = place.latitude,
                longitude = place.longitude,
                displayName = place.displayName,
                addedAt = Instant.now().toString(),
            )
            _error.value = when (services.favoritesStore.add(favorite)) {
                AddFavoriteResult.Added -> null
                AddFavoriteResult.Duplicate -> FavoritesError.Duplicate
                AddFavoriteResult.LimitReached -> FavoritesError.LimitReached
            }
        }
    }

    fun remove(favorite: Favorite) {
        viewModelScope.launch { services.favoritesStore.remove(favorite.id) }
    }

    /** Selecting makes the place the app-wide last-viewed location; the Overview picks it up. */
    fun select(location: Location, then: () -> Unit) {
        viewModelScope.launch {
            services.preferencesStore.setLastViewedLocation(location)
            then()
        }
    }

    fun selectCandidate(place: OpenMeteoSource.PlaceCandidate, then: () -> Unit) =
        select(Location(place.latitude, place.longitude, place.displayName, LocationSource.Favorite), then)

    /** "Use current location" — clears the stored place so the Overview re-resolves the device
     *  position (locationSwitcher.useCurrentLocation). */
    fun useCurrentLocation(then: () -> Unit) {
        viewModelScope.launch {
            services.preferencesStore.clearLastViewedLocation()
            then()
        }
    }
}
