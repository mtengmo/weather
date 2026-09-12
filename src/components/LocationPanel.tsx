import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FavoritePlace, Location } from "../models/types";
import type { PlaceCandidate } from "../services/geocodingApi";
import type { GeolocationStatus } from "../hooks/useGeolocation";
import { placeNameOnly } from "../services/locationName";
import LocationSwitcher from "./LocationSwitcher";
import PlaceSearch from "./PlaceSearch";
import FavoritesList from "./FavoritesList";

interface LocationPanelProps {
  currentLocation: Location | null;
  favorites: FavoritePlace[];
  favoritesError: string | null;
  selected: Location | null;
  onSelect: (location: Location) => void;
  onAddFavorite: (candidate: PlaceCandidate) => void;
  onRemoveFavorite: (id: string) => void;
  onDismissFavoritesError: () => void;
  geoStatus: GeolocationStatus;
  onRequestCurrentLocation: () => void;
}

function candidateToLocation(place: PlaceCandidate): Location {
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    // Search results keep the full "place, region, country" name for disambiguation
    // (PlaceSearch.tsx), but once viewed as a selected location, only the place itself is shown
    // (049-show-only-place).
    displayName: placeNameOnly(place.displayName),
    source: "favorite",
  };
}

/**
 * Consolidates current-location/favorites/search behind a single "Change location" control
 * instead of always-visible separate header sections — the same three components underneath
 * are unchanged, only their mount point and visibility move (013-overview-default-and-layout,
 * research.md §2).
 */
export default function LocationPanel({
  currentLocation,
  favorites,
  favoritesError,
  selected,
  onSelect,
  onAddFavorite,
  onRemoveFavorite,
  onDismissFavoritesError,
  geoStatus,
  onRequestCurrentLocation,
}: LocationPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectAndClose(location: Location) {
    onSelect(location);
    setOpen(false);
  }

  return (
    <div className="location-panel" ref={panelRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="location-panel-content"
        onClick={() => setOpen((prev) => !prev)}
      >
        {t("locationPanel.changeLocation")}
      </button>

      {open && (
        <div id="location-panel-content" className="location-panel-content">
          <button
            type="button"
            className="location-panel-close"
            aria-label={t("locationPanel.close")}
            onClick={() => setOpen(false)}
          >
            ×
          </button>

          {/* Favorites are already listed by FavoritesList below (with select + remove) — pass
              an empty favorites array here so LocationSwitcher only contributes the
              "Current Location" button, avoiding a duplicate favorites list in the panel. */}
          <LocationSwitcher
            currentLocation={currentLocation}
            favorites={[]}
            selected={selected}
            onSelect={selectAndClose}
            geoStatus={geoStatus}
            onRequestCurrentLocation={onRequestCurrentLocation}
          />

          <PlaceSearch
            onAddFavorite={onAddFavorite}
            onView={(place) => selectAndClose(candidateToLocation(place))}
          />

          <FavoritesList
            favorites={favorites}
            error={favoritesError}
            selectedId={
              favorites.find(
                (f) =>
                  selected &&
                  f.latitude === selected.latitude &&
                  f.longitude === selected.longitude &&
                  selected.source === "favorite"
              )?.id ?? null
            }
            onSelect={(place) =>
              selectAndClose({
                latitude: place.latitude,
                longitude: place.longitude,
                displayName: place.displayName,
                source: "favorite",
              })
            }
            onRemove={onRemoveFavorite}
            onDismissError={onDismissFavoritesError}
          />
        </div>
      )}
    </div>
  );
}
