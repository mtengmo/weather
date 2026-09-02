import { useEffect, useRef, useState } from "react";
import type { FavoritePlace, Location } from "../models/types";
import type { PlaceCandidate } from "../services/geocodingApi";
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
}: LocationPanelProps) {
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
        Change location
      </button>

      {open && (
        <div id="location-panel-content" className="location-panel-content">
          <button
            type="button"
            className="location-panel-close"
            aria-label="Close"
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
          />

          <PlaceSearch onSelect={onAddFavorite} />

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
