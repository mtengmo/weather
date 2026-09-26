package com.tengmo.vader.ui.favorites

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.source.OpenMeteoSource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class PlaceSearchUiState(
    val query: String = "",
    val results: List<OpenMeteoSource.PlaceCandidate> = emptyList(),
    val isSearching: Boolean = false,
    val hasSearched: Boolean = false,
    val error: Boolean = false,
)

/** T048 — place search against Open-Meteo geocoding (PlaceSearch.tsx), Nordic-preferring order. */
class PlaceSearchViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ServiceLocator.get(application).weatherRepository

    private val _uiState = MutableStateFlow(PlaceSearchUiState())
    val uiState: StateFlow<PlaceSearchUiState> = _uiState.asStateFlow()

    fun setQuery(query: String) {
        _uiState.value = _uiState.value.copy(query = query)
    }

    fun search() {
        val query = _uiState.value.query.trim()
        if (query.isEmpty()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSearching = true, error = false)
            runCatching { repository.searchPlaces(query) }
                .onSuccess { _uiState.value = _uiState.value.copy(results = it, isSearching = false, hasSearched = true) }
                .onFailure { _uiState.value = _uiState.value.copy(isSearching = false, error = true, hasSearched = true) }
        }
    }
}
