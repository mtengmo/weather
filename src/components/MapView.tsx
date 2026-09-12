import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { FavoritePlace, Location } from "../models/types";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet's default marker icon references image URLs that don't resolve correctly through a
// bundler (a well-known Leaflet issue) — re-point it at the bundled asset URLs instead.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapViewProps {
  favorites: FavoritePlace[];
  cachedLocation: Location | null;
  onSelectLocation: (location: Location) => void;
}

function favoriteToLocation(place: FavoritePlace): Location {
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    displayName: place.displayName,
    source: "favorite",
  };
}

function pinKey(pin: Location): string {
  return `${pin.latitude},${pin.longitude}`;
}

const RAINVIEWER_METADATA_URL = "https://api.rainviewer.com/public/weather-maps.json";

interface RainviewerFrame {
  path: string;
}

interface RainviewerResponse {
  host: string;
  radar?: { past?: RainviewerFrame[] };
}

/** Fetches RainViewer's free, key-free public radar metadata and builds a Leaflet tile URL
 *  template from the latest available frame — `null` on any failure or an empty frame list, so
 *  the caller can simply omit the radar layer rather than render a broken one
 *  (032-dashboard-polish-round-seven, US1, research.md §1/§2). */
async function fetchRadarTileUrl(): Promise<string | null> {
  try {
    const response = await fetch(RAINVIEWER_METADATA_URL);
    if (!response.ok) return null;
    const data = (await response.json()) as RainviewerResponse;
    const frames = data.radar?.past ?? [];
    if (frames.length === 0) return null;
    const latest = frames[frames.length - 1];
    return `${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
  } catch {
    return null;
  }
}

type MapOverlay = "rain" | "temperature" | "wind" | "none";

/**
 * A minimal v1 map screen (016-dashboard-polish-round-two, US10): pins for the user's
 * favorited and most-recently-viewed locations only — not open-ended "nearby" discovery, plus a
 * real radar imagery layer (032-dashboard-polish-round-seven, US1, replacing
 * 031-map-precipitation-overlay's forecast-circle approximation), and a picker for Rain/
 * Temperature/Wind/None overlays (040-map-temp-wind-overlays; Wind switched from an animated
 * embedded Windy.com iframe to a static OpenWeatherMap tile merged into this app's own map after
 * a follow-up — the embed felt disconnected from the app even though it was animated). Selecting
 * a pin reuses the same `onSelectLocation` (App.tsx's `selectLocation`) every other selection path
 * already uses.
 */
export default function MapView({ favorites, cachedLocation, onSelectLocation }: MapViewProps) {
  const { t } = useTranslation();
  const pins: Location[] = [
    ...favorites.map(favoriteToLocation),
    ...(cachedLocation &&
    !favorites.some(
      (f) => f.latitude === cachedLocation.latitude && f.longitude === cachedLocation.longitude
    )
      ? [cachedLocation]
      : []),
  ];

  const [radarTileUrl, setRadarTileUrl] = useState<string | null>(null);
  // Defaults to "rain", matching the map's existing behavior before this overlay picker existed
  // (FR-003).
  const [overlay, setOverlay] = useState<MapOverlay>("rain");

  // Fetched once per mount, independent of pin rendering — a slow/failed fetch never delays or
  // affects pins/navigation above (FR-004, research.md §2).
  useEffect(() => {
    let cancelled = false;

    if (pins.length === 0) {
      setRadarTileUrl(null);
      return;
    }

    fetchRadarTileUrl().then((url) => {
      if (!cancelled) setRadarTileUrl(url);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins.length > 0]);

  if (pins.length === 0) {
    return (
      <section aria-label={t("mapView.ariaLabel")}>
        <p>{t("mapView.empty")}</p>
      </section>
    );
  }

  const center: [number, number] = [pins[0].latitude, pins[0].longitude];
  // A free OpenWeatherMap account/key is required for the Temperature tiles (no key-free
  // equivalent exists — research.md §1); read at render time (not module scope) so tests can
  // stub it per-case. Omit the Temperature option entirely rather than offering a button that
  // would only ever render broken (401) tiles (FR-008, data-model.md Configuration).
  const openWeatherMapApiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY as string | undefined;

  const overlays: { value: MapOverlay; label: string }[] = [
    { value: "rain", label: t("mapView.overlayRain") },
    ...(openWeatherMapApiKey
      ? [
          { value: "temperature" as const, label: t("mapView.overlayTemperature") },
          { value: "wind" as const, label: t("mapView.overlayWind") },
        ]
      : []),
    { value: "none", label: t("mapView.overlayNone") },
  ];

  return (
    <section aria-label={t("mapView.ariaLabel")}>
      <div className="window-toggle" role="group" aria-label={t("mapView.overlayAriaLabel")}>
        {overlays.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={overlay === o.value}
            onClick={() => setOverlay(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <MapContainer center={center} zoom={5} style={{ height: 480 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {overlay === "rain" && radarTileUrl && (
          <TileLayer
            className="map-radar-layer"
            attribution='Radar &copy; <a href="https://www.rainviewer.com/">RainViewer</a>'
            url={radarTileUrl}
            opacity={0.5}
            zIndex={10}
          />
        )}
        {overlay === "temperature" && openWeatherMapApiKey && (
          <TileLayer
            className="map-temperature-layer"
            attribution='Temperature &copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
            url={`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${openWeatherMapApiKey}`}
            opacity={0.5}
            zIndex={10}
          />
        )}
        {overlay === "wind" && openWeatherMapApiKey && (
          // A static color-coded wind-strength layer merged into the app's own map, rather than
          // an embedded third-party site (the earlier Windy.com iframe approach) — the user found
          // a separate embedded map jarring even though it was animated (040-map-temp-wind-
          // overlays follow-up). Same OpenWeatherMap tile product/key as Temperature.
          <TileLayer
            className="map-wind-layer"
            attribution='Wind &copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
            url={`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${openWeatherMapApiKey}`}
            opacity={0.5}
            zIndex={10}
          />
        )}
        {pins.map((pin) => (
          <Marker key={pinKey(pin)} position={[pin.latitude, pin.longitude]}>
            <Popup>
              {pin.displayName}
              <br />
              <button type="button" onClick={() => onSelectLocation(pin)}>
                {t("mapView.view")}
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </section>
  );
}
