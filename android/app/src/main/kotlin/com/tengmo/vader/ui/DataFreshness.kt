package com.tengmo.vader.ui

import android.text.format.DateFormat
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tengmo.vader.R
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/** Pure description of the freshness status line (JVM-testable). */
sealed class FreshnessText {
    /** No data has ever loaded. */
    data object NoData : FreshnessText()

    /** "Updated [formatted]" — [formatted] is "HH:MM" today, or date + time otherwise. */
    data class Updated(val formatted: String, val isToday: Boolean) : FreshnessText()
}

/** Formats [updatedAtMillis] relative to [nowMillis]: time only when same local day, else
 *  "d MMM time". 12h/24h follows [is24h]. */
fun formatFreshness(
    updatedAtMillis: Long?,
    nowMillis: Long,
    is24h: Boolean,
    zone: ZoneId,
    locale: Locale = Locale.getDefault(),
): FreshnessText {
    if (updatedAtMillis == null) return FreshnessText.NoData
    val updated = Instant.ofEpochMilli(updatedAtMillis).atZone(zone)
    val today = Instant.ofEpochMilli(nowMillis).atZone(zone).toLocalDate()
    val isToday = updated.toLocalDate() == today
    val timePattern = if (is24h) "HH:mm" else "h:mm a"
    val pattern = if (isToday) timePattern else "d MMM $timePattern"
    return FreshnessText.Updated(DateTimeFormatter.ofPattern(pattern, locale).format(updated), isToday)
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
    val context = LocalContext.current
    val is24h = DateFormat.is24HourFormat(context)
    val freshness = formatFreshness(lastUpdatedEpochMillis, System.currentTimeMillis(), is24h, ZoneId.systemDefault())
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
                fontSize = 13.sp,
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
