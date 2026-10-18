package com.tengmo.vader.work

import android.content.Context
import androidx.glance.appwidget.updateAll
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.CachedWeatherSnapshot
import com.tengmo.vader.data.model.CurrentConditionSummary
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.ObservationSeries
import com.tengmo.vader.data.model.ObservationWindow
import com.tengmo.vader.data.model.WeatherObservation
import com.tengmo.vader.data.model.WidgetTarget
import com.tengmo.vader.data.model.WidgetTargetKind
import com.tengmo.vader.data.repository.WeatherConditionInput
import com.tengmo.vader.data.repository.deriveWeatherCondition
import com.tengmo.vader.location.CurrentLocationProvider
import com.tengmo.vader.location.hasBackgroundLocationPermission
import com.tengmo.vader.widget.MediumWeatherWidget
import com.tengmo.vader.widget.SmallWeatherWidget
import com.tengmo.vader.work.sync.SyncPlanner
import kotlinx.coroutines.flow.first
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.abs

/** A configured widget with its resolved place. */
data class ResolvedWidget(val widgetId: Int, val location: Location)

/**
 * Widget snapshot logic shared by the one-off [WidgetRefreshWorker] and [BackgroundSyncWorker]:
 * resolves each widget's place, builds snapshots (from a freshly fetched or already-fetched
 * series) and redraws the widgets.
 */
class WidgetSnapshotUpdater(private val context: Context) {
    private val services get() = ServiceLocator.get(context)

    suspend fun hasWidgets(): Boolean = services.widgetTargetStore.allWidgetIds().isNotEmpty()

    /** Widgets with a resolvable place; removed favorites are skipped (FR-030). */
    suspend fun resolveWidgets(reported: Pair<Double, Double>? = null): List<ResolvedWidget> {
        val store = services.widgetTargetStore
        val favorites = services.favoritesStore.favorites.first()
        val result = ArrayList<ResolvedWidget>()
        for (widgetId in store.allWidgetIds()) {
            val target = store.getTarget(widgetId) ?: continue
            val location: Location = when (target.kind) {
                WidgetTargetKind.Favorite -> favorites.find { it.id == target.favoriteId }?.toLocation() ?: continue
                WidgetTargetKind.MyLocation -> resolveMyLocation(widgetId, target, reported) ?: continue
            }
            result += ResolvedWidget(widgetId, location)
        }
        return result
    }

    /** Writes snapshots for every resolved widget at the same place (by planner key) as [series]. */
    suspend fun applySeries(widgets: List<ResolvedWidget>, series: ObservationSeries) {
        if (series.observations.isEmpty()) return
        val key = SyncPlanner.keyOf(series.location.latitude, series.location.longitude)
        for (w in widgets) {
            if (SyncPlanner.keyOf(w.location.latitude, w.location.longitude) != key) continue
            services.snapshotStore.saveWidgetSnapshot(w.widgetId, buildSnapshot(w.location, series.observations))
        }
    }

    /** Redraws both sizes so they pick up new snapshots, changed settings, and removed places. */
    suspend fun redraw() {
        SmallWeatherWidget().updateAll(context)
        MediumWeatherWidget().updateAll(context)
    }

    /** Fetches and updates every widget (the one-off refresh). Returns true if any fetch failed. */
    suspend fun refreshAll(reported: Pair<Double, Double>?): Boolean {
        var anyFailed = false
        for (w in resolveWidgets(reported)) {
            val series = runCatching {
                services.weatherRepository.getObservations(w.location.latitude, w.location.longitude, ObservationWindow.Last24Hours)
            }.getOrNull()
            if (series == null || series.observations.isEmpty()) {
                anyFailed = true // keep the previous snapshot; it stays on screen marked with its age
                continue
            }
            services.snapshotStore.saveWidgetSnapshot(w.widgetId, buildSnapshot(w.location, series.observations))
        }
        redraw()
        return anyFailed
    }

    /** The device position for a "My location" widget (FR-026): the just-reported position, else a
     *  fresh fix when background location is allowed, else the last known one (FR-028). */
    private suspend fun resolveMyLocation(widgetId: Int, target: WidgetTarget, reported: Pair<Double, Double>?): Location? {
        val granted = hasBackgroundLocationPermission(context)
        val last = target.lastKnownLocation
        val fix: Pair<Double, Double>? = reported
            ?: if (granted) {
                CurrentLocationProvider(context).getCurrentLocation()?.let { it.latitude to it.longitude }
            } else {
                null
            }
        if (fix == null) return last

        val moved = last == null ||
            abs(last.latitude - fix.first) > MOVED_DEGREES || abs(last.longitude - fix.second) > MOVED_DEGREES
        val location = if (moved) {
            services.weatherRepository.resolveCurrentLocationName(fix.first, fix.second, services.preferencesStore.effectiveLanguage())
        } else {
            last!!
        }
        if (moved || target.backgroundLocationGranted != granted) {
            services.widgetTargetStore.setTarget(
                widgetId,
                target.copy(lastKnownLocation = location, backgroundLocationGranted = granted),
            )
        }
        return location
    }

    private companion object {
        /** ~0.05 degrees ~ 5 km - below this the place name is not looked up again. */
        const val MOVED_DEGREES = 0.05
    }
}

/** Reduces a series to exactly what the two widget sizes draw (data-model.md
 *  "CachedWeatherSnapshot"): the current reading, today's high/low and rain chance, and the next
 *  few hours. */
internal fun buildSnapshot(location: Location, observations: List<WeatherObservation>): CachedWeatherSnapshot {
    val now = Instant.now()
    val zone = ZoneId.systemDefault()
    val today = LocalDate.now(zone)

    val latestActual = observations.lastOrNull { !it.isForecast }
    // The observation closest to "now" that carries a symbol code (forecast points do; station
    // observations never do) gives the widget the same icon the Overview would show.
    val symbolSource = observations
        .filter { it.smhiSymbolCode != null }
        .minByOrNull { abs(Instant.parse(it.timestamp).toEpochMilli() - now.toEpochMilli()) }

    val todays = observations.filter { Instant.parse(it.timestamp).atZone(zone).toLocalDate() == today }
    val temps = todays.mapNotNull { it.temperature }
    val chance = todays.filter { it.isForecast }.mapNotNull { it.chanceOfRain }.maxOrNull()

    val current = latestActual ?: observations.firstOrNull()
    val condition = current?.let {
        deriveWeatherCondition(
            WeatherConditionInput(it.temperature, it.precipitation, it.windSpeed, it.cloudCoverPercent, it.timestamp, it.symbolCondition, it.chanceOfRain),
        )
    }

    val nextHours = observations
        .filter { Instant.parse(it.timestamp).isAfter(now) }
        .take(NEXT_HOURS_COUNT)

    return CachedWeatherSnapshot(
        location = location,
        loadedAt = now.toString(),
        currentConditionSummary = CurrentConditionSummary(
            condition = condition,
            smhiSymbolCode = symbolSource?.smhiSymbolCode,
            temperature = current?.temperature,
            high = temps.maxOrNull(),
            low = temps.minOrNull(),
            chanceOfRain = chance,
            nextHours = nextHours,
        ),
    )
}

/** How many hours the medium widget's strip shows. */
internal const val NEXT_HOURS_COUNT = 5
