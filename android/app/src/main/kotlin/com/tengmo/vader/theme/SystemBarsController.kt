package com.tengmo.vader.theme

import android.app.Activity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import com.tengmo.vader.data.model.Theme

/** T055 / FR-013 — edge-to-edge: bars are transparent (enableEdgeToEdge), so only the icon
 *  light/dark appearance is kept in step with the selected theme. */
@Composable
fun SystemBarsController(theme: Theme) {
    val view = LocalView.current
    if (view.isInEditMode) return
    SideEffect {
        val window = (view.context as Activity).window
        val controller = WindowCompat.getInsetsController(window, view)
        controller.isAppearanceLightStatusBars = theme == Theme.Ivory
        controller.isAppearanceLightNavigationBars = theme == Theme.Ivory
    }
}
