package com.tengmo.vader.work

import android.content.Context
import androidx.glance.appwidget.updateAll
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.CachedWeatherSnapshot
import com.tengmo.vader.data.model.CurrentConditionSummary
import com.tengmo.vader.data.model.Location
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
import kotlinx.coroutines.flow.first
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.abs

/**
 * T067 — the widget refresh job (research.md §4, contracts/widget-app-interface.md): for every
 * configured widget, resolves its place (a favorite, or the device position for "My location"),
 * fetches the weather through the *same* [com.tengmo.vader.data.repository.WeatherRepository] the
 * app uses, writes a per-widget snapshot, then redraws the widgets. Widgets never call the
 * network themselves — they only draw the snapshot this worker prepared.
 *
 * Optional input (from [LocationChangeRefreshTrigger], T068): a freshly reported position, used
 * for "My location" widgets instead of asking for the position again.
 */
class WidgetRefreshWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val services = ServiceLocator.get(applicationContext)
        val widgetIds = services.widgetTargetStore.allWidgetIds()
        if (widgetIds.isEmpty()) return Result.success()

        val reportedLat = inputData.getDouble(KEY_LAT, Double.NaN)
        val reportedLon = inputData.getDouble(KEY_LON, Double.NaN)
        val reported = if (reportedLat.isNaN() || reportedLon.isNaN()) null else reportedLat to reportedLon

        val favorites = services.favoritesStore.favorites.first()
        var anyFailed = false

        for (widgetId in widgetIds) {
            val target = services.widgetTargetStore.getTarget(widgetId) ?: continue
            val location: Location = when (target.kind) {
                WidgetTargetKind.Favorite -> favorites.find { it.id == target.favoriteId }?.toLocation()
                    ?: continue // favorite removed: the widget renders its "place removed" state (FR-030)
                WidgetTargetKind.MyLocation -> resolveMyLocation(services, widgetId, target, reported) ?: continue
            }

            val series = runCatching {
                services.weatherRepository.getObservations(location.latitude, location.longitude, ObservationWindow.Last24Hours)
            }.getOrNull()

            if (series == null || series.observations.isEmpty()) {
                anyFailed = true // keep the previous snapshot; it stays on screen marked with its age
                continue
            }
            services.snapshotStore.saveWidgetSnapshot(widgetId, buildSnapshot(location, series.observations))
        }

        // Redraw both sizes so they pick up new snapshots, changed settings, and removed places.
        SmallWeatherWidget().updateAll(applicationContext)
        MediumWeatherWidget().updateAll(applicationContext)

        return if (anyFailed) Result.retry() else Result.success()
    }

    /** The device position for a "My location" widget (FR-026): the just-reported position, else a
     *  fresh fix when background location is allowed, else the last known one (FR-028). The place
     *  name is only re-resolved when the position moved noticeably. */
    private suspend fun resolveMyLocation(
        services: ServiceLocator,
        widgetId: Int,
        target: WidgetTarget,
        reported: Pair<Double, Double>?,
    ): Location? {
        val granted = hasBackgroundLocationPermission(applicationContext)
        val last = target.lastKnownLocation

        val fix: Pair<Double, Double>? = reported
            ?: if (granted) {
                CurrentLocationProvider(applicationContext).getCurrentLocation()?.let { it.latitude to it.longitude }
            } else {
                null
            }

        if (fix == null) return last // no new position available: keep showing the last known place

        val moved = last == null ||
            abs(last.latitude - fix.first) > MOVED_DEGREES || abs(last.longitude - fix.second) > MOVED_DEGREES
        val location = if (moved) {
            services.weatherRepository.resolveCurrentLocationName(fix.first, fix.second)
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

    companion object {
        const val KEY_LAT = "lat"
        const val KEY_LON = "lon"

        /** ~0.05 degrees ≈ 5 km — below this the place name is not looked up again. */
        private const val MOVED_DEGREES = 0.05
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
