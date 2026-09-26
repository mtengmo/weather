package com.tengmo.vader.ui.overview

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.delay

/** Same cadence as the web app's `REFRESH_INTERVAL_MS` (useObservationData.ts) — FR-008. */
const val REFRESH_INTERVAL_MS = 15 * 60_000L

/** Minimum gap between attempts when a refresh doesn't advance `lastUpdated` (e.g. offline), so a
 *  failing network is retried gently rather than in a tight loop. */
private const val RETRY_BACKOFF_MS = 60_000L

/**
 * T057 / FR-008 / US5 — foreground auto-refresh:
 *  - while the app is in the foreground (lifecycle RESUMED), refreshes every [REFRESH_INTERVAL_MS];
 *  - on returning to the foreground, refreshes immediately when the data is already older than the
 *    interval (a stale `lastUpdatedEpochMillis`, or none at all).
 * It only ever calls [onRefresh]; the caller's state (current screen, scroll position) is never
 * touched, so a refresh doesn't disrupt the user's place (US5 scenario 1).
 */
@Composable
fun RefreshCoordinator(lastUpdatedEpochMillis: Long?, enabled: Boolean, onRefresh: () -> Unit) {
    val lifecycleOwner = LocalLifecycleOwner.current
    val currentOnRefresh by rememberUpdatedState(onRefresh)

    LaunchedEffect(lifecycleOwner, lastUpdatedEpochMillis, enabled) {
        if (!enabled) return@LaunchedEffect
        // repeatOnLifecycle cancels the block when the app is backgrounded and restarts it on the
        // next resume — which recomputes "how stale is the data now?" from scratch.
        lifecycleOwner.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            while (true) {
                val age = lastUpdatedEpochMillis?.let { System.currentTimeMillis() - it } ?: Long.MAX_VALUE
                val remaining = REFRESH_INTERVAL_MS - age
                if (remaining > 0) delay(remaining)
                currentOnRefresh()
                delay(RETRY_BACKOFF_MS)
            }
        }
    }
}
