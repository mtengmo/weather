package com.tengmo.vader

import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.lifecycleScope
import com.tengmo.vader.data.model.UserPreferences
import com.tengmo.vader.theme.SystemBarsController
import com.tengmo.vader.theme.TengmoVaderTheme
import com.tengmo.vader.ui.AppNavHost
import com.tengmo.vader.widget.WidgetTapHandler
import kotlinx.coroutines.launch

/** T029 — entry point: wires the nav host, theme, system bars (T055) and — via the manifest's
 *  launch theme (FR-015) — the launch screen. Extends AppCompatActivity so per-app language
 *  switching (settings, FR-009) works on all supported Android versions. */
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Leave the window-level launch theme behind once the first frame is ready.
        setTheme(R.style.Theme_TengmoVader)
        super.onCreate(savedInstanceState)
        // Same edge-to-edge behaviour on every Android version (Android 15 enforces it for targetSdk 35);
        // every screen pads itself with safeDrawingPadding() so nothing sits under a cut-out or the gesture bar (FR-012).
        enableEdgeToEdge()
        val preferencesStore = ServiceLocator.get(this).preferencesStore
        handleWidgetTap(intent)

        setContent {
            val preferences by preferencesStore.preferences.collectAsState(initial = UserPreferences())
            SystemBarsController(preferences.theme)
            TengmoVaderTheme(theme = preferences.theme) {
                AppNavHost()
            }
        }
    }

    // singleTop: a widget tap while the app is already open arrives here (T069, FR-024).
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleWidgetTap(intent)
    }

    private fun handleWidgetTap(intent: Intent?) {
        lifecycleScope.launch { WidgetTapHandler.handleIntent(this@MainActivity, intent) }
    }
}
