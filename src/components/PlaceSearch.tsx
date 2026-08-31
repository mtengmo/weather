import { useEffect, useState } from "react";
import type { PlaceCandidate } from "../services/geocodingApi";
import { searchPlaces } from "../services/geocodingApi";

interface PlaceSearchProps {
  onSelect: (place: PlaceCandidate) => void;
}

export default function PlaceSearch({ onSelect }: PlaceSearchProps) {
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
          if (!cancelled) setSearchError("Couldn't search for places. Please try again.");
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className="place-search">
      <label htmlFor="place-search-input">Search for a place</label>
      <input
        id="place-search-input"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. Stockholm"
      />

      {searchError && (
        <p className="error-banner" role="alert">
          {searchError}
        </p>
      )}

      {results.length === 0 && query.trim() && !searchError && <p>No places found.</p>}

      {results.length > 0 && (
        <ul className="favorites-list">
          {results.map((candidate) => (
            <li key={`${candidate.latitude},${candidate.longitude}`}>
              <span>{candidate.displayName}</span>
              <button
                type="button"
                onClick={() => {
                  onSelect(candidate);
                  setQuery("");
                  setResults([]);
                }}
              >
                Add to favorites
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
