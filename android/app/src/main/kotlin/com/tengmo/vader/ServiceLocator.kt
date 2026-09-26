package com.tengmo.vader

import android.content.Context
import com.tengmo.vader.data.local.FavoritesStore
import com.tengmo.vader.data.local.PreferencesStore
import com.tengmo.vader.data.local.SnapshotStore
import com.tengmo.vader.data.local.WidgetTargetStore
import com.tengmo.vader.data.repository.WeatherRepository
import com.tengmo.vader.data.source.MetNoSource
import com.tengmo.vader.data.source.NetworkModule
import com.tengmo.vader.data.source.NominatimSource
import com.tengmo.vader.data.source.OpenMeteoSource
import com.tengmo.vader.data.source.SmhiSource

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

    val weatherRepository = WeatherRepository(smhiSource, openMeteoSource, metNoSource, nominatimSource)

    val favoritesStore = FavoritesStore(context)
    val preferencesStore = PreferencesStore(context)
    val snapshotStore = SnapshotStore(context)
    val widgetTargetStore = WidgetTargetStore(context)

    companion object {
        @Volatile private var instance: ServiceLocator? = null

        fun get(context: Context): ServiceLocator =
            instance ?: synchronized(this) {
                instance ?: ServiceLocator(context.applicationContext).also { instance = it }
            }
    }
}
