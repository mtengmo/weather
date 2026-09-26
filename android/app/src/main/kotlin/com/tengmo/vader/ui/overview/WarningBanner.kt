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
import androidx.compose.ui.unit.sp
import com.tengmo.vader.R
import com.tengmo.vader.data.model.WeatherWarning
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

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

private val DATE_TIME_FORMAT: DateTimeFormatter =
    DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT)

private fun formatDateTime(iso: String): String =
    Instant.parse(iso).atZone(ZoneId.systemDefault()).format(DATE_TIME_FORMAT)

/** T036 — port of src/components/WarningBanner.tsx: persistent, collapsible banner for the
 *  viewed location's active/upcoming official warnings, leading with the most severe (already
 *  sorted by WeatherRepository.getWarningsForLocation), expandable to the full list. Not
 *  dismissible (057-remove-dismiss-capability). */
@Composable
fun WarningBanner(warnings: List<WeatherWarning>, modifier: Modifier = Modifier) {
    if (warnings.isEmpty()) return
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
            Text(leading.severityLabel, color = Color.White, fontSize = 12.sp)
            Text(leading.title, color = Color.White, fontSize = 16.sp)
            if (!leading.isActive) Text(startsInLabel(leading.validFrom), color = Color.White, fontSize = 12.sp)
            if (moreCount > 0) {
                Text(stringResource(R.string.warningBanner_moreCount, moreCount.toString()), color = Color.White, fontSize = 12.sp)
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
                        fontSize = 14.sp,
                        color = severityColor(warning.severityCode),
                    )
                    Text(warning.areaName, fontSize = 12.sp)
                    val since = if (warning.isActive) stringResource(R.string.warningBanner_since) else stringResource(R.string.warningBanner_from)
                    val until = warning.validUntil?.let { " " + stringResource(R.string.warningBanner_until, formatDateTime(it)) } ?: ""
                    Text("$since ${formatDateTime(warning.validFrom)}$until", fontSize = 12.sp)
                    Text(warning.description, fontSize = 13.sp)
                }
            }
        }
    }
}
