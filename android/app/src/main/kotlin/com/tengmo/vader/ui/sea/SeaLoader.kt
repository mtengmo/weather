package com.tengmo.vader.ui.sea

import com.tengmo.vader.data.model.MarineForecast
import com.tengmo.vader.data.model.MarineHour
import com.tengmo.vader.data.model.SeaMetric
import com.tengmo.vader.data.model.SeaObservation
import com.tengmo.vader.data.model.SeaReportRaw
import com.tengmo.vader.data.model.SeaReportView
import com.tengmo.vader.data.repository.buildSeaReport
import com.tengmo.vader.data.source.MarineSource
import com.tengmo.vader.data.source.SmhiOceanSource
import com.tengmo.vader.data.source.SmhiSeaReportSource
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.util.Locale

// Ports of web hooks useSeaData.ts and useSeaReport.ts without the React part: the loading logic
// and the 10-minute in-memory caches live here so they are unit-testable (clock is injected).

enum class SeaSourceStatus { Loading, Ready, Error }

/** Marine forecast + SMHI observations for a point; each source reports its own status. */
data class SeaData(
    val marineStatus: SeaSourceStatus = SeaSourceStatus.Loading,
    val marineHours: List<MarineHour> = emptyList(),
    val observationsStatus: SeaSourceStatus = SeaSourceStatus.Loading,
    val observations: Map<SeaMetric, SeaObservation?> = emptyMap(),
) {
    val isLoading get() = marineStatus == SeaSourceStatus.Loading || observationsStatus == SeaSourceStatus.Loading
}

sealed class SeaReportState {
    data object Loading : SeaReportState()
    data object Error : SeaReportState()
    data class Ready(val report: SeaReportView) : SeaReportState()
}

class SeaLoader(
    private val fetchMarine: suspend (lat: Double, lon: Double) -> MarineForecast,
    private val fetchObservation: suspend (metric: SeaMetric, lat: Double, lon: Double) -> SeaObservation?,
    private val fetchReport: suspend (language: String) -> SeaReportRaw,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    companion object {
        const val TTL_MS = 10 * 60 * 1000L
        fun cacheKey(lat: Double, lon: Double) = String.format(Locale.US, "%.3f,%.3f", lat, lon)

        fun from(marine: MarineSource, ocean: SmhiOceanSource, report: SmhiSeaReportSource) = SeaLoader(
            fetchMarine = marine::fetchMarineForecast,
            fetchObservation = ocean::fetchSeaObservation,
            fetchReport = report::fetchSeaReport,
        )
    }

    private class Cached<T>(val at: Long, val value: T)

    private val dataCache = HashMap<String, Cached<SeaData>>()
    private val reportCache = HashMap<String, Cached<SeaReportRaw>>()
    private val lock = Any()

    /** Test hook: drops both caches. */
    fun clearCaches() = synchronized(lock) {
        dataCache.clear()
        reportCache.clear()
    }

    /**
     * Loads marine and observation data in parallel, calling [publish] each time a source arrives
     * (so the UI can show one before the other). Only fully successful results are cached, so a
     * failed source is retried on the next visit. A cache hit publishes once and returns.
     */
    suspend fun load(lat: Double, lon: Double, force: Boolean = false, publish: (SeaData) -> Unit) {
        val key = cacheKey(lat, lon)
        if (!force) {
            val cached = synchronized(lock) { dataCache[key] }
            if (cached != null && clock() - cached.at < TTL_MS) {
                publish(cached.value)
                return
            }
        }
        var data = SeaData()
        publish(data)
        // Copy + publish under one lock, so two sources finishing together cannot overwrite each other.
        val emit = { transform: (SeaData) -> SeaData ->
            synchronized(lock) {
                val next = transform(data)
                data = next
                publish(next)
                if (next.marineStatus == SeaSourceStatus.Ready && next.observationsStatus == SeaSourceStatus.Ready) {
                    dataCache[key] = Cached(clock(), next)
                }
            }
        }
        coroutineScope {
            val marine = async {
                val result = try {
                    fetchMarine(lat, lon).hours
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    null
                }
                emit { cur ->
                    if (result != null) cur.copy(marineStatus = SeaSourceStatus.Ready, marineHours = result)
                    else cur.copy(marineStatus = SeaSourceStatus.Error, marineHours = emptyList())
                }
            }
            val observations = async {
                val results = coroutineScope {
                    SmhiOceanSource.SEA_METRICS.map { metric ->
                        async {
                            try {
                                Result.success(fetchObservation(metric, lat, lon))
                            } catch (e: CancellationException) {
                                throw e
                            } catch (e: Exception) {
                                Result.failure(e)
                            }
                        }
                    }.map { it.await() }
                }
                val map = HashMap<SeaMetric, SeaObservation?>()
                var failed = 0
                results.forEachIndexed { i, r ->
                    if (r.isSuccess) map[SmhiOceanSource.SEA_METRICS[i]] = r.getOrNull() else failed++
                }
                emit { cur ->
                    cur.copy(
                        observations = map,
                        observationsStatus = if (failed == results.size) SeaSourceStatus.Error else SeaSourceStatus.Ready,
                    )
                }
            }
            marine.await()
            observations.await()
        }
    }

    /**
     * SMHI's sjorapport for a point, cached 10 minutes per [language]. The raw report is cached
     * (not the per-point view), exactly like web's useSeaReport.
     */
    suspend fun loadReport(lat: Double, lon: Double, language: String, force: Boolean = false): SeaReportState {
        val cached = if (force) null else synchronized(lock) { reportCache[language] }
        val raw = if (cached != null && clock() - cached.at < TTL_MS) {
            cached.value
        } else {
            try {
                fetchReport(language).also { fresh -> synchronized(lock) { reportCache[language] = Cached(clock(), fresh) } }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                return SeaReportState.Error
            }
        }
        return SeaReportState.Ready(buildSeaReport(raw, lat, lon, language))
    }
}
