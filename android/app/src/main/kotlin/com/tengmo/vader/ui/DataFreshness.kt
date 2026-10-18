package com.tengmo.vader.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.tengmo.vader.R
import java.time.Instant
import java.time.ZoneId
import java.util.Locale

/** Pure description of the freshness status line (JVM-testable). */
sealed class FreshnessText {
    /** No data has ever loaded. */
    data object NoData : FreshnessText()

    /** "Updated [formatted]" — [formatted] is "HH:MM" today, or date + time otherwise. */
    data class Updated(val formatted: String, val isToday: Boolean) : FreshnessText()
}

/** Formats [updatedAtMillis] relative to [nowMillis]: time only when same local day, else
 *  "date time". The clock style follows the app language ([TimeFormat]). */
fun formatFreshness(
    updatedAtMillis: Long?,
    nowMillis: Long,
    zone: ZoneId,
    locale: Locale,
): FreshnessText {
    if (updatedAtMillis == null) return FreshnessText.NoData
    val updated = Instant.ofEpochMilli(updatedAtMillis).atZone(zone)
    val today = Instant.ofEpochMilli(nowMillis).atZone(zone).toLocalDate()
    val isToday = updated.toLocalDate() == today
    val formatted = if (isToday) TimeFormat.clock(updated, locale) else TimeFormat.monthDayClock(updated, locale)
    return FreshnessText.Updated(formatted, isToday)
}

/**
 * Status line for the Overview: "Updated HH:MM", "Updating…" during a fetch, or the offline text
 * when a fetch failed and cached data is shown; plus a small refresh button for TalkBack users.
 */
@Composable
fun DataFreshnessIndicator(
    lastUpdatedEpochMillis: Long?,
    isUpdating: Boolean,
    showingCachedData: Boolean,
    hasAnyData: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val freshness = formatFreshness(lastUpdatedEpochMillis, System.currentTimeMillis(), ZoneId.systemDefault(), appLocale())
    val offline = showingCachedData && !isUpdating

    Row(
        modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        if (offline) {
            OfflineIndicator(
                showingCachedData = true,
                lastUpdatedEpochMillis = lastUpdatedEpochMillis,
                hasAnyData = hasAnyData,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
        } else {
            val text = when {
                isUpdating -> stringResource(R.string.freshness_updating)
                freshness is FreshnessText.Updated -> stringResource(R.string.freshness_updatedAt, freshness.formatted)
                else -> ""
            }
            Text(
                text,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        IconButton(onClick = onRefresh, enabled = !isUpdating) {
            Icon(
                painterResource(R.drawable.ic_refresh),
                contentDescription = stringResource(R.string.freshness_refresh),
                modifier = Modifier.size(20.dp),
            )
        }
    }
}
