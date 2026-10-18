package com.tengmo.vader.work.sync

import com.tengmo.vader.data.model.ObservationWindow
import java.io.IOException
import java.time.Duration
import java.time.Instant
import java.util.Locale

/** A place to consider; [name] optional. */
data class SyncPlace(val latitude: Double, val longitude: Double, val name: String? = null) {
    val key: String get() = SyncPlanner.keyOf(latitude, longitude)
}

data class SyncPlanInputs(
    val selected: SyncPlace?,
    val favorites: List<SyncPlace>,
    /** Widget targets, already resolved ("My location" handled by the caller). */
    val widgetTargets: List<SyncPlace>,
    /** Cache age per place key (see [SyncPlanner.keyOf]); missing or null = nothing cached. */
    val cacheAge: Map<String, Duration?>,
    val now: Instant,
    val isUnmetered: Boolean,
    val hasWidgets: Boolean,
    val mode: SyncMode,
)

object SyncPlanner {
    val SELECTED_MAX_AGE: Duration = Duration.ofMinutes(55)
    val FAVORITE_MAX_AGE: Duration = Duration.ofHours(3)
    const val MAX_JOBS = 11
    const val MAX_RETRY_ATTEMPTS = 3

    fun keyOf(lat: Double, lon: Double): String =
        String.format(Locale.ROOT, "%.3f,%.3f", lat, lon)

    fun periodMinutes(hasWidgets: Boolean): Long = if (hasWidgets) 30L else 60L

    fun plan(inputs: SyncPlanInputs): List<SyncJob> {
        val merged = LinkedHashMap<String, SyncJob>()

        fun add(place: SyncPlace, role: SyncRole, window: ObservationWindow) {
            val key = place.key
            val existing = merged[key]
            merged[key] = if (existing == null) {
                SyncJob(key, place.latitude, place.longitude, place.name, setOf(role), window)
            } else {
                existing.copy(
                    roles = existing.roles + role,
                    window = if (window.ordinal > existing.window.ordinal) window else existing.window,
                    name = existing.name ?: place.name,
                )
            }
        }

        fun stale(place: SyncPlace, max: Duration): Boolean {
            val age = inputs.cacheAge[place.key]
            return age == null || age >= max
        }

        if (inputs.mode == SyncMode.FULL) {
            inputs.selected?.let { if (stale(it, SELECTED_MAX_AGE)) add(it, SyncRole.SELECTED, ObservationWindow.Last7Days) }
            if (inputs.isUnmetered) {
                inputs.favorites.forEach { if (stale(it, FAVORITE_MAX_AGE)) add(it, SyncRole.FAVORITE, ObservationWindow.Last7Days) }
            }
        }
        if (inputs.hasWidgets) {
            inputs.widgetTargets.forEach { add(it, SyncRole.WIDGET, ObservationWindow.Last24Hours) }
        }
        return merged.values.take(MAX_JOBS)
    }

    /** Retry only if the SELECTED place failed with an IOException and attempts remain. */
    fun retryDecision(outcomes: List<SyncOutcome>, runAttemptCount: Int): RetryDecision {
        val selectedIoFailure = outcomes.any {
            SyncRole.SELECTED in it.job.roles && it.error is IOException
        }
        return if (selectedIoFailure && runAttemptCount < MAX_RETRY_ATTEMPTS) RetryDecision.RETRY else RetryDecision.SUCCESS
    }
}
