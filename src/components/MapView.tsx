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

/**
 * A minimal v1 map screen (016-dashboard-polish-round-two, US10): pins for the user's
 * favorited and most-recently-viewed locations only — not open-ended "nearby" discovery, and no
 * weather values rendered on the map itself (FR-013/FR-016, spec Assumptions). Selecting a pin
 * reuses the same `onSelectLocation` (App.tsx's `selectLocation`) every other selection path
 * already uses.
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
        {pins.map((pin) => (
          <Marker key={`${pin.latitude},${pin.longitude}`} position={[pin.latitude, pin.longitude]}>
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
