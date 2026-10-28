package com.tengmo.vader

import android.content.Context
import com.tengmo.vader.data.local.PlaceNameCache
import java.io.File
import com.tengmo.vader.data.local.FavoritesStore
import com.tengmo.vader.data.local.PreferencesStore
import com.tengmo.vader.data.local.SnapshotStore
import com.tengmo.vader.data.local.WidgetTargetStore
import com.tengmo.vader.data.repository.WeatherRepository
import com.tengmo.vader.data.source.MarineSource
import com.tengmo.vader.data.source.MetNoSource
import com.tengmo.vader.data.source.NetworkModule
import com.tengmo.vader.data.source.NominatimSource
import com.tengmo.vader.data.source.OpenMeteoSource
import com.tengmo.vader.data.source.SmhiOceanSource
import com.tengmo.vader.data.source.SmhiSeaReportSource
import com.tengmo.vader.data.source.SmhiSource
import com.tengmo.vader.ui.sea.SeaLoader
import com.tengmo.vader.work.sync.PostSyncHook

/** Minimal hand-rolled DI container (no Hilt/Dagger dependency, to keep this scaffold's build
 *  surface small) — every screen/worker gets its dependencies from here via
 *  `ServiceLocator.get(context)`. Real production code should consider Hilt once the app grows
 *  past this feature's scope. */
class ServiceLocator private constructor(context: Context) {
    val httpClient = NetworkModule.createClient()
    private val json = NetworkModule.json

    val smhiSource = SmhiSource(httpClient, json)
    val openMeteoSource = OpenMeteoSource(httpClient)
    val metNoSource = MetNoSource(httpClient)
    val nominatimSource = NominatimSource(httpClient)
    val marineSource = MarineSource(httpClient, json)
    val smhiOceanSource = SmhiOceanSource(httpClient, json)
    val smhiSeaReportSource = SmhiSeaReportSource(httpClient, json)

    /** Process-wide so the 10-minute sea caches survive screen / ViewModel recreation. */
    val seaLoader = SeaLoader.from(marineSource, smhiOceanSource, smhiSeaReportSource)

    val weatherRepository = WeatherRepository(
        smhiSource, openMeteoSource, metNoSource, nominatimSource,
        nameCache = PlaceNameCache(File(context.filesDir, "place_names/names.json"), json),
    )

    val favoritesStore = FavoritesStore(context)
    val preferencesStore = PreferencesStore(context)
    val snapshotStore = SnapshotStore(context)
    val widgetTargetStore = WidgetTargetStore(context)

    /** Extension point: hooks run after every background sync (e.g. notifications, later). */
    val postSyncHooks: List<PostSyncHook> = emptyList()

    companion object {
        @Volatile private var instance: ServiceLocator? = null

        fun get(context: Context): ServiceLocator =
            instance ?: synchronized(this) {
                instance ?: ServiceLocator(context.applicationContext).also { instance = it }
            }
    }
}
