# Contract: Favorites/Recents Map Screen (User Story 10)

## `package.json`

Add `leaflet` and `react-leaflet` to `dependencies`; `@types/leaflet` to `devDependencies`.

## `src/components/MapView.tsx` (new)

```tsx
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { FavoritePlace, Location } from "../models/types";

interface MapViewProps {
  favorites: FavoritePlace[];
  cachedLocation: Location | null;
  onSelectLocation: (location: Location) => void;
}

function favoriteToLocation(place: FavoritePlace): Location {
  return { latitude: place.latitude, longitude: place.longitude, displayName: place.displayName, source: "favorite" };
}

export default function MapView({ favorites, cachedLocation, onSelectLocation }: MapViewProps) {
  const pins: Location[] = [
    ...favorites.map(favoriteToLocation),
    ...(cachedLocation &&
    !favorites.some((f) => f.latitude === cachedLocation.latitude && f.longitude === cachedLocation.longitude)
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
```

## `src/App.tsx`

```tsx
type View = "graph" | "details" | "overview" | "map";
```

A new header button (grouped with the existing view-switching controls, or a dedicated
`.header-controls` entry) sets `view` to `"map"`. Rendered independent of `selected` (unlike the
other three views, which all require `selected !== null`):

```tsx
{view === "map" && (
  <MapView
    favorites={favorites}
    cachedLocation={getCachedLocation()}
    onSelectLocation={selectLocation}
  />
)}
```

(`selectLocation` is the same function already used by every other selection path — search "View,"
favorites list, current location — so selecting a map pin behaves identically to those.)

## `src/index.css`

Import Leaflet's own base stylesheet (`leaflet/dist/leaflet.css`) once, in `main.tsx` or
`index.css` via `@import`, per Leaflet's own standard integration instructions — required for
correct tile/marker layout, otherwise the map renders visually broken.

## No changes to

- `src/services/weatherApi.ts` or any provider — the map makes zero weather-data requests.
- `src/hooks/useFavorites.ts`, `src/services/locationCache.ts` — read via their existing, unchanged
  APIs (`listFavorites`/`useFavorites()` and `getCachedLocation()` respectively).
