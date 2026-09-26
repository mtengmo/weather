package com.tengmo.vader.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import com.tengmo.vader.R
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.Favorite
import com.tengmo.vader.data.model.UserPreferences
import com.tengmo.vader.data.model.WidgetTarget
import com.tengmo.vader.data.model.WidgetTargetKind
import com.tengmo.vader.location.CurrentLocationProvider
import com.tengmo.vader.location.SignificantLocationTracker
import com.tengmo.vader.location.hasBackgroundLocationPermission
import com.tengmo.vader.location.rememberBackgroundLocationState
import com.tengmo.vader.theme.SystemBarsController
import com.tengmo.vader.theme.TengmoVaderTheme
import com.tengmo.vader.work.WidgetRefreshScheduler
import kotlinx.coroutines.launch

/**
 * T063 / FR-025 / FR-027 — the widget configuration screen, shown when a widget is added (and again
 * when the user reconfigures it, or taps a "place removed"/"permission needed" widget). The user
 * chooses which place the widget shows: one of their favorites, or "My location".
 *
 * Picking "My location" first explains *why* "Allow all the time" location is needed and only then
 * starts the staged permission flow (FR-027) — this is the only place in the app that ever asks for
 * background location. Declining is fine: the widget is still added and shows the last known place
 * with a way to grant the permission later (FR-028).
 */
class WidgetConfigureActivity : AppCompatActivity() {
    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        appWidgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            ?: AppWidgetManager.INVALID_APPWIDGET_ID

        // Until the user finishes, the result is "cancelled" so the launcher discards the widget.
        setResult(Activity.RESULT_CANCELED, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId))
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        val services = ServiceLocator.get(this)
        setContent {
            val prefs by services.preferencesStore.preferences.collectAsState(initial = UserPreferences())
            val favorites by services.favoritesStore.favorites.collectAsState(initial = emptyList())
            SystemBarsController(prefs.theme)
            TengmoVaderTheme(prefs.theme) {
                ConfigureContent(
                    favorites = favorites,
                    onFavoriteChosen = { favorite -> complete(WidgetTarget(WidgetTargetKind.Favorite, favoriteId = favorite.id)) },
                    onMyLocationDone = { backgroundGranted -> completeMyLocation(backgroundGranted) },
                    onCancel = { finish() },
                )
            }
        }
    }

    private fun completeMyLocation(backgroundGranted: Boolean) {
        lifecycleScope.launch {
            val services = ServiceLocator.get(this@WidgetConfigureActivity)
            // Seed the widget with where the phone is right now, if a foreground fix is possible.
            val lastKnown = runCatching {
                CurrentLocationProvider(this@WidgetConfigureActivity).getCurrentLocation()?.let {
                    services.weatherRepository.resolveCurrentLocationName(it.latitude, it.longitude)
                }
            }.getOrNull()
            complete(
                WidgetTarget(
                    kind = WidgetTargetKind.MyLocation,
                    lastKnownLocation = lastKnown,
                    backgroundLocationGranted = backgroundGranted,
                ),
            )
        }
    }

    private fun complete(target: WidgetTarget) {
        lifecycleScope.launch {
            val services = ServiceLocator.get(this@WidgetConfigureActivity)
            services.widgetTargetStore.setTarget(appWidgetId, target)
            // A previous snapshot belongs to the previous target.
            services.snapshotStore.removeWidgetSnapshot(appWidgetId)

            WidgetRefreshScheduler.ensureScheduled(this@WidgetConfigureActivity)
            if (target.kind == WidgetTargetKind.MyLocation && hasBackgroundLocationPermission(this@WidgetConfigureActivity)) {
                SignificantLocationTracker.start(this@WidgetConfigureActivity)
            }
            WidgetRefreshScheduler.refreshNow(this@WidgetConfigureActivity)

            setResult(Activity.RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId))
            finish()
        }
    }

    companion object {
        /** Intent that reopens the configuration for an existing widget (FR-025: change it later;
         *  FR-028: grant permission; FR-030: choose another place). */
        fun reconfigureIntent(context: Context, appWidgetId: Int): Intent =
            Intent(context, WidgetConfigureActivity::class.java)
                .setAction(AppWidgetManager.ACTION_APPWIDGET_CONFIGURE)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
}

@Composable
private fun ConfigureContent(
    favorites: List<Favorite>,
    onFavoriteChosen: (Favorite) -> Unit,
    onMyLocationDone: (backgroundGranted: Boolean) -> Unit,
    onCancel: () -> Unit,
) {
    var explainingMyLocation by remember { mutableStateOf(false) }
    var deniedNote by remember { mutableStateOf(false) }
    val locationState = rememberBackgroundLocationState { granted ->
        // Both stages have run (or the user declined) — finish either way; a denied widget keeps
        // showing the last known place with a hint to grant it later (FR-028).
        if (!granted) deniedNote = true
        onMyLocationDone(granted)
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.widget_chooseTarget), fontSize = 22.sp, color = MaterialTheme.colorScheme.onBackground)

        if (!explainingMyLocation) {
            Text(stringResource(R.string.widget_targetFavorite), fontSize = 16.sp, color = MaterialTheme.colorScheme.primary)
            if (favorites.isEmpty()) Text(stringResource(R.string.favoritesList_empty))
            favorites.forEach { favorite ->
                OutlinedButton(onClick = { onFavoriteChosen(favorite) }, modifier = Modifier.fillMaxWidth()) {
                    Text(favorite.displayName)
                }
            }
            Button(onClick = { explainingMyLocation = true }, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.widget_targetMyLocation))
            }
        } else {
            // FR-027: explain first, ask second.
            Text(stringResource(R.string.permission_backgroundRationaleTitle), fontSize = 18.sp, color = MaterialTheme.colorScheme.onBackground)
            Text(stringResource(R.string.permission_backgroundRationale))
            if (deniedNote) Text(stringResource(R.string.permission_backgroundDenied), color = MaterialTheme.colorScheme.error)
            Button(
                onClick = {
                    if (locationState.isBackgroundGranted) onMyLocationDone(true) else locationState.request()
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text(stringResource(R.string.permission_grantAction)) }
            OutlinedButton(onClick = { onMyLocationDone(false) }, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.widget_configureConfirm))
            }
        }

        OutlinedButton(onClick = onCancel, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.locationPanel_close)) }
    }
}
