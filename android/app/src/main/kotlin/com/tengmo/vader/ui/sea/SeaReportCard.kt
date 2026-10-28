package com.tengmo.vader.ui.sea

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R
import com.tengmo.vader.ui.TimeFormat
import com.tengmo.vader.ui.appLocale
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZonedDateTime

/** Parses SMHI's "updated" stamp (UTC "Z" or with an offset); null when absent or malformed. */
internal fun parseReportUpdated(updated: String?): ZonedDateTime? {
    if (updated == null) return null
    val zone = ZoneId.systemDefault()
    return runCatching { Instant.parse(updated).atZone(zone) }.getOrNull()
        ?: runCatching { OffsetDateTime.parse(updated).atZoneSameInstant(zone) }.getOrNull()
}

/** SMHI's sjorapport as plain text at the top of the sea page. Hidden until it has loaded (and on failure). */
@Composable
fun SeaReportCard(state: SeaReportState, modifier: Modifier = Modifier) {
    if (state !is SeaReportState.Ready) return
    val report = state.report
    val locale = appLocale()
    val updated = parseReportUpdated(report.updated)
    val uiIsSwedish = TimeFormat.isSwedish(locale)
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    val title = stringResource(R.string.seaReport_title)

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Column(Modifier.semantics(mergeDescendants = true) { heading() }) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                if (updated != null) {
                    Text(
                        stringResource(R.string.seaReport_updated, TimeFormat.clock(updated, locale)),
                        style = MaterialTheme.typography.labelSmall,
                        color = muted,
                    )
                }
            }
            Text(report.overview, style = MaterialTheme.typography.bodyMedium)
            report.areaName?.let { Text(it, style = MaterialTheme.typography.titleSmall) }
            report.areaTexts.forEach { Text(it, style = MaterialTheme.typography.bodyMedium) }
            report.forecast?.let { fc ->
                val text = buildString {
                    fc.sky?.let { append(it).append(' ') }
                    fc.winds.forEach { w -> append(if (w.prefix != null) "${w.prefix}: ${w.text} " else "${w.text} ") }
                }.trim()
                Text(text, style = MaterialTheme.typography.bodyMedium)
            }
            // Always the Swedish report (SMHI's English text is staler and more abbreviated): say so
            // when the app is not in Swedish.
            val source = stringResource(R.string.seaReport_source)
            Text(
                if (uiIsSwedish) source else "$source · ${stringResource(R.string.seaReport_swedishNote)}",
                style = MaterialTheme.typography.labelSmall,
                color = muted,
            )
        }
    }
}
