package com.tengmo.vader.work.sync

import com.tengmo.vader.data.model.ObservationSeries
import com.tengmo.vader.data.model.ObservationWindow
import java.time.Duration
import java.time.Instant

/** Why a place is being synced. */
enum class SyncRole { SELECTED, FAVORITE, WIDGET }

enum class SyncMode { FULL, WIDGETS }

/** One place to fetch. [key] is the 3-decimal rounded "lat,lon" (Locale.ROOT). */
data class SyncJob(
    val key: String,
    val latitude: Double,
    val longitude: Double,
    val name: String?,
    val roles: Set<SyncRole>,
    val window: ObservationWindow,
)

/** Result for one job. [series] null = fetch failed ([error] says why). */
data class SyncOutcome(
    val job: SyncJob,
    val series: ObservationSeries?,
    val fetchedAt: Instant?,
    val error: Throwable?,
) {
    val succeeded: Boolean get() = series != null && error == null
}

data class SyncReport(val outcomes: List<SyncOutcome>, val mode: SyncMode)

/** Called after a sync run (e.g. to redraw widgets). */
interface PostSyncHook {
    suspend fun onSyncCompleted(report: SyncReport)
}

/** Fetches a series for a job (wraps WeatherRepository.getObservations). */
interface SeriesFetcher {
    suspend fun fetch(job: SyncJob): ObservationSeries
}

/** Cache of previously fetched series. */
interface SeriesCache {
    /** Age of the cached series for [key], null if none. */
    suspend fun ageOf(key: String, now: Instant): Duration?
    suspend fun save(job: SyncJob, series: ObservationSeries, fetchedAt: Instant)
}

enum class RetryDecision { SUCCESS, RETRY }
