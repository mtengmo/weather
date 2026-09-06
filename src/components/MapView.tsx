import { useEffect, useState } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { FavoritePlace, Location } from "../models/types";
import * as openMeteoProvider from "../services/openMeteoProvider";
import { precipitationVisualIntensity } from "./mapPrecipitationVisual";
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

/**
 * A minimal v1 map screen (016-dashboard-polish-round-two, US10): pins for the user's
 * favorited and most-recently-viewed locations only — not open-ended "nearby" discovery. Each
 * pin optionally carries a lightweight forecast-precipitation overlay circle
 * (031-map-precipitation-overlay) — the map otherwise still renders no other weather values.
 * Selecting a pin reuses the same `onSelectLocation` (App.tsx's `selectLocation`) every other
 * selection path already uses.
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

  const [precipitationByPin, setPrecipitationByPin] = useState<Map<string, number>>(new Map());

  // Fetches each pin's near-term forecast precipitation independently of the pins themselves —
  // a slow/failed fetch never delays or affects pin/Marker rendering above (US2/US3,
  // research.md §4). Keyed on the pins' own keys (not object identity) so it only re-fetches
  // when the actual set of locations changes.
  const pinsKey = pins.map(pinKey).join("|");
  useEffect(() => {
    let cancelled = false;

    if (pins.length === 0) {
      setPrecipitationByPin(new Map());
      return;
    }

    Promise.allSettled(
      pins.map((pin) => openMeteoProvider.getForecastOnly(pin, "last-24-hours"))
    ).then((results) => {
      if (cancelled) return;
      const next = new Map<string, number>();
      results.forEach((result, i) => {
        if (result.status !== "fulfilled") return;
        const mm = result.value[0]?.precipitation;
        if (mm != null && mm > 0) next.set(pinKey(pins[i]), mm);
      });
      setPrecipitationByPin(next);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinsKey]);

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
      {precipitationByPin.size > 0 && (
        <p className="map-precipitation-legend">
          Shaded circles show forecast precipitation for the upcoming hour — not live radar.
        </p>
      )}
      <MapContainer center={center} zoom={5} style={{ height: 480 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((pin) => {
          const mm = precipitationByPin.get(pinKey(pin));
          if (mm == null) return null;
          const { radius, opacity } = precipitationVisualIntensity(mm);
          return (
            <CircleMarker
              key={`precip-${pinKey(pin)}`}
              center={[pin.latitude, pin.longitude]}
              radius={radius}
              interactive={false}
              pathOptions={{
                className: "map-precipitation-circle",
                color: "#2f72b8",
                fillColor: "#2f72b8",
                fillOpacity: opacity,
                opacity: 0,
              }}
            />
          );
        })}
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
