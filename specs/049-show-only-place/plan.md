# Implementation Plan: Show Only the Place Name After Selecting a Location

**Branch**: `049-show-only-place` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/049-show-only-place/spec.md`

## Summary

`Location.displayName`/`FavoritePlace.displayName` is a single stored field, set once (full "place, region, country") when a location is found via search, and reused unchanged everywhere the location's name appears. Rather than touching every render site, this feature shortens the name at its few *construction/read* points — where a full search-result name becomes a stored `Location`/`FavoritePlace`, and where already-saved data is read back — so every consumer downstream (header, favorites list, location switcher, map pins, chart/table labels) automatically shows the short form with no per-render-site changes. Search results (`PlaceCandidate.displayName`, rendered only in `PlaceSearch.tsx`) are untouched — they're never passed through the shortening step.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18

**Primary Dependencies**: None new

**Storage**: `localStorage` (favorites, last-selected-location cache) — read-time normalization only, no migration/rewrite of stored data needed

**Testing**: Vitest + Testing Library

**Target Platform**: Web (existing PWA)

**Constraints**: Must not change `PlaceSearch.tsx`'s own results list (full name); must work for favorites/cached locations saved before this feature, without any explicit migration step

**Scale/Scope**: One new pure helper function, applied at exactly 3 existing construction/read points

## Constitution Check

Constitution file is an unfilled template — no gates apply.

## Project Structure

### Documentation (this feature)

```text
specs/049-show-only-place/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── services/locationName.ts         # New: placeNameOnly() pure helper
├── services/favoritesStorage.ts     # listFavorites(): normalize each returned displayName
├── services/locationCache.ts        # getCachedLocation(): normalize the returned displayName
└── components/LocationPanel.tsx     # candidateToLocation(): normalize for the "View" (non-favorite) path
```

**Structure Decision**: Single existing web app. No changes to `PlaceSearch.tsx`, `FavoritesList.tsx`, `LocationSwitcher.tsx`, `MapView.tsx`, `App.tsx`, or any chart/table component — all inherit the short name automatically once it's correct at the 3 points above, since they all consume `Location`/`FavoritePlace.displayName` as already-given data.
