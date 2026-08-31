import { useCallback, useState } from "react";
import type { FavoritePlace } from "../models/types";
import {
  addFavorite,
  DuplicateFavoriteError,
  FavoritesLimitReachedError,
  listFavorites,
  removeFavorite,
  StorageUnavailableError,
} from "../services/favoritesStorage";

export interface UseFavoritesResult {
  favorites: FavoritePlace[];
  error: string | null;
  add: (place: Pick<FavoritePlace, "latitude" | "longitude" | "displayName">) => void;
  remove: (id: string) => void;
  clearError: () => void;
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<FavoritePlace[]>(() => listFavorites());
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(
    (place: Pick<FavoritePlace, "latitude" | "longitude" | "displayName">) => {
      try {
        addFavorite(place);
        setFavorites(listFavorites());
        setError(null);
      } catch (err) {
        if (
          err instanceof DuplicateFavoriteError ||
          err instanceof FavoritesLimitReachedError ||
          err instanceof StorageUnavailableError
        ) {
          setError(err.message);
        } else {
          throw err;
        }
      }
    },
    []
  );

  const remove = useCallback((id: string) => {
    removeFavorite(id);
    setFavorites(listFavorites());
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { favorites, error, add, remove, clearError };
}
