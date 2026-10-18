package com.tengmo.vader.work.sync

import com.tengmo.vader.data.local.SnapshotStore
import com.tengmo.vader.data.model.ObservationSeries
import com.tengmo.vader.data.repository.WeatherRepository
import java.time.Duration
import java.time.Instant

/** Bridges planner keys ("%.3f,%.3f") to SnapshotStore's file cache. */
class SnapshotSeriesCache(private val store: SnapshotStore) : SeriesCache, SeriesPruner {
    override suspend fun ageOf(key: String, now: Instant): Duration? {
        val (lat, lon) = parseKey(key) ?: return null
        val loadedAt = store.loadSeries(lat, lon)?.second ?: return null
        return Duration.between(Instant.ofEpochMilli(loadedAt), now).coerceAtLeast(Duration.ZERO)
    }

    override suspend fun save(job: SyncJob, series: ObservationSeries, fetchedAt: Instant) {
        store.saveSeries(series, fetchedAt.toEpochMilli())
    }

    override suspend fun prune(keep: Collection<Pair<Double, Double>>) = store.pruneSeries(keep)

    private fun parseKey(key: String): Pair<Double, Double>? {
        val parts = key.split(',')
        if (parts.size != 2) return null
        val lat = parts[0].toDoubleOrNull() ?: return null
        val lon = parts[1].toDoubleOrNull() ?: return null
        return lat to lon
    }
}

class RepositorySeriesFetcher(private val repository: WeatherRepository) : SeriesFetcher {
    override suspend fun fetch(job: SyncJob): ObservationSeries =
        repository.getObservations(job.latitude, job.longitude, job.window)
}
