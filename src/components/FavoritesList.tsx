import { useTranslation } from "react-i18next";
import type { FavoritePlace } from "../models/types";

interface FavoritesListProps {
  favorites: FavoritePlace[];
  error: string | null;
  selectedId: string | null;
  onSelect: (place: FavoritePlace) => void;
  onRemove: (id: string) => void;
  onDismissError: () => void;
}

export default function FavoritesList({
  favorites,
  error,
  selectedId,
  onSelect,
  onRemove,
  onDismissError,
}: FavoritesListProps) {
  const { t } = useTranslation();
  return (
    <div className="favorites">
      <h3>{t("favoritesList.title")}</h3>

      {error && (
        <p className="error-banner" role="alert">
          {error}{" "}
          <button type="button" onClick={onDismissError}>
            {t("favoritesList.dismiss")}
          </button>
        </p>
      )}

      {favorites.length === 0 && <p>{t("favoritesList.empty")}</p>}

      <ul className="favorites-list">
        {favorites.map((place) => (
          <li key={place.id}>
            <button
              type="button"
              aria-pressed={selectedId === place.id}
              onClick={() => onSelect(place)}
            >
              {place.displayName}
            </button>
            <button
              type="button"
              onClick={() => onRemove(place.id)}
              aria-label={t("favoritesList.removeAriaLabel", { place: place.displayName })}
            >
              {t("favoritesList.remove")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
