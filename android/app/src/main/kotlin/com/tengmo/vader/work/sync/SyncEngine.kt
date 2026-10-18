package com.tengmo.vader.work.sync

import com.tengmo.vader.data.model.ObservationSeries
import java.time.Instant
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withTimeout
import java.io.IOException
import kotlin.coroutines.coroutineContext

/** Removes cached series for places not in the keep set (latitude to longitude). */
interface SeriesPruner {
    suspend fun prune(keep: Collection<Pair<Double, Double>>)
}

/** Invoked for each successfully fetched job (e.g. to build a widget snapshot). Failures are contained. */
fun interface JobSuccessCallback {
    suspend fun onFetched(job: SyncJob, series: ObservationSeries, fetchedAt: Instant)
}

class SyncEngine(
    private val fetcher: SeriesFetcher,
    private val cache: SeriesCache,
    private val pruner: SeriesPruner,
    private val now: () -> Instant = { Instant.now() },
    private val fetchTimeoutMs: Long = FETCH_TIMEOUT_MS,
) {
    /**
     * Fetches every job, saves 7-day (SELECTED/FAVORITE) series to the cache, prunes anything
     * outside [keepForPrune], then runs [postHooks] once with the full report.
     * [onFetched] runs for every successful job (including widget-only ones).
     */
    suspend fun run(
        jobs: List<SyncJob>,
        postHooks: List<PostSyncHook>,
        mode: SyncMode,
        keepForPrune: Collection<SyncPlace>,
        onFetched: JobSuccessCallback? = null,
    ): SyncReport {
        val outcomes = ArrayList<SyncOutcome>(jobs.size)
        for (job in jobs) {
            coroutineContext.ensureActive()
            outcomes += fetchOne(job, onFetched)
        }
        coroutineContext.ensureActive()
        try {
            pruner.prune(keepForPrune.map { it.latitude to it.longitude })
        } catch (e: CancellationException) {
            throw e
        } catch (_: Throwable) {
            // pruning is best effort
        }
        val report = SyncReport(outcomes, mode)
        for (hook in postHooks) {
            try {
                hook.onSyncCompleted(report)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Throwable) {
                // a hook never changes the result
            }
        }
        return report
    }

    private suspend fun fetchOne(job: SyncJob, onFetched: JobSuccessCallback?): SyncOutcome {
        val series = try {
            withTimeout(fetchTimeoutMs) { fetcher.fetch(job) }
        } catch (e: TimeoutCancellationException) {
            return SyncOutcome(job, null, null, IOException("Fetch timed out for ${job.key}", e))
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            return SyncOutcome(job, null, null, e)
        }
        val fetchedAt = now()
        val keepsSeries = SyncRole.SELECTED in job.roles || SyncRole.FAVORITE in job.roles
        if (keepsSeries) {
            try {
                cache.save(job, series, fetchedAt)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                return SyncOutcome(job, null, null, e)
            }
        }
        try {
            onFetched?.onFetched(job, series, fetchedAt)
        } catch (e: CancellationException) {
            throw e
        } catch (_: Throwable) {
        }
        return SyncOutcome(job, series, fetchedAt, null)
    }

    companion object {
        const val FETCH_TIMEOUT_MS = 60_000L
    }
}
