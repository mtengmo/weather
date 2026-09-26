package com.tengmo.vader.theme

import android.app.Activity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import com.tengmo.vader.data.model.Theme

/** T055 / FR-013 — keeps the system status bar and navigation bar colors, and their icon
 *  light/dark appearance, in step with the selected theme so text and icons stay legible. */
@Composable
fun SystemBarsController(theme: Theme) {
    val view = LocalView.current
    if (view.isInEditMode) return
    SideEffect {
        val window = (view.context as Activity).window
        val background = when (theme) {
            Theme.Midnight -> AppColors.midnightBg
            Theme.Ivory -> AppColors.ivoryBg
        }
        window.statusBarColor = background.toArgb()
        window.navigationBarColor = background.toArgb()
        val controller = WindowCompat.getInsetsController(window, view)
        // Light theme -> dark icons; dark theme -> light icons.
        controller.isAppearanceLightStatusBars = theme == Theme.Ivory
        controller.isAppearanceLightNavigationBars = theme == Theme.Ivory
    }
}
