package com.tengmo.vader.ui.navigation

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.Location
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/** State + actions for the top-bar location switcher. Uses the same stores as FavoritesViewModel. */
class AppChromeViewModel(application: Application) : AndroidViewModel(application) {
    private val services = ServiceLocator.get(application)

    val selectedPlace: Flow<Location?> = services.preferencesStore.preferences.map { it.lastViewedLocation }
    val favorites = services.favoritesStore.favorites

    fun select(location: Location, then: () -> Unit) {
        viewModelScope.launch {
            services.preferencesStore.setLastViewedLocation(location)
            then()
        }
    }

    /** Clears the stored place so the Overview re-resolves the device position. */
    fun useCurrentLocation(then: () -> Unit) {
        viewModelScope.launch {
            services.preferencesStore.clearLastViewedLocation()
            then()
        }
    }
}
