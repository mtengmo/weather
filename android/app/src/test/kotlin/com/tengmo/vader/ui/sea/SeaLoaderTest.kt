package com.tengmo.vader.ui.sea

import com.tengmo.vader.data.model.MarineForecast
import com.tengmo.vader.data.model.MarineHour
import com.tengmo.vader.data.model.SeaMetric
import com.tengmo.vader.data.model.SeaObservation
import com.tengmo.vader.data.model.SeaPoint
import com.tengmo.vader.data.model.SeaReportRaw
import com.tengmo.vader.data.model.SeaReportTexts
import com.tengmo.vader.data.model.SeaStation
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SeaLoaderTest {
    private var now = 1_000_000L
    private var marineCalls = 0
    private var obsCalls = 0
    private var reportCalls = 0
    private var marineFails = false
    private var allObsFail = false
    private val reportLanguages = mutableListOf<String>()

    private val station = SeaStation("1", "Stn", 2.0)

    private fun loader(
        marineGate: CompletableDeferred<Unit>? = null,
        obsGate: CompletableDeferred<Unit>? = null,
    ) = SeaLoader(
        fetchMarine = { _, _ ->
            marineCalls++
            marineGate?.await()
            if (marineFails) error("marine down")
            MarineForecast(listOf(MarineHour(1L, waveHeight = 1.0)))
        },
        fetchObservation = { metric, _, _ ->
            obsCalls++
            obsGate?.await()
            if (allObsFail) error("smhi down")
            SeaObservation(metric, station, listOf(SeaPoint(1L, 2.0)))
        },
        fetchReport = { lang ->
            reportCalls++
            reportLanguages += lang
            SeaReportRaw(SeaReportTexts("Overview", null, emptyList()), emptyList(), emptyList())
        },
        clock = { now },
    )

    @Test fun publishesLoadingThenEachSourceAsItArrives() = runTest {
        val marineGate = CompletableDeferred<Unit>()
        val obsGate = CompletableDeferred<Unit>()
        val l = loader(marineGate, obsGate)
        val published = mutableListOf<SeaData>()
        val job = launch { l.load(59.0, 18.0) { published += it } }
        advanceUntilIdle()
        assertEquals(1, published.size)
        assertEquals(SeaSourceStatus.Loading, published[0].marineStatus)

        obsGate.complete(Unit)
        advanceUntilIdle()
        val afterObs = published.last()
        assertEquals(SeaSourceStatus.Loading, afterObs.marineStatus) // marine still pending
        assertEquals(SeaSourceStatus.Ready, afterObs.observationsStatus)
        assertEquals(3, afterObs.observations.size)

        marineGate.complete(Unit)
        advanceUntilIdle()
        job.join()
        val last = published.last()
        assertEquals(SeaSourceStatus.Ready, last.marineStatus)
        assertEquals(1, last.marineHours.size)
    }

    @Test fun cachesFullySuccessfulResultsForTenMinutesPerRoundedPosition() = runTest {
        val l = loader()
        l.load(59.00001, 18.00002) { }
        assertEquals(1, marineCalls)
        now += SeaLoader.TTL_MS - 1
        val cachedPublish = mutableListOf<SeaData>()
        l.load(59.00004, 18.00001) { cachedPublish += it } // same 3-decimal key
        assertEquals(1, marineCalls)
        assertEquals(1, cachedPublish.size)
        assertEquals(SeaSourceStatus.Ready, cachedPublish[0].marineStatus)
        now += 2
        l.load(59.0, 18.0) { }
        assertEquals(2, marineCalls)
        l.load(60.0, 18.0) { }
        assertEquals(3, marineCalls)
    }

    @Test fun failedSourceIsNotCachedAndMarksError() = runTest {
        val l = loader()
        marineFails = true
        val published = mutableListOf<SeaData>()
        l.load(59.0, 18.0) { published += it }
        assertEquals(SeaSourceStatus.Error, published.last().marineStatus)
        assertEquals(SeaSourceStatus.Ready, published.last().observationsStatus)
        marineFails = false
        l.load(59.0, 18.0) { published += it }
        assertEquals(2, marineCalls) // retried
        assertEquals(SeaSourceStatus.Ready, published.last().marineStatus)
    }

    @Test fun observationsErrorOnlyWhenEveryMetricFails() = runTest {
        val l = loader()
        allObsFail = true
        val published = mutableListOf<SeaData>()
        l.load(59.0, 18.0) { published += it }
        assertEquals(SeaSourceStatus.Error, published.last().observationsStatus)
        assertTrue(published.last().observations.isEmpty())
    }

    @Test fun forceBypassesCache() = runTest {
        val l = loader()
        l.load(59.0, 18.0) { }
        l.load(59.0, 18.0, force = true) { }
        assertEquals(2, marineCalls)
    }

    @Test fun reportIsCachedPerLanguageForTenMinutes() = runTest {
        val l = loader()
        val first = l.loadReport(59.0, 18.0, "sv")
        assertTrue(first is SeaReportState.Ready)
        l.loadReport(60.0, 19.0, "sv")
        assertEquals(1, reportCalls) // raw report shared across places
        l.loadReport(59.0, 18.0, "en")
        assertEquals(2, reportCalls)
        now += SeaLoader.TTL_MS + 1
        l.loadReport(59.0, 18.0, "sv")
        assertEquals(3, reportCalls)
        assertEquals(listOf("sv", "en", "sv"), reportLanguages)
    }

    @Test fun reportFailureIsErrorAndNotCached() = runTest {
        var fail = true
        val l = SeaLoader(
            fetchMarine = { _, _ -> MarineForecast(emptyList()) },
            fetchObservation = { _, _, _ -> null },
            fetchReport = {
                reportCalls++
                if (fail) error("down")
                SeaReportRaw(SeaReportTexts("O", null, emptyList()), emptyList(), emptyList())
            },
            clock = { now },
        )
        assertEquals(SeaReportState.Error, l.loadReport(1.0, 1.0, "sv"))
        fail = false
        assertTrue(l.loadReport(1.0, 1.0, "sv") is SeaReportState.Ready)
        assertEquals(2, reportCalls)
    }
}
