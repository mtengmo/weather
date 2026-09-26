package com.tengmo.vader.work

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * T067 support — schedules the periodic widget refresh (research.md §4, FR-029). WorkManager is the
 * OS-friendly way to do periodic background work: it batches with other jobs and respects Doze/
 * battery-saver, which is exactly what keeps the widgets inside the SC-012 battery budget. The
 * 30-minute period (WorkManager's own floor is 15) keeps data comfortably inside SC-010's 90 minutes.
 */
object WidgetRefreshScheduler {
    private const val PERIODIC_NAME = "widget-refresh-periodic"
    private const val ONE_TIME_NAME = "widget-refresh-now"
    private const val PERIOD_MINUTES = 30L

    private val networkConstraint = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    /** Idempotent — safe to call every time a widget is added or the app starts. */
    fun ensureScheduled(context: Context) {
        val request = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(PERIOD_MINUTES, TimeUnit.MINUTES)
            .setConstraints(networkConstraint)
            .build()
        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(PERIODIC_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    /** Called when the last widget is removed — nothing left to keep fresh. */
    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(PERIODIC_NAME)
    }

    /** One refresh right now (a newly added widget, a changed setting, a changed target). */
    fun refreshNow(context: Context) {
        val request = OneTimeWorkRequestBuilder<WidgetRefreshWorker>().setConstraints(networkConstraint).build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork(ONE_TIME_NAME, androidx.work.ExistingWorkPolicy.REPLACE, request)
    }
}
