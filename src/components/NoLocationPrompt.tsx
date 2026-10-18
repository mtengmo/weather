import { useTranslation } from "react-i18next";
import type { FavoritePlace, Location } from "../models/types";
import type { PlaceCandidate } from "../services/geocodingApi";
import { placeNameOnly } from "../services/locationName";
import PlaceSearch from "./PlaceSearch";
import FavoritesList from "./FavoritesList";

interface NoLocationPromptProps {
  favorites: FavoritePlace[];
  favoritesError: string | null;
  onSelect: (location: Location) => void;
  onAddFavorite: (candidate: PlaceCandidate) => void;
  onRemoveFavorite: (id: string) => void;
  onDismissFavoritesError: () => void;
  onRequestCurrentLocation: () => void;
  /** Why there is no location: the browser denied access vs. it simply could not find one. */
  reason?: "denied" | "unavailable";
  /** Hides search + favorites (the header's location panel is open and shows them instead). */
  compact?: boolean;
}

/** First-start empty state shown when geolocation is denied/unavailable and nothing is selected. */
export default function NoLocationPrompt({
  favorites,
  favoritesError,
  onSelect,
  onAddFavorite,
  onRemoveFavorite,
  onDismissFavoritesError,
  onRequestCurrentLocation,
  reason = "unavailable",
  compact = false,
}: NoLocationPromptProps) {
  const { t } = useTranslation();
  return (
    <section className="no-location-prompt" aria-labelledby="no-location-title">
      <h2 id="no-location-title">{t("noLocation.title")}</h2>
      <p role="alert">{t(reason === "denied" ? "app.locationDenied" : "app.locationUnavailable")}</p>
      {!compact && (
        <button type="button" onClick={onRequestCurrentLocation}>
          {t("noLocation.useMyLocation")}
        </button>
      )}
      {!compact && (
        <>
          <PlaceSearch
            onAddFavorite={onAddFavorite}
            onView={(place) =>
              onSelect({
                latitude: place.latitude,
                longitude: place.longitude,
                displayName: placeNameOnly(place.displayName),
                source: "favorite",
              })
            }
          />
          <FavoritesList
            favorites={favorites}
            error={favoritesError}
            selectedId={null}
            onSelect={(place) =>
              onSelect({
                latitude: place.latitude,
                longitude: place.longitude,
                displayName: place.displayName,
                source: "favorite",
              })
            }
            onRemove={onRemoveFavorite}
            onDismissError={onDismissFavoritesError}
          />
        </>
      )}
    </section>
  );
}
