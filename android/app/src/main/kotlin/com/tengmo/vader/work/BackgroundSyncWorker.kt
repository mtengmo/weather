package com.tengmo.vader.work

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.work.sync.JobSuccessCallback
import com.tengmo.vader.work.sync.RepositorySeriesFetcher
import com.tengmo.vader.work.sync.RetryDecision
import com.tengmo.vader.work.sync.SnapshotSeriesCache
import com.tengmo.vader.work.sync.SyncEngine
import com.tengmo.vader.work.sync.SyncMode
import com.tengmo.vader.work.sync.SyncPlace
import com.tengmo.vader.work.sync.SyncPlanInputs
import com.tengmo.vader.work.sync.SyncPlanner
import com.tengmo.vader.work.sync.SyncRole
import kotlinx.coroutines.flow.first
import java.time.Instant
import android.util.Log
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.LocationSource
import com.tengmo.vader.location.BackgroundLocationFollower
import com.tengmo.vader.location.LastKnownLocationReader
import com.tengmo.vader.location.LocationFollowPolicy
import com.tengmo.vader.location.haversineMeters
import com.tengmo.vader.location.hasBackgroundLocationPermission

/** The single periodic background sync: plans what is stale, fetches it once, caches it and
 *  feeds widget snapshots from the same fetched series. When opted in, follows the phone's last-known coarse location (never a new GPS fix). */
class BackgroundSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    private companion object {
        const val TAG = "BackgroundSync"
    }

    override suspend fun doWork(): Result {
        val services = ServiceLocator.get(applicationContext)
        val updater = WidgetSnapshotUpdater(applicationContext)
        val now = Instant.now()

        val hasWidgets = updater.hasWidgets()
        val widgets = if (hasWidgets) runCatching { updater.resolveWidgets() }.getOrDefault(emptyList()) else emptyList()
        val prefs = services.preferencesStore.preferences.first()
        val stored = followPhoneLocation(services, prefs.lastViewedLocation, prefs.followLocationInBackground)
        val selected = stored?.let { SyncPlace(it.latitude, it.longitude, it.displayName) }
        val favorites = services.favoritesStore.favorites.first().map { SyncPlace(it.latitude, it.longitude, it.displayName) }
        val widgetPlaces = widgets.map { SyncPlace(it.location.latitude, it.location.longitude, it.location.displayName) }

        val cache = SnapshotSeriesCache(services.snapshotStore)
        val candidates = (listOfNotNull(selected) + favorites + widgetPlaces).distinctBy { it.key }
        val ages = candidates.associate { it.key to cache.ageOf(it.key, now) }

        val jobs = SyncPlanner.plan(
            SyncPlanInputs(
                selected = selected,
                favorites = favorites,
                widgetTargets = widgetPlaces,
                cacheAge = ages,
                now = now,
                isUnmetered = isUnmetered(applicationContext),
                hasWidgets = hasWidgets,
                mode = SyncMode.FULL,
            ),
        )

        Log.d(TAG, "planned ${jobs.size} job(s) for ${candidates.size} place(s), selected=${selected?.key}")
        val engine = SyncEngine(RepositorySeriesFetcher(services.weatherRepository), cache, cache)
        val report = engine.run(
            jobs = jobs,
            postHooks = services.postSyncHooks,
            mode = SyncMode.FULL,
            keepForPrune = listOfNotNull(selected) + favorites,
            onFetched = JobSuccessCallback { job, series, _ ->
                if (SyncRole.WIDGET in job.roles) updater.applySeries(widgets, series)
            },
        )
        if (hasWidgets && jobs.isNotEmpty()) runCatching { updater.redraw() }

        return when (SyncPlanner.retryDecision(report.outcomes, runAttemptCount)) {
            RetryDecision.RETRY -> Result.retry()
            RetryDecision.SUCCESS -> Result.success()
        }
    }

    /** Follows the phone's last-known coarse location when opted in, permitted and the selected
     *  place is the current position. Never requests a fix, so GPS is never started. */
    private suspend fun followPhoneLocation(
        services: ServiceLocator,
        stored: Location?,
        enabled: Boolean,
    ): Location? {
        if (stored == null || stored.source != LocationSource.CurrentPosition) return stored
        if (!enabled) return stored
        if (!hasBackgroundLocationPermission(applicationContext)) {
            Log.d(TAG, "follow: background location not granted, keeping stored place")
            return stored
        }
        val fix = LastKnownLocationReader(applicationContext).read()
        if (fix == null) {
            Log.d(TAG, "follow: no last-known location available")
            return stored
        }
        val distance = haversineMeters(stored.latitude, stored.longitude, fix.latitude, fix.longitude)
        Log.d(TAG, "follow: source=fused-last-known age=${fix.ageMs / 60_000}min accuracy=${fix.accuracyMeters}m moved=${distance.toInt()}m")
        val follower = BackgroundLocationFollower(
            resolveLocation = { lat, lon, lang -> services.weatherRepository.resolveCurrentLocationName(lat, lon, lang) },
            persist = { services.preferencesStore.setLastViewedLocation(it) },
        )
        val moved = follower.follow(stored, fix, services.preferencesStore.effectiveLanguage())
        if (moved != null) Log.d(TAG, "follow: moved >= ${LocationFollowPolicy.MIN_MOVE_M.toInt()}m, now '${moved.displayName}'")
        return moved ?: stored
    }

    private fun isUnmetered(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
        val caps = cm.getNetworkCapabilities(cm.activeNetwork ?: return false) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
    }
}
