package com.tengmo.vader.ui.map

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.serialization.Serializable
import org.osmdroid.tileprovider.MapTileProviderBasic
import org.osmdroid.tileprovider.tilesource.OnlineTileSourceBase
import org.osmdroid.util.MapTileIndex
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.TilesOverlay

// T045 — port of MapView.tsx's radar layer: RainViewer radar (key-free) is the only overlay.

private const val RAINVIEWER_METADATA_URL = "https://api.rainviewer.com/public/weather-maps.json"

@Serializable
private data class RainviewerFrame(val path: String)

@Serializable
private data class RainviewerRadar(val past: List<RainviewerFrame> = emptyList())

@Serializable
private data class RainviewerResponse(val host: String, val radar: RainviewerRadar? = null)

/** Latest RainViewer radar frame's tile URL template (`{z}/{x}/{y}` substituted by the tile
 *  source), or null on any failure/empty list so the caller simply omits the radar layer rather
 *  than render a broken one (032-dashboard-polish-round-seven, research.md §1/§2). */
suspend fun fetchRadarTileUrl(client: HttpClient): String? = runCatching {
    val response: RainviewerResponse = client.get(RAINVIEWER_METADATA_URL).body()
    val latest = response.radar?.past?.lastOrNull() ?: return null
    "${response.host}${latest.path}/256/%d/%d/%d/2/1_1.png"
}.getOrNull()

/** A simple XYZ tile source whose URL is built by a `(zoom, x, y) -> String` lambda. */
private class XyzTileSource(name: String, private val urlFor: (Int, Int, Int) -> String) :
    OnlineTileSourceBase(name, 0, 12, 256, ".png", arrayOf("")) {
    override fun getTileURLString(pMapTileIndex: Long): String = urlFor(
        MapTileIndex.getZoom(pMapTileIndex),
        MapTileIndex.getX(pMapTileIndex),
        MapTileIndex.getY(pMapTileIndex),
    )
}

private fun tilesOverlay(view: MapView, name: String, urlFor: (Int, Int, Int) -> String): TilesOverlay {
    val provider = MapTileProviderBasic(view.context, XyzTileSource(name, urlFor))
    return TilesOverlay(provider, view.context).apply {
        loadingBackgroundColor = android.graphics.Color.TRANSPARENT
        loadingLineColor = android.graphics.Color.TRANSPARENT
        // 50% opacity like the web app's `opacity={0.5}` layers.
        setColorFilter(
            android.graphics.ColorMatrixColorFilter(
                android.graphics.ColorMatrix().apply { setScale(1f, 1f, 1f, 0.5f) },
            ),
        )
    }
}

/** Adds the RainViewer radar tiles (if available) to [view]; base tiles and markers are managed by
 *  MapSurface. */
fun applyRadarOverlay(view: MapView, radarTileUrl: String?) {
    radarTileUrl?.let { template ->
        view.overlays.add(tilesOverlay(view, "rainviewer") { z, x, y -> String.format(template, z, x, y) })
    }
}
