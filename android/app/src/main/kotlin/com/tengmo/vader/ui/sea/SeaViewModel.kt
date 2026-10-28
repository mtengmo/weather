package com.tengmo.vader.ui.sea

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.tengmo.vader.ServiceLocator
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SeaUiState(
    val data: SeaData = SeaData(),
    val report: SeaReportState = SeaReportState.Loading,
)

/** Sea page state: the marine / observation data and the sjorapport for the shown place. */
class SeaViewModel(application: Application) : AndroidViewModel(application) {
    private val loader = ServiceLocator.get(application).seaLoader

    private val _state = MutableStateFlow(SeaUiState())
    val state: StateFlow<SeaUiState> = _state.asStateFlow()

    private var loadKey: String? = null
    private var loadedAt = 0L
    private var generation = 0
    private var dataJob: Job? = null
    private var reportJob: Job? = null

    /**
     * Loads the sea data for a place. Skipped only while the same place is already shown with fully
     * loaded data younger than the cache TTL; otherwise the loader runs (its caches decide whether
     * that hits the network), so returning to the tab after a while refreshes.
     */
    fun load(lat: Double, lon: Double, force: Boolean = false) {
        val key = SeaLoader.cacheKey(lat, lon)
        val now = System.currentTimeMillis()
        if (!force && isSeaStateFresh(key == loadKey, _state.value, loadedAt, now)) return
        if (key != loadKey) _state.value = SeaUiState()
        loadKey = key
        loadedAt = now
        val gen = ++generation
        dataJob?.cancel()
        reportJob?.cancel()
        dataJob = viewModelScope.launch {
            loader.load(lat, lon, force) { data -> if (gen == generation) _state.update { it.copy(data = data) } }
        }
        reportJob = viewModelScope.launch {
            // Always the Swedish report: SMHI's English text is updated less often (hours older) and is
            // heavily abbreviated, so it is both staler and harder to read than the original.
            val report = loader.loadReport(lat, lon, "sv", force)
            if (gen == generation) _state.update { it.copy(report = report) }
        }
    }
}

/** True when the shown sea state is for the requested place, fully loaded, and younger than the cache TTL. */
internal fun isSeaStateFresh(sameKey: Boolean, state: SeaUiState, loadedAt: Long, now: Long): Boolean =
    sameKey &&
        state.data.marineStatus == SeaSourceStatus.Ready &&
        state.data.observationsStatus == SeaSourceStatus.Ready &&
        state.report is SeaReportState.Ready &&
        now - loadedAt < SeaLoader.TTL_MS
