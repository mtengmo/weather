package com.tengmo.vader.ui.overview

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R
import com.tengmo.vader.data.model.WeatherWarning
import java.time.Instant
import java.time.ZoneId
import androidx.compose.ui.text.font.FontStyle
import com.tengmo.vader.ui.TimeFormat
import com.tengmo.vader.ui.appLocale
import java.util.Locale

/** Severity colors matching the web app's warning-level-* classes (yellow/orange/red; the
 *  informational MESSAGE level never reaches this banner — WarningBanner only ever receives
 *  non-informational warnings, see App.tsx). */
private fun severityColor(code: String): Color = when (code.uppercase()) {
    "YELLOW", "CLASS_1" -> Color(0xFFC79A1F)
    "ORANGE", "CLASS_2" -> Color(0xFFD9701A)
    "RED", "CLASS_3" -> Color(0xFFC0392B)
    else -> Color(0xFF6B6570)
}

@Composable
private fun startsInLabel(validFrom: String): String {
    val hours = maxOf(0L, Math.round((Instant.parse(validFrom).toEpochMilli() - System.currentTimeMillis()) / 3_600_000.0))
    return when {
        hours < 1 -> stringResource(R.string.warningBanner_startsWithinHour)
        hours < 24 -> stringResource(R.string.warningBanner_startsInHours, hours.toString())
        else -> {
            val days = Math.round(hours / 24.0)
            if (days == 1L) {
                stringResource(R.string.warningBanner_startsTomorrow)
            } else {
                stringResource(R.string.warningBanner_startsInDays, days.toString())
            }
        }
    }
}

private fun formatDateTime(iso: String, locale: Locale): String =
    TimeFormat.dateTime(Instant.parse(iso).atZone(ZoneId.systemDefault()), locale)

/** T036 — port of src/components/WarningBanner.tsx: persistent, collapsible banner for the
 *  viewed location's active/upcoming official warnings, leading with the most severe (already
 *  sorted by WeatherRepository.getWarningsForLocation), expandable to the full list. Not
 *  dismissible (057-remove-dismiss-capability). */
@Composable
fun WarningBanner(warnings: List<WeatherWarning>, modifier: Modifier = Modifier) {
    if (warnings.isEmpty()) return
    val locale = appLocale()
    var expanded by remember { mutableStateOf(false) }
    val leading = warnings.first()
    val moreCount = warnings.size - 1

    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(severityColor(leading.severityCode).copy(alpha = if (leading.isActive) 0.9f else 0.55f))
                .clickable { expanded = !expanded }
                .padding(12.dp),
        ) {
            Text(leading.severityLabel, color = Color.White, style = MaterialTheme.typography.bodySmall)
            Text(leading.title, color = Color.White, style = MaterialTheme.typography.titleMedium)
            if (!leading.isActive) Text(startsInLabel(leading.validFrom), color = Color.White, style = MaterialTheme.typography.bodySmall)
            if (moreCount > 0) {
                Text(stringResource(R.string.warningBanner_moreCount, moreCount.toString()), color = Color.White, style = MaterialTheme.typography.bodySmall)
            }
        }

        if (expanded) {
            warnings.forEach { warning ->
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(12.dp),
                ) {
                    Text(
                        "${warning.severityLabel}: ${warning.title}" +
                            if (!warning.isActive) " — ${startsInLabel(warning.validFrom)}" else "",
                        style = MaterialTheme.typography.bodyMedium,
                        color = severityColor(warning.severityCode),
                    )
                    Text(warning.areaName, style = MaterialTheme.typography.bodySmall)
                    val since = if (warning.isActive) stringResource(R.string.warningBanner_since) else stringResource(R.string.warningBanner_from)
                    val until = warning.validUntil?.let { " " + stringResource(R.string.warningBanner_until, formatDateTime(it, locale)) } ?: ""
                    Text("$since ${formatDateTime(warning.validFrom, locale)}$until", style = MaterialTheme.typography.bodySmall)
                    Text(warning.description, style = MaterialTheme.typography.bodyMedium)
                    // SMHI sometimes publishes a warning in one language only: say so rather than mixing silently.
                    if (warning.textLanguage.isNotEmpty() && warning.textLanguage != TimeFormat.language(locale)) {
                        Text(
                            stringResource(
                                if (warning.textLanguage == "en") R.string.warningBanner_onlyInEnglish else R.string.warningBanner_onlyInSwedish,
                            ),
                            style = MaterialTheme.typography.bodySmall,
                            fontStyle = FontStyle.Italic,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}
