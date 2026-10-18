package com.tengmo.vader.theme

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.tengmo.vader.data.model.Theme

// T024 — color tokens ported 1:1 from src/index.css's [data-theme="midnight"|"ivory"] custom
// properties (see res/values/colors.xml for the source-of-truth hex values), so the app's
// Compose theme matches the web app's palette (FR-011).

object AppColors {
    // Midnight — brand tokens (src/index.css) ...
    val midnightBg = Color(0xFF12141A)
    val midnightSurface = Color(0xFF1C1F27)
    val midnightText = Color(0xFFF2F0EB)
    val midnightTextMuted = Color(0xFFA3A3AB)
    val midnightAccent = Color(0xFFC9A86A)
    val midnightAccent2 = Color(0xFF3A7D7A)
    val midnightBorder = Color(0xFF2E323D)
    val midnightErrorBg = Color(0xFF3A2323)
    val midnightErrorText = Color(0xFFF5C9C2)
    val midnightPrimaryContainer = Color(0xFF4A3F26)
    val midnightTertiary = Color(0xFF6FA8D6)
    // ... and the tonal steps derived from them (contrast verified, see Material roles below).
    val midnightSurfaceLowest = Color(0xFF0E1015)
    val midnightSurfaceLow = Color(0xFF171A20)
    val midnightSurfaceHigh = Color(0xFF232730)
    val midnightSurfaceHighest = Color(0xFF2B303B)
    val midnightSurfaceVariant = Color(0xFF262A33)
    val midnightSecondary = Color(0xFF4F9E99) // accent2 lifted so dark text reads on it
    val midnightSecondaryContainer = Color(0xFF2A494C) // accent2 over surface: nav pill, selected segment
    val midnightTertiaryContainer = Color(0xFF24394D)
    val midnightOnTertiaryContainer = Color(0xFFD6E8F7)
    val midnightOutline = Color(0xFF6A6E7A) // control borders (>= 3:1); hairlines use midnightBorder
    val midnightInversePrimary = Color(0xFF7A5F1F)

    // Ivory — brand tokens ...
    val ivoryBg = Color(0xFFFFFDF9)
    val ivorySurface = Color(0xFFFFFFFF)
    val ivoryText = Color(0xFF151316)
    val ivoryTextMuted = Color(0xFF6B6570)
    val ivoryAccent = Color(0xFFE01050)
    val ivoryAccent2 = Color(0xFF00D4B5)
    val ivoryBorder = Color(0xFFE5E1E6)
    val ivoryErrorBg = Color(0xFFFFE3E8)
    val ivoryErrorText = Color(0xFF7A0930)
    val ivoryPrimaryContainer = Color(0xFFFFD9E2)
    val ivoryTertiary = Color(0xFF1F6FB2)
    val ivoryTint = Color(0xFFF3EEF1)
    // ... and derived tonal steps.
    val ivorySurfaceLow = Color(0xFFFBF7F6)
    val ivorySurfaceContainer = Color(0xFFF7F2F3)
    val ivorySurfaceHighest = Color(0xFFEDE7EB)
    val ivorySurfaceVariant = Color(0xFFF1ECEF)
    val ivorySecondaryContainer = Color(0xFFCFF5EE)
    val ivoryOnSecondaryContainer = Color(0xFF0B3B34)
    val ivoryTertiaryContainer = Color(0xFFD3E6F7)
    val ivoryOnTertiaryContainer = Color(0xFF0F3A5E)
    val ivoryOutline = Color(0xFF8A8490)
    val ivoryInverseSurface = Color(0xFF2B282D)
    val ivoryInverseOnSurface = Color(0xFFF6F1F2)
    val ivoryInversePrimary = Color(0xFFFF8FAE)

    // Weather-metric accent colors (temperature/rain/wind/cloud rows), shared across themes
    // where the web app itself keeps them theme-invariant (src/index.css row-* tokens).
    val rowTemperature = Color(0xFFC1590F)
}

// Every Material role is set explicitly so no component falls back to Material's default
// lavender baseline. Pairs and their contrast ratios are listed in the polish report.
private val MidnightColorScheme = darkColorScheme(
    primary = AppColors.midnightAccent,
    onPrimary = AppColors.midnightBg,
    primaryContainer = AppColors.midnightPrimaryContainer,
    onPrimaryContainer = AppColors.midnightText,
    inversePrimary = AppColors.midnightInversePrimary,
    secondary = AppColors.midnightSecondary,
    onSecondary = AppColors.midnightBg,
    secondaryContainer = AppColors.midnightSecondaryContainer,
    onSecondaryContainer = AppColors.midnightText,
    tertiary = AppColors.midnightTertiary,
    onTertiary = AppColors.midnightBg,
    tertiaryContainer = AppColors.midnightTertiaryContainer,
    onTertiaryContainer = AppColors.midnightOnTertiaryContainer,
    background = AppColors.midnightBg,
    onBackground = AppColors.midnightText,
    surface = AppColors.midnightSurface,
    onSurface = AppColors.midnightText,
    surfaceVariant = AppColors.midnightSurfaceVariant,
    onSurfaceVariant = AppColors.midnightTextMuted,
    surfaceTint = AppColors.midnightAccent,
    inverseSurface = AppColors.midnightText,
    inverseOnSurface = AppColors.midnightBg,
    error = AppColors.midnightErrorText,
    onError = AppColors.midnightErrorBg,
    errorContainer = AppColors.midnightErrorBg,
    onErrorContainer = AppColors.midnightErrorText,
    outline = AppColors.midnightOutline,
    outlineVariant = AppColors.midnightBorder,
    scrim = Color.Black,
    surfaceBright = AppColors.midnightSurfaceHighest,
    surfaceDim = AppColors.midnightSurfaceLowest,
    surfaceContainerLowest = AppColors.midnightSurfaceLowest,
    surfaceContainerLow = AppColors.midnightSurfaceLow,
    surfaceContainer = AppColors.midnightSurface,
    surfaceContainerHigh = AppColors.midnightSurfaceHigh,
    surfaceContainerHighest = AppColors.midnightSurfaceHighest,
)

private val IvoryColorScheme = lightColorScheme(
    primary = AppColors.ivoryAccent,
    onPrimary = AppColors.ivorySurface,
    primaryContainer = AppColors.ivoryPrimaryContainer,
    onPrimaryContainer = AppColors.ivoryErrorText,
    inversePrimary = AppColors.ivoryInversePrimary,
    secondary = AppColors.ivoryAccent2,
    onSecondary = AppColors.ivoryText,
    secondaryContainer = AppColors.ivorySecondaryContainer,
    onSecondaryContainer = AppColors.ivoryOnSecondaryContainer,
    tertiary = AppColors.ivoryTertiary,
    onTertiary = AppColors.ivorySurface,
    tertiaryContainer = AppColors.ivoryTertiaryContainer,
    onTertiaryContainer = AppColors.ivoryOnTertiaryContainer,
    background = AppColors.ivoryBg,
    onBackground = AppColors.ivoryText,
    surface = AppColors.ivorySurface,
    onSurface = AppColors.ivoryText,
    surfaceVariant = AppColors.ivorySurfaceVariant,
    onSurfaceVariant = AppColors.ivoryTextMuted,
    surfaceTint = AppColors.ivoryAccent,
    inverseSurface = AppColors.ivoryInverseSurface,
    inverseOnSurface = AppColors.ivoryInverseOnSurface,
    error = AppColors.ivoryErrorText,
    onError = AppColors.ivorySurface,
    errorContainer = AppColors.ivoryErrorBg,
    onErrorContainer = AppColors.ivoryErrorText,
    outline = AppColors.ivoryOutline,
    outlineVariant = AppColors.ivoryBorder,
    scrim = Color.Black,
    surfaceBright = AppColors.ivorySurface,
    surfaceDim = AppColors.ivorySurfaceHighest,
    surfaceContainerLowest = AppColors.ivorySurface,
    surfaceContainerLow = AppColors.ivorySurfaceLow,
    surfaceContainer = AppColors.ivorySurfaceContainer,
    surfaceContainerHigh = AppColors.ivoryTint,
    surfaceContainerHighest = AppColors.ivorySurfaceHighest,
)

/**
 * Calm "informational notice" tones (SMHI MESSAGE level) - deliberately never red, unlike Ivory's
 * brand primary. [marker] is for dots/icons (>= 3:1), [text] for any text (>= 4.5:1), both on the card surface.
 * Midnight: gold C9A86A (7.3:1 on 1C1F27). Ivory: dark amber B7791F (3.6:1 on white) / 9A6412 (5.0:1).
 */
@Immutable
data class NoticeColors(val marker: Color, val text: Color)

private val MidnightNotice = NoticeColors(marker = AppColors.midnightAccent, text = AppColors.midnightAccent)
private val IvoryNotice = NoticeColors(marker = Color(0xFFB7791F), text = Color(0xFF9A6412))

val LocalNoticeColors = staticCompositionLocalOf { MidnightNotice }

@Composable
fun TengmoVaderTheme(theme: Theme, content: @Composable () -> Unit) {
    val colorScheme = when (theme) {
        Theme.Midnight -> MidnightColorScheme
        Theme.Ivory -> IvoryColorScheme
    }
    val notice = if (theme == Theme.Midnight) MidnightNotice else IvoryNotice
    CompositionLocalProvider(LocalNoticeColors provides notice) {
        MaterialTheme(colorScheme = colorScheme, typography = appTypography(darkBoost = theme == Theme.Midnight)) {
            // A Surface provides LocalContentColor (onBackground) for every plain Text below it —
            // without one, Material 3 text defaults to black and vanishes on the dark Midnight theme.
            Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background, content = content)
        }
    }
}
