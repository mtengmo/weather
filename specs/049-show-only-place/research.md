# Research: Show Only the Place Name After Selecting a Location

## 1. Where the full name is actually constructed

**Decision**: Only one place builds the full "place, region, country" string: `searchPlaces` in `geocodingApi.ts` (`[r.name, r.admin1, r.country].filter(Boolean).join(", ")`), producing `PlaceCandidate.displayName`. Current-position resolution (`useGeolocation.ts`, via `reverseGeocode`/`getNearestStations`) already yields a single short field with no join — confirmed by reading both call paths — so it needs no change.

**Rationale**: Confirms the fix is scoped to search-originated names only, matching the spec's actual complaint.

## 2. Shorten at construction/read points, not at every render site

**Decision**: Add one pure helper, `placeNameOnly(fullName: string): string`, returning everything before the first comma (trimmed), or the input unchanged if there's no comma. Apply it at exactly three points:
1. `LocationPanel.tsx`'s `candidateToLocation` — the "View" action on a search result, which builds a `Location` directly from a `PlaceCandidate` without going through favorites storage.
2. `favoritesStorage.ts`'s `listFavorites()` — normalizes every favorite's `displayName` on read, regardless of when or with what value it was originally stored.
3. `locationCache.ts`'s `getCachedLocation()` — normalizes the persisted last-selected location's `displayName` on read.

**Rationale**: Every other consumer (header, favorites list, `LocationSwitcher`, `MapView`, chart/table labels) reads `Location`/`FavoritePlace.displayName` as already-given data — they never construct it. Fixing it at these few sources means every consumer is correct for free, with zero changes to `App.tsx`, `FavoritesList.tsx`, `LocationSwitcher.tsx`, `MapView.tsx`, `ObservationChart.tsx`, or `ObservationDetails.tsx`. Read-time normalization (rather than a one-off migration or write-time-only fix) directly satisfies FR-003 — an already-saved favorite or cached location shows shortened immediately, with no re-adding and no data rewrite.

**Alternatives considered**:
- *Shorten at every render site*: rejected — ~10+ files touched for the same outcome, far more surface area for a display-only concern.
- *Migrate stored localStorage data once (rewrite on load)*: rejected — unnecessary; read-time normalization achieves the same visible result without ever needing to write back, and keeps the original full string available in storage in case it's ever wanted again.
- *Shorten at write time only (`addFavorite`)*: rejected alone — doesn't fix favorites already saved before this feature; read-time normalization in `listFavorites()` is needed regardless, which makes a separate write-time change redundant.

## 3. Splitting on comma is safe here

**Decision**: A plain "everything before the first comma" split is sufficient — no need for a smarter parser.

**Rationale**: The full string's only source (`geocodingApi.ts`) always joins with `", "` in a fixed `[name, admin1, country]` order, and a bare place name with no region/country simply has no comma at all (edge case: unchanged output, per spec).
