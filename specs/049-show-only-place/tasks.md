# Tasks: Show Only the Place Name After Selecting a Location

**Input**: Design documents from `/specs/049-show-only-place/`

**Tests**: Included — new unit test for the helper, plus assertions in existing storage/cache/header tests.

## Phase 1: Setup

- [X] T001 Confirm `npm test`/`npm run lint`/`npm run build` pass on current `main` as a clean baseline.

## Phase 2: Foundational

- [X] T002 Create `src/services/locationName.ts` exporting `placeNameOnly(fullName: string): string` — returns the substring before the first `,` (trimmed), or `fullName` unchanged if there's no comma.
- [X] T003 [P] Create `tests/unit/locationName.test.ts`: covers a full "place, region, country" string, a bare name (no comma), and an edge case with extra whitespace around commas.

**Checkpoint**: Helper exists and is tested in isolation.

---

## Phase 3: User Story 1 - See just the place name once a location is chosen (Priority: P1)

### Tests for User Story 1

- [X] T004 [P] [US1] In `tests/unit/favoritesStorage.test.ts`, add a test: a favorite written directly to `localStorage` with a full "place, region, country" `displayName` (bypassing `addFavorite`, simulating a pre-existing save) reads back via `listFavorites()` with just the place name.
- [X] T005 [P] [US1] In `tests/unit/locationCache.test.ts`, add an equivalent test for `getCachedLocation()`.
- [X] T006 [P] [US1] In `tests/integration/appHeader.test.tsx`, add/extend a test: selecting a search result via "View" shows just the place name in the header (`.current-location-name`), not the full search-result string.

### Implementation for User Story 1

- [X] T007 [US1] In `src/services/favoritesStorage.ts`, import `placeNameOnly` and apply it to each favorite's `displayName` inside `listFavorites()` before returning.
- [X] T008 [US1] In `src/services/locationCache.ts`, import `placeNameOnly` and apply it to the parsed location's `displayName` inside `getCachedLocation()` before returning.
- [X] T009 [US1] In `src/components/LocationPanel.tsx`, import `placeNameOnly` and apply it in `candidateToLocation()` when building the `Location`'s `displayName` from `place.displayName`.

**Checkpoint**: Header, favorites list, location switcher, map pins, and chart/table labels all show the short name for any selected location, old or new.

---

## Phase 4: User Story 2 - Search results still show enough to tell places apart (Priority: P1)

### Tests for User Story 2

- [X] T010 [P] [US2] Confirm (no new code expected) that `tests/integration/appHeader.test.tsx`'s existing search-results assertions still expect the full "place, region, country" string in the results dropdown itself — `PlaceSearch.tsx` is untouched by T007-T009.

**Checkpoint**: Search results remain fully disambiguating; only post-selection displays changed.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T011 [P] Run `npm run lint`.
- [X] T012 [P] Run `npx tsc -b`.
- [X] T013 Run `npm test` (full suite).
- [X] T014 Run `npm run build`.
- [X] T015 Bump `package.json` version (patch).
- [X] T016 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).

## Dependencies

- Phase 2 blocks Phase 3 (the helper must exist first).
- Phase 4 is a verification-only pass over Phase 3's changes — no separate implementation.
- Phase 5 depends on Phases 3-4 complete.
