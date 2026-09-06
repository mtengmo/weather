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

/**
 * A minimal v1 map screen (016-dashboard-polish-round-two, US10): pins for the user's
 * favorited and most-recently-viewed locations only — not open-ended "nearby" discovery, plus a
 * real radar imagery layer (032-dashboard-polish-round-seven, US1, replacing
 * 031-map-precipitation-overlay's forecast-circle approximation). Selecting a pin reuses the
 * same `onSelectLocation` (App.tsx's `selectLocation`) every other selection path already uses.
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

  return (
    <section aria-label="Map">
      <MapContainer center={center} zoom={5} style={{ height: 480 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {radarTileUrl && (
          <TileLayer
            className="map-radar-layer"
            attribution='Radar &copy; <a href="https://www.rainviewer.com/">RainViewer</a>'
            url={radarTileUrl}
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
    </section>
  );
}
