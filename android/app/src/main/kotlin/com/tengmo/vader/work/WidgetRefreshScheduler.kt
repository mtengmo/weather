package com.tengmo.vader.work

import android.content.Context
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * T067 support — schedules the periodic widget refresh (research.md §4, FR-029). WorkManager is the
 * OS-friendly way to do periodic background work: it batches with other jobs and respects Doze/
 * battery-saver, which is exactly what keeps the widgets inside the SC-012 battery budget. The
 * 30-minute period (WorkManager's own floor is 15) keeps data comfortably inside SC-010's 90 minutes.
 */
object WidgetRefreshScheduler {
    private const val ONE_TIME_NAME = "widget-refresh-now"

    private val networkConstraint = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    /** Safe to call whenever a widget is added or the app starts. Widget presence decides the
     *  sync period, so this re-plans the single background sync. */
    fun ensureScheduled(context: Context) = reschedule(context)

    /** Called when the last widget is removed: sync continues at the slower no-widget period. */
    fun cancel(context: Context) = reschedule(context)

    private fun reschedule(context: Context) {
        val app = context.applicationContext
        CoroutineScope(Dispatchers.Default).launch { runCatching { BackgroundSyncScheduler.reschedule(app) } }
    }

    /** One refresh right now (a newly added widget, a changed setting, a changed target). */
    fun refreshNow(context: Context) {
        val request = OneTimeWorkRequestBuilder<WidgetRefreshWorker>().setConstraints(networkConstraint).build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork(ONE_TIME_NAME, androidx.work.ExistingWorkPolicy.REPLACE, request)
    }
}
