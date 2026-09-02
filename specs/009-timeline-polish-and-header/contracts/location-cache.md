# Contract: Location Cache Service

## `src/services/locationCache.ts` (new file)

```ts
import type { Location } from "../models/types";

const STORAGE_KEY = "weather-app:last-location:v1";

export function getCachedLocation(): Location | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Minimal shape validation — never trust raw localStorage content blindly.
    if (
      typeof parsed?.latitude === "number" &&
      typeof parsed?.longitude === "number" &&
      typeof parsed?.displayName === "string" &&
      (parsed?.source === "current-position" || parsed?.source === "favorite")
    ) {
      return parsed as Location;
    }
    return null;
  } catch {
    return null;
  }
}

export function setCachedLocation(location: Location): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Best-effort; the location simply won't persist in this browser session.
  }
}
```

## Call sites

- `App.tsx`'s `selectLocation(location)`: calls `setCachedLocation(location)` immediately after
  `setSelected(location)`.
- `App.tsx`'s mount-time effect (new, runs once): reads `getCachedLocation()`; if non-null and
  (for `source: "favorite"`) still present in the loaded `favorites` list by
  latitude/longitude match, calls `setSelected(cached)`. Otherwise leaves `selected` for the
  existing `currentLocation`-sync effect to populate as it does today.

## Non-goals

- No expiry/TTL on the cached entry — it persists until the user explicitly selects a different
  location (which overwrites it) or clears their browser storage.
- No cross-device sync — this is browser-local `localStorage`, matching every other preference
  this app already persists (`units.ts`, `theme.ts`, `favoritesStorage.ts`).
