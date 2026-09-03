import type { FavoritePlace, Location } from "../models/types";
import type { GeolocationStatus } from "../hooks/useGeolocation";

interface LocationSwitcherProps {
  currentLocation: Location | null;
  favorites: FavoritePlace[];
  selected: Location | null;
  onSelect: (location: Location) => void;
  geoStatus: GeolocationStatus;
  onRequestCurrentLocation: () => void;
}

function favoriteToLocation(place: FavoritePlace): Location {
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    displayName: place.displayName,
    source: "favorite",
  };
}

function isSameLocation(a: Location | null, b: Location): boolean {
  return !!a && a.latitude === b.latitude && a.longitude === b.longitude && a.source === b.source;
}

export default function LocationSwitcher({
  currentLocation,
  favorites,
  selected,
  onSelect,
  geoStatus,
  onRequestCurrentLocation,
}: LocationSwitcherProps) {
  return (
    <nav aria-label="Select location" className="location-switcher">
      {currentLocation ? (
        <button
          type="button"
          aria-pressed={isSameLocation(selected, currentLocation)}
          onClick={() => onSelect(currentLocation)}
        >
          Current Location
        </button>
      ) : (
        (geoStatus === "denied" || geoStatus === "unavailable") && (
          // Without this, declining the browser's permission prompt once permanently hides
          // any way back to current-location from within the app (014, FR-004).
          <button type="button" onClick={onRequestCurrentLocation}>
            Use current location
          </button>
        )
      )}
      {favorites.map((place) => {
        const location = favoriteToLocation(place);
        return (
          <button
            key={place.id}
            type="button"
            aria-pressed={isSameLocation(selected, location)}
            onClick={() => onSelect(location)}
          >
            {place.displayName}
          </button>
        );
      })}
    </nav>
  );
}
