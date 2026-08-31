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
  return (
    <div className="favorites">
      <h3>Favorite places</h3>

      {error && (
        <p className="error-banner" role="alert">
          {error}{" "}
          <button type="button" onClick={onDismissError}>
            Dismiss
          </button>
        </p>
      )}

      {favorites.length === 0 && <p>No favorite places saved yet.</p>}

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
            <button type="button" onClick={() => onRemove(place.id)} aria-label={`Remove ${place.displayName}`}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
