package com.tengmo.vader.work

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf

/**
 * T068 / FR-026 / research.md §4 — the refresh fired when the phone has moved noticeably: hands the
 * newly reported position to a one-off [WidgetRefreshWorker], which re-resolves the place name and
 * weather of every "My location" widget. Runs as soon as WorkManager can (network required), which
 * is well inside SC-011's 30-minute target. (Not "expedited": that needs a foreground-service
 * notification on Android < 12, which a weather widget has no reason to show.)
 */
object LocationChangeRefreshTrigger {
    private const val NAME = "widget-refresh-location-change"

    fun enqueue(context: Context, latitude: Double, longitude: Double) {
        val request = OneTimeWorkRequestBuilder<WidgetRefreshWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setInputData(workDataOf(WidgetRefreshWorker.KEY_LAT to latitude, WidgetRefreshWorker.KEY_LON to longitude))
            .build()
        // REPLACE: only the newest position matters if several arrive close together.
        WorkManager.getInstance(context).enqueueUniqueWork(NAME, ExistingWorkPolicy.REPLACE, request)
    }
}
