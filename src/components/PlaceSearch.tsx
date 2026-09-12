import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PlaceCandidate } from "../services/geocodingApi";
import { searchPlaces } from "../services/geocodingApi";

interface PlaceSearchProps {
  onAddFavorite: (place: PlaceCandidate) => void;
  onView: (place: PlaceCandidate) => void;
}

export default function PlaceSearch({ onAddFavorite, onView }: PlaceSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      searchPlaces(trimmed)
        .then((candidates) => {
          if (!cancelled) {
            setResults(candidates);
            setSearchError(null);
          }
        })
        .catch(() => {
          if (!cancelled) setSearchError("placeSearch.searchError");
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className="place-search">
      <label htmlFor="place-search-input">{t("placeSearch.label")}</label>
      <input
        id="place-search-input"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("placeSearch.placeholder")}
      />

      {searchError && (
        <p className="error-banner" role="alert">
          {t(searchError)}
        </p>
      )}

      {results.length === 0 && query.trim() && !searchError && <p>{t("placeSearch.noResults")}</p>}

      {results.length > 0 && (
        <ul className="favorites-list">
          {results.map((candidate) => (
            <li key={`${candidate.latitude},${candidate.longitude}`}>
              <span>{candidate.displayName}</span>
              <button
                type="button"
                onClick={() => {
                  onView(candidate);
                  setQuery("");
                  setResults([]);
                }}
              >
                {t("placeSearch.view")}
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddFavorite(candidate);
                  setQuery("");
                  setResults([]);
                }}
              >
                {t("placeSearch.addToFavorites")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
