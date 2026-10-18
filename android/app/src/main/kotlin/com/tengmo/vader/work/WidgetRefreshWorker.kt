package com.tengmo.vader.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/**
 * One-off, widgets-only refresh (new widget, changed setting, [LocationChangeRefreshTrigger]).
 * The periodic refresh is [BackgroundSyncWorker]; this class stays so already-queued work still
 * finds it. Optional input: a freshly reported position for "My location" widgets.
 */
class WidgetRefreshWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val updater = WidgetSnapshotUpdater(applicationContext)
        if (!updater.hasWidgets()) return Result.success()

        val lat = inputData.getDouble(KEY_LAT, Double.NaN)
        val lon = inputData.getDouble(KEY_LON, Double.NaN)
        val reported = if (lat.isNaN() || lon.isNaN()) null else lat to lon

        return if (updater.refreshAll(reported)) Result.retry() else Result.success()
    }

    companion object {
        const val KEY_LAT = "lat"
        const val KEY_LON = "lon"
    }
}
