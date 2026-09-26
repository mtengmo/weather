package com.tengmo.vader.ui.map

import android.view.MotionEvent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.platform.LocalContext
import com.tengmo.vader.data.model.Location
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker

/**
 * T044 — the native map surface (research.md §8): OSM base tiles with one marker per pin
 * (favorites + last-viewed, like MapView.tsx). Tapping a marker's info window calls
 * [onSelectLocation]. Weather overlays are applied on top by [MapOverlays] (T045).
 * Uses osmdroid, so the map is the app's own rendering — never an embedded third-party weather site
 * (FR-001a, the "no embedded third-party maps" project decision).
 */
@Composable
fun MapSurface(
    pins: List<Location>,
    overlay: MapOverlay,
    radarTileUrl: String?,
    openWeatherMapKey: String,
    onSelectLocation: (Location) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val mapView = remember {
        Configuration.getInstance().userAgentValue = context.packageName
        MapView(context).apply {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(true)
            controller.setZoom(5.0)
            // A parent scroll container must not steal map drag gestures.
            setOnTouchListener { v, event ->
                if (event.action == MotionEvent.ACTION_DOWN) v.parent?.requestDisallowInterceptTouchEvent(true)
                false
            }
        }
    }

    DisposableEffect(Unit) {
        mapView.onResume()
        onDispose { mapView.onPause(); mapView.onDetach() }
    }

    AndroidView(
        modifier = modifier,
        factory = { mapView },
        update = { view ->
            view.overlays.clear()
            applyOverlay(view, overlay, radarTileUrl, openWeatherMapKey)
            pins.forEach { pin ->
                view.overlays.add(
                    Marker(view).apply {
                        position = GeoPoint(pin.latitude, pin.longitude)
                        title = pin.displayName
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                        setOnMarkerClickListener { _, _ ->
                            onSelectLocation(pin)
                            true
                        }
                    },
                )
            }
            pins.firstOrNull()?.let { view.controller.setCenter(GeoPoint(it.latitude, it.longitude)) }
            view.invalidate()
        },
    )
}
