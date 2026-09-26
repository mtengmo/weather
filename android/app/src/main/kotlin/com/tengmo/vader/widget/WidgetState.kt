package com.tengmo.vader.widget

import android.content.Context
import android.content.res.Configuration
import androidx.compose.ui.graphics.Color
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.CachedWeatherSnapshot
import com.tengmo.vader.data.model.Theme
import com.tengmo.vader.data.model.UserPreferences
import com.tengmo.vader.data.model.WidgetTargetKind
import com.tengmo.vader.data.repository.resolveEffectiveLocale
import com.tengmo.vader.location.hasBackgroundLocationPermission
import com.tengmo.vader.theme.AppColors
import kotlinx.coroutines.flow.first

/** What a widget instance should draw right now (contracts/widget-app-interface.md). */
sealed class WidgetState {
    /** Weather to show. [permissionNeeded] is true for a "My location" widget whose background
     *  location was denied/revoked: it keeps showing the last known place, marked as such, with a
     *  way to grant the permission (FR-028). [placeName] is the place shown either way. */
    data class Weather(
        val snapshot: CachedWeatherSnapshot,
        val permissionNeeded: Boolean,
        val isMyLocation: Boolean,
    ) : WidgetState()

    /** A favorite this widget showed was removed in the app (FR-030). */
    data object PlaceRemoved : WidgetState()

    /** Configured but no data yet (just added, or offline since) — shows the place if known. */
    data class Loading(val placeName: String?, val permissionNeeded: Boolean) : WidgetState()

    /** Widget has no stored target (e.g. configuration was cancelled). */
    data object NotConfigured : WidgetState()
}

/** Everything a widget composable needs: its state plus the user's display settings (theme, units,
 *  language — FR-023, so widgets always follow the in-app settings). */
data class WidgetRender(
    val appWidgetId: Int,
    val state: WidgetState,
    val preferences: UserPreferences,
    /** Context whose resources use the user's chosen language (auto/en/sv). */
    val localizedContext: Context,
) {
    val background: Color get() = if (preferences.theme == Theme.Ivory) AppColors.ivorySurface else AppColors.midnightSurface
    val textColor: Color get() = if (preferences.theme == Theme.Ivory) AppColors.ivoryText else AppColors.midnightText
    val mutedColor: Color get() = if (preferences.theme == Theme.Ivory) AppColors.ivoryTextMuted else AppColors.midnightTextMuted
    val accentColor: Color get() = if (preferences.theme == Theme.Ivory) AppColors.ivoryAccent else AppColors.midnightAccent
}

/** A context whose resources follow the in-app language setting. Widgets are drawn from an
 *  application context that does not pick up the per-app locale on every Android version, so the
 *  locale is applied explicitly (FR-023). */
fun localizedContext(context: Context, preferences: UserPreferences): Context {
    val locale = resolveEffectiveLocale(preferences.language)
    val config = Configuration(context.resources.configuration).apply { setLocale(locale) }
    return context.createConfigurationContext(config)
}

/** Loads the state for one widget instance from the stores (never the network — the refresh worker
 *  prepares snapshots, contracts/widget-app-interface.md). */
suspend fun loadWidgetRender(context: Context, appWidgetId: Int): WidgetRender {
    val services = ServiceLocator.get(context)
    val prefs = services.preferencesStore.preferences.first()
    val localized = localizedContext(context, prefs)

    val target = services.widgetTargetStore.getTarget(appWidgetId)
    val state: WidgetState = when {
        target == null -> WidgetState.NotConfigured
        target.kind == WidgetTargetKind.Favorite -> {
            val favorite = services.favoritesStore.favorites.first().find { it.id == target.favoriteId }
            if (favorite == null) {
                WidgetState.PlaceRemoved
            } else {
                val snapshot = services.snapshotStore.loadWidgetSnapshot(appWidgetId)
                // A snapshot left over from before the target was changed must not be shown.
                if (snapshot != null && snapshot.location.latitude == favorite.latitude && snapshot.location.longitude == favorite.longitude) {
                    WidgetState.Weather(snapshot, permissionNeeded = false, isMyLocation = false)
                } else {
                    WidgetState.Loading(favorite.displayName, permissionNeeded = false)
                }
            }
        }
        else -> {
            val permissionNeeded = !hasBackgroundLocationPermission(context)
            val snapshot = services.snapshotStore.loadWidgetSnapshot(appWidgetId)
            if (snapshot != null) {
                WidgetState.Weather(snapshot, permissionNeeded, isMyLocation = true)
            } else {
                WidgetState.Loading(target.lastKnownLocation?.displayName, permissionNeeded)
            }
        }
    }
    return WidgetRender(appWidgetId, state, prefs, localized)
}
