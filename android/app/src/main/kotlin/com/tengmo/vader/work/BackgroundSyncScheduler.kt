package com.tengmo.vader.work

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequest
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.tengmo.vader.work.sync.SyncPlanner
import java.util.concurrent.TimeUnit

/** Schedules the single periodic background sync (replaces the old periodic widget refresh). */
object BackgroundSyncScheduler {
    const val UNIQUE_NAME = "background-sync"
    const val LEGACY_PERIODIC_NAME = "widget-refresh-periodic"
    const val FLEX_MINUTES = 15L
    const val BACKOFF_MINUTES = 10L

    fun constraints(): Constraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .setRequiresBatteryNotLow(true)
        .build()

    fun buildRequest(hasWidgets: Boolean): PeriodicWorkRequest =
        PeriodicWorkRequestBuilder<BackgroundSyncWorker>(
            SyncPlanner.periodMinutes(hasWidgets), TimeUnit.MINUTES,
            FLEX_MINUTES, TimeUnit.MINUTES,
        )
            .setConstraints(constraints())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, BACKOFF_MINUTES, TimeUnit.MINUTES)
            .build()

    /** Idempotent: (re)schedules with the period matching the current widget state. */
    suspend fun reschedule(context: Context) {
        reschedule(context, WidgetSnapshotUpdater(context).hasWidgets())
    }

    fun reschedule(context: Context, hasWidgets: Boolean) {
        val wm = WorkManager.getInstance(context)
        wm.cancelUniqueWork(LEGACY_PERIODIC_NAME)
        wm.enqueueUniquePeriodicWork(UNIQUE_NAME, ExistingPeriodicWorkPolicy.UPDATE, buildRequest(hasWidgets))
    }
}
