package com.tengmo.vader.ui.sea

import com.tengmo.vader.data.model.SeaReportView
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.advanceUntilIdle
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SeaFreshnessTest {
    private val ready = SeaUiState(
        SeaData(marineStatus = SeaSourceStatus.Ready, observationsStatus = SeaSourceStatus.Ready),
        SeaReportState.Ready(SeaReportView("o", null, null, emptyList(), null)),
    )

    @Test fun freshReadyStateForSamePlaceIsSkipped() {
        assertTrue(isSeaStateFresh(true, ready, loadedAt = 0, now = SeaLoader.TTL_MS - 1))
    }

    @Test fun staleStateReloads() {
        assertFalse(isSeaStateFresh(true, ready, loadedAt = 0, now = SeaLoader.TTL_MS))
    }

    @Test fun otherPlaceOrIncompleteStateReloads() {
        assertFalse(isSeaStateFresh(false, ready, 0, 1))
        assertFalse(isSeaStateFresh(true, ready.copy(report = SeaReportState.Error), 0, 1))
        assertFalse(isSeaStateFresh(true, ready.copy(data = ready.data.copy(marineStatus = SeaSourceStatus.Error)), 0, 1))
        assertFalse(isSeaStateFresh(true, SeaUiState(), 0, 1))
    }

    @Test fun cancelledReportLoadRethrowsInsteadOfReturningError() = runTest {
        val gate = CompletableDeferred<Unit>()
        var result: SeaReportState? = null
        val loader = SeaLoader(
            fetchMarine = { _, _ -> error("unused") },
            fetchObservation = { _, _, _ -> null },
            fetchReport = { gate.await(); error("unreachable") },
        )
        val job = launch { result = loader.loadReport(1.0, 2.0, "sv") }
        advanceUntilIdle()
        job.cancelAndJoin()
        assertTrue(job.isCancelled)
        assertTrue(result == null)
    }
}
