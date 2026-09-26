package com.tengmo.vader.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.tengmo.vader.MainActivity
import com.tengmo.vader.ServiceLocator
import com.tengmo.vader.data.model.Location
import com.tengmo.vader.data.model.LocationSource

/**
 * T069 / FR-024 — tapping a widget opens the app on the Overview of the place that widget shows.
 * The place travels in a `tengmovader://overview?lat=..&lon=..&name=..` deep link (declared on
 * MainActivity in the manifest); [handleIntent] turns it into the app's last-viewed location, which
 * the Overview picks up exactly as it does for a map-pin or favorites selection.
 */
object WidgetTapHandler {
    private const val SCHEME = "tengmovader"
    private const val HOST = "overview"

    /** Intent that opens the app on [location]'s Overview (or just the app if the location is
     *  unknown yet, e.g. a "My location" widget that has not resolved a position). */
    fun overviewIntent(context: Context, location: Location?): Intent {
        val uri = if (location == null) {
            Uri.parse("$SCHEME://$HOST")
        } else {
            Uri.Builder()
                .scheme(SCHEME).authority(HOST)
                .appendQueryParameter("lat", location.latitude.toString())
                .appendQueryParameter("lon", location.longitude.toString())
                .appendQueryParameter("name", location.displayName)
                .build()
        }
        return Intent(Intent.ACTION_VIEW, uri, context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }

    /** Parses the location out of a widget-tap intent, or null if it is not one / has no place. */
    fun locationFrom(intent: Intent?): Location? {
        val data = intent?.data ?: return null
        if (data.scheme != SCHEME || data.host != HOST) return null
        val lat = data.getQueryParameter("lat")?.toDoubleOrNull() ?: return null
        val lon = data.getQueryParameter("lon")?.toDoubleOrNull() ?: return null
        val name = data.getQueryParameter("name").orEmpty()
        return Location(lat, lon, name, LocationSource.Favorite)
    }

    /** Makes a tapped widget's place the app's current place. Call from MainActivity.onCreate and
     *  onNewIntent. */
    suspend fun handleIntent(context: Context, intent: Intent?) {
        val location = locationFrom(intent) ?: return
        ServiceLocator.get(context).preferencesStore.setLastViewedLocation(location)
    }
}
