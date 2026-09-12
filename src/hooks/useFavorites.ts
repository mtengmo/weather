import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FAVORITES_LIMIT, type FavoritePlace } from "../models/types";
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
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<FavoritePlace[]>(() => listFavorites());
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(
    (place: Pick<FavoritePlace, "latitude" | "longitude" | "displayName">) => {
      try {
        addFavorite(place);
        setFavorites(listFavorites());
        setError(null);
      } catch (err) {
        // Translated here (064-swedish-translation) rather than using the thrown error's own
        // English `.message` directly — these error classes live in a plain service module with
        // no React tree to hook `useTranslation()` into.
        if (err instanceof DuplicateFavoriteError) {
          setError(t("favoritesError.duplicate"));
        } else if (err instanceof FavoritesLimitReachedError) {
          setError(t("favoritesError.limitReached", { limit: FAVORITES_LIMIT }));
        } else if (err instanceof StorageUnavailableError) {
          setError(t("favoritesError.storageUnavailable"));
        } else {
          throw err;
        }
      }
    },
    [t]
  );

  const remove = useCallback((id: string) => {
    removeFavorite(id);
    setFavorites(listFavorites());
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { favorites, error, add, remove, clearError };
}
