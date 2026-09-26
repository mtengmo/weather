package com.tengmo.vader.theme

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.tengmo.vader.data.model.Theme

// T024 — color tokens ported 1:1 from src/index.css's [data-theme="midnight"|"ivory"] custom
// properties (see res/values/colors.xml for the source-of-truth hex values), so the app's
// Compose theme matches the web app's palette (FR-011).

object AppColors {
    // Midnight
    val midnightBg = Color(0xFF12141A)
    val midnightSurface = Color(0xFF1C1F27)
    val midnightText = Color(0xFFF2F0EB)
    val midnightTextMuted = Color(0xFFA3A3AB)
    val midnightAccent = Color(0xFFC9A86A)
    val midnightAccent2 = Color(0xFF3A7D7A)
    val midnightBorder = Color(0xFF2E323D)
    val midnightErrorBg = Color(0xFF3A2323)
    val midnightErrorText = Color(0xFFF5C9C2)

    // Ivory
    val ivoryBg = Color(0xFFFFFDF9)
    val ivorySurface = Color(0xFFFFFFFF)
    val ivoryText = Color(0xFF151316)
    val ivoryTextMuted = Color(0xFF6B6570)
    val ivoryAccent = Color(0xFFE01050)
    val ivoryAccent2 = Color(0xFF00D4B5)
    val ivoryBorder = Color(0xFFE5E1E6)
    val ivoryErrorBg = Color(0xFFFFE3E8)
    val ivoryErrorText = Color(0xFF7A0930)

    // Weather-metric accent colors (temperature/rain/wind/cloud rows), shared across themes
    // where the web app itself keeps them theme-invariant (src/index.css row-* tokens).
    val rowTemperature = Color(0xFFC1590F)
}

private val MidnightColorScheme = darkColorScheme(
    background = AppColors.midnightBg,
    surface = AppColors.midnightSurface,
    onBackground = AppColors.midnightText,
    onSurface = AppColors.midnightText,
    primary = AppColors.midnightAccent,
    secondary = AppColors.midnightAccent2,
    outline = AppColors.midnightBorder,
    error = AppColors.midnightErrorText,
    errorContainer = AppColors.midnightErrorBg,
)

private val IvoryColorScheme = lightColorScheme(
    background = AppColors.ivoryBg,
    surface = AppColors.ivorySurface,
    onBackground = AppColors.ivoryText,
    onSurface = AppColors.ivoryText,
    primary = AppColors.ivoryAccent,
    secondary = AppColors.ivoryAccent2,
    outline = AppColors.ivoryBorder,
    error = AppColors.ivoryErrorText,
    errorContainer = AppColors.ivoryErrorBg,
)

@Composable
fun TengmoVaderTheme(theme: Theme, content: @Composable () -> Unit) {
    val colorScheme = when (theme) {
        Theme.Midnight -> MidnightColorScheme
        Theme.Ivory -> IvoryColorScheme
    }
    MaterialTheme(colorScheme = colorScheme) {
        // A Surface provides LocalContentColor (onBackground) for every plain Text below it —
        // without one, Material 3 text defaults to black and vanishes on the dark Midnight theme.
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background, content = content)
    }
}
