package com.tengmo.vader.ui

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.sp
import com.tengmo.vader.R
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

private fun ConnectivityManager.isCurrentlyOnline(): Boolean {
    val caps = getNetworkCapabilities(activeNetwork) ?: return false
    return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
}

/** T058 — live connectivity state (true = a validated internet connection). */
@Composable
fun rememberIsOnline(): Boolean {
    val context = LocalContext.current
    val connectivity = remember { context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager }
    var online by remember { mutableStateOf(connectivity.isCurrentlyOnline()) }

    DisposableEffect(connectivity) {
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { online = connectivity.isCurrentlyOnline() }
            override fun onLost(network: Network) { online = connectivity.isCurrentlyOnline() }
            override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) {
                online = connectivity.isCurrentlyOnline()
            }
        }
        connectivity.registerNetworkCallback(
            NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build(),
            callback,
        )
        onDispose { connectivity.unregisterNetworkCallback(callback) }
    }
    return online
}

private val LAST_UPDATED_FORMAT: DateTimeFormatter = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.SHORT)

/**
 * T058 / FR-020 — shown when the displayed data is from the on-device cache (offline or the
 * fetch failed): "Offline — showing data from <time>", or "No data yet" when there is nothing to
 * show. Renders nothing when the data is live.
 */
@Composable
fun OfflineIndicator(showingCachedData: Boolean, lastUpdatedEpochMillis: Long?, hasAnyData: Boolean, modifier: Modifier = Modifier) {
    val online = rememberIsOnline()
    if (!showingCachedData && (online || hasAnyData)) return

    val text = if (hasAnyData && lastUpdatedEpochMillis != null) {
        stringResource(
            R.string.offline_indicator,
            Instant.ofEpochMilli(lastUpdatedEpochMillis).atZone(ZoneId.systemDefault()).format(LAST_UPDATED_FORMAT),
        )
    } else {
        stringResource(R.string.offline_noData)
    }
    Text(text, color = MaterialTheme.colorScheme.error, fontSize = 13.sp, modifier = modifier)
}
