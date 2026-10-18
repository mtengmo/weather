package com.tengmo.vader.work.sync

import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.LocationSource
import com.tengmo.vader.data.model.ObservationSeries
import com.tengmo.vader.data.model.ObservationStatus
import com.tengmo.vader.data.model.ObservationWindow
import java.io.IOException
import java.time.Duration
import java.time.Instant
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SyncEngineTest {
    private val t0 = Instant.parse("2026-01-01T10:00:00Z")

    private fun series() = ObservationSeries(
        location = Location(59.0, 18.0, "x", LocationSource.CurrentPosition),
        window = ObservationWindow.Last7Days,
        observations = emptyList(),
        status = ObservationStatus.Unavailable,
    )

    private fun job(n: Int, roles: Set<SyncRole> = setOf(SyncRole.SELECTED), window: ObservationWindow = ObservationWindow.Last7Days) =
        SyncJob(SyncPlanner.keyOf(59.0 + n, 18.0), 59.0 + n, 18.0, "P$n", roles, window)

    private class FakeCache : SeriesCache, SeriesPruner {
        val saved = mutableListOf<String>()
        var pruned: Collection<Pair<Double, Double>>? = null
        override suspend fun ageOf(key: String, now: Instant): Duration? = null
        override suspend fun save(job: SyncJob, series: ObservationSeries, fetchedAt: Instant) { saved += job.key }
        override suspend fun prune(keep: Collection<Pair<Double, Double>>) { pruned = keep }
    }

    private fun engine(cache: FakeCache, timeout: Long = 60_000, fetch: suspend (SyncJob) -> ObservationSeries) =
        SyncEngine(object : SeriesFetcher { override suspend fun fetch(job: SyncJob) = fetch(job) }, cache, cache, { t0 }, timeout)

    @Test fun successfulFetchesAreSaved() = runTest {
        val cache = FakeCache()
        val s = series()
        val report = engine(cache) { s }.run(listOf(job(1), job(2, setOf(SyncRole.FAVORITE))), emptyList(), SyncMode.FULL, emptyList())
        assertEquals(2, cache.saved.size)
        assertTrue(report.outcomes.all { it.succeeded && it.fetchedAt == t0 })
    }

    @Test fun widgetOnlyJobsAreNotSavedButReported() = runTest {
        val cache = FakeCache()
        val seen = mutableListOf<String>()
        val report = engine(cache) { series() }.run(
            listOf(job(1, setOf(SyncRole.WIDGET), ObservationWindow.Last24Hours)), emptyList(), SyncMode.WIDGETS, emptyList(),
        ) { j, _, _ -> seen += j.key }
        assertTrue(cache.saved.isEmpty())
        assertEquals(1, seen.size)
        assertTrue(report.outcomes.single().succeeded)
    }

    @Test fun failureRecordsErrorAndSavesNothing() = runTest {
        val cache = FakeCache()
        val boom = IOException("x")
        val report = engine(cache) { if (it.latitude > 60.5) throw boom else series() }
            .run(listOf(job(1), job(2)), emptyList(), SyncMode.FULL, emptyList())
        assertEquals(listOf(job(1).key), cache.saved)
        assertTrue(report.outcomes[1].error is IOException)
        assertEquals("x", report.outcomes[1].error?.message)
        assertFalse(report.outcomes[1].succeeded)
    }

    @Test fun pruneUsesKeepSet() = runTest {
        val cache = FakeCache()
        engine(cache) { series() }.run(emptyList(), emptyList(), SyncMode.FULL, listOf(SyncPlace(1.0, 2.0), SyncPlace(3.0, 4.0)))
        assertEquals(listOf(1.0 to 2.0, 3.0 to 4.0), cache.pruned!!.toList())
    }

    @Test fun hooksRunOnceWithFullReportAndExceptionsContained() = runTest {
        val cache = FakeCache()
        val reports = mutableListOf<SyncReport>()
        val bad = object : PostSyncHook { override suspend fun onSyncCompleted(report: SyncReport) { throw IllegalStateException("hook") } }
        val good = object : PostSyncHook { override suspend fun onSyncCompleted(report: SyncReport) { reports += report } }
        val report = engine(cache) { series() }.run(listOf(job(1), job(2)), listOf(bad, good), SyncMode.FULL, emptyList())
        assertEquals(1, reports.size)
        assertSame(report, reports[0])
        assertEquals(2, reports[0].outcomes.size)
    }

    @Test fun hookCancellationPropagates() = runTest {
        val hook = object : PostSyncHook { override suspend fun onSyncCompleted(report: SyncReport) { throw CancellationException("c") } }
        assertThrows(CancellationException::class.java) {
            kotlinx.coroutines.runBlocking { engine(FakeCache()) { series() }.run(emptyList(), listOf(hook), SyncMode.FULL, emptyList()) }
        }
    }

    @Test fun cancellationStopsBetweenLocations() = runTest {
        val cache = FakeCache()
        val fetched = mutableListOf<String>()
        val d = async {
            engine(cache) { fetched += it.key; delay(10); series() }
                .run(listOf(job(1), job(2), job(3)), emptyList(), SyncMode.FULL, emptyList())
        }
        runCurrent()
        d.cancel()
        runCurrent()
        assertTrue(d.isCancelled)
        assertEquals(1, fetched.size)
        assertTrue(cache.pruned == null)
    }

    @Test fun timeoutProducesErrorOutcome() = runTest {
        val cache = FakeCache()
        val d = async { engine(cache) { delay(Long.MAX_VALUE); series() }.run(listOf(job(1)), emptyList(), SyncMode.FULL, emptyList()) }
        advanceTimeBy(60_001)
        runCurrent()
        val out = d.await().outcomes.single()
        assertTrue(out.error is IOException)
        assertTrue(cache.saved.isEmpty())
    }
}
