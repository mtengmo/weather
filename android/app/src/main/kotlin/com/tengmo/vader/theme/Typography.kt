package com.tengmo.vader.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Type system: one family (platform default, Roboto on Android, same plain system face as the web).
// Contrast comes from size + weight, not a second face: a light-weight display numeral for the
// current temperature, medium-weight titles, regular body, medium-weight small labels (muted by
// colour at the call site via onSurfaceVariant). Number-heavy roles use tabular figures so
// temperatures and times line up. All sizes are sp so they follow the system font scale.
private const val TNUM = "tnum"

private fun base(size: Int, line: Int, weight: FontWeight, spacing: Double = 0.0, tabular: Boolean = false) =
    TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = weight,
        fontSize = size.sp,
        lineHeight = line.sp,
        letterSpacing = spacing.sp,
        fontFeatureSettings = if (tabular) TNUM else null,
    )

/** [darkBoost] adds a little line height in the dark Midnight theme, where light-on-dark text reads tighter. */
fun appTypography(darkBoost: Boolean): Typography {
    val extra = if (darkBoost) 2 else 0
    return Typography(
        displayLarge = base(64, 72 + extra, FontWeight.Light, -1.0, tabular = true),
        displayMedium = base(52, 60 + extra, FontWeight.Light, -0.5, tabular = true),
        displaySmall = base(40, 48 + extra, FontWeight.Light, 0.0, tabular = true),
        headlineSmall = base(24, 32 + extra, FontWeight.Medium),
        titleLarge = base(22, 28 + extra, FontWeight.Medium),
        titleMedium = base(17, 24 + extra, FontWeight.Medium, 0.1),
        titleSmall = base(14, 20 + extra, FontWeight.Medium, 0.1),
        bodyLarge = base(16, 24 + extra, FontWeight.Normal, 0.15, tabular = true),
        bodyMedium = base(14, 20 + extra, FontWeight.Normal, 0.2, tabular = true),
        bodySmall = base(12, 17 + extra, FontWeight.Normal, 0.3, tabular = true),
        labelLarge = base(14, 20 + extra, FontWeight.Medium, 0.1),
        labelMedium = base(12, 16 + extra, FontWeight.Medium, 0.4, tabular = true),
        labelSmall = base(11, 16 + extra, FontWeight.Medium, 0.5, tabular = true),
    )
}
