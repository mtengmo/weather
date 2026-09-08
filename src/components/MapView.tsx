import { useEffect, useState } from "react";
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

/** Builds the Windy.com embed iframe URL centered on the given coordinate, showing the animated
 *  wind layer. Free, key-free public embed product — confirmed live (no X-Frame-Options/CSP
 *  frame-ancestors restriction, 200 response) since the natural alternative (leaflet-velocity fed
 *  by NOAA's own GFS wind data) turned out to be CORS-blocked for direct browser access, which
 *  would require a backend proxy (040-map-temp-wind-overlays, US2, research.md §2). */
function windyEmbedUrl([lat, lon]: [number, number]): string {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    detailLat: String(lat),
    detailLon: String(lon),
    zoom: "5",
    level: "surface",
    overlay: "wind",
    menu: "",
    message: "true",
    marker: "",
    calendar: "now",
    pressure: "",
    type: "map",
    location: "coordinates",
    detail: "",
    metricWind: "default",
    metricTemp: "default",
    radarRange: "-1",
  });
  return `https://embed.windy.com/embed2.html?${params.toString()}`;
}

/**
 * A minimal v1 map screen (016-dashboard-polish-round-two, US10): pins for the user's
 * favorited and most-recently-viewed locations only — not open-ended "nearby" discovery, plus a
 * real radar imagery layer (032-dashboard-polish-round-seven, US1, replacing
 * 031-map-precipitation-overlay's forecast-circle approximation), and a picker for Rain/
 * Temperature/Wind/None overlays (040-map-temp-wind-overlays). Selecting a pin reuses the same
 * `onSelectLocation` (App.tsx's `selectLocation`) every other selection path already uses.
 */
export default function MapView({ favorites, cachedLocation, onSelectLocation }: MapViewProps) {
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
      <section aria-label="Map">
        <p>
          No locations to show yet. Search for a place and add it to favorites, or view one, to
          see it here.
        </p>
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
    { value: "rain", label: "Rain" },
    ...(openWeatherMapApiKey ? [{ value: "temperature" as const, label: "Temperature" }] : []),
    { value: "wind", label: "Wind" },
    { value: "none", label: "None" },
  ];

  return (
    <section aria-label="Map">
      <div className="window-toggle" role="group" aria-label="Map overlay">
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

      {overlay === "wind" ? (
        // A separate embedded map rather than a layer on MapContainer — Windy's animated wind
        // visualization has no equivalent Leaflet TileLayer form (research.md §3). Windy's own
        // embed UI already carries its required attribution/branding, so no extra credit line is
        // added here (unlike Rain/Temperature, which use bare TileLayers with no UI of their own).
        <iframe
          title="Wind map"
          src={windyEmbedUrl(center)}
          style={{ height: 480, width: "100%", border: "none" }}
        />
      ) : (
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
          {pins.map((pin) => (
            <Marker key={pinKey(pin)} position={[pin.latitude, pin.longitude]}>
              <Popup>
                {pin.displayName}
                <br />
                <button type="button" onClick={() => onSelectLocation(pin)}>
                  View
                </button>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </section>
  );
}
