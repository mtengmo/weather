# Tasks: Reduce Loading Requests

**Input**: Design documents from `specs/062-reduce-loading-requests/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included, per this project's established convention (full `npm test` run required before
every commit).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Phase 1: Setup

- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: US1 (progressive rendering) and US2 (no duplicate fetch on window switch) are both
delivered by the same rewrite of `useObservationData`'s single main effect — this phase is that
rewrite. US1's and US2's own phases below are tests only.

- [X] T002 In `src/hooks/useObservationData.ts`, add the `WindowFetchCache` shape (data-model.md) as
      a `useRef<WindowFetchCache | null>` plus two small helpers: one that returns a cached
      `{ series, multiSource }` entry for the current `window` only when the ref's `locationKey`
      matches the current location AND its `refreshGeneration` matches the current `refreshTick`
      (otherwise `undefined`), and one that writes an entry into the ref — creating a fresh
      `{ locationKey, refreshGeneration, byWindow: new Map() }` first whenever the existing ref's
      `locationKey`/`refreshGeneration` don't match (research.md §3).
      (Implemented as two separate maps, `seriesByWindow`/`multiSourceByWindow`, rather than one
      combined map — simpler read/write logic for the same effect, no design change.)
- [X] T003 In `src/hooks/useObservationData.ts`'s main effect, replace the single
      `Promise.all([...]).then(([primary, multi, weekly]) => { ...three setters... })` with three
      independent chains: (a) primary — consult T002's cache for `window` first; on a miss, call
      `getObservations(location, window)`, write the result into the cache, then `setSeries` +
      `setLastUpdated` (only if not `cancelled`); (b) multi-source — same cache-then-fetch pattern
      for `getMultiSourceForecast(location, window)`, then `setMultiSourceForecast`; (c) weekly —
      when `window === "last-7-days"`, reuse chain (a)'s result directly (as today); otherwise
      consult the cache for `"last-7-days"` specifically, falling back to
      `getObservations(location, "last-7-days")` on a miss, writing it into the cache under that
      key, then `setWeeklySeries`. Each chain writes to the cache regardless of `cancelled` (so a
      superseded-but-still-in-flight request still populates the cache for next time,
      research.md §3), but only calls its setter(s) when not `cancelled`. Join all three with
      `Promise.allSettled` to drive the existing `setIsRefreshing(false)` call, unchanged in
      meaning (research.md §2).

**Checkpoint**: The hook's request pattern is rewritten — US1 and US2 phases below add coverage for
it (no further implementation needed in either).

---

## Phase 3: User Story 1 - See weather data as soon as it's ready, not all at once (Priority: P1)

**Goal**: Confirm `series`, `multiSourceForecast`, and `weeklySeries` each become available as soon
as their own fetch resolves, rather than all three waiting on the slowest one.

**Independent Test**: Resolve `getObservations` quickly but leave `getMultiSourceForecast` pending;
confirm `series`/`weeklySeries` are already populated before `multiSourceForecast` resolves.

### Tests for User Story 1

- [X] T004 [P] [US1] Unit test in `tests/unit/useObservationData.test.ts`: with `getObservations`
      resolved immediately but `getMultiSourceForecast` left pending, `result.current.series` and
      `result.current.weeklySeries` are both non-null while `result.current.multiSourceForecast` is
      still `[]`; once `getMultiSourceForecast` resolves, `multiSourceForecast` updates too — proves
      the three pieces render independently (FR-001).

**Checkpoint**: User Story 1 is verified — no implementation task needed here (delivered by Phase 2).

---

## Phase 4: User Story 2 - Switching between 24h/3d/7d doesn't repeat a request already made (Priority: P1)

**Goal**: Confirm a window switch for the same, already-open location reuses cached data instead of
re-fetching, in both directions, while a genuine location change or periodic refresh still fetches
fresh.

**Independent Test**: Load a location on `"last-24-hours"`, switch to `"last-7-days"`, then back —
confirm no additional `getObservations`/`getMultiSourceForecast` calls beyond the initial load.

### Tests for User Story 2

- [X] T005 [P] [US2] In `tests/unit/useObservationData.test.ts`, adjust the existing test "keeps the
      previous series/weeklySeries (never null) while a window-only refetch is pending": switch the
      target window from `"last-7-days"` (now cache-hit under this feature, so it no longer exercises
      a genuinely pending fetch) to `"last-30-days"` (never pre-cached alongside `"last-24-hours"`,
      per research.md §1/§3) — preserves the test's original intent (stale data stays visible while
      a real fetch is in flight) unchanged.
- [X] T006 [P] [US2] Unit test in `tests/unit/useObservationData.test.ts`: starting on
      `"last-24-hours"`, switching to `"last-7-days"` and back to `"last-24-hours"` issues no
      additional `getObservations`/`getMultiSourceForecast` calls beyond the initial load's calls
      (FR-002, FR-003, both directions).
      (`getMultiSourceForecast` for `"last-7-days"` is a genuine cache miss the first time it's
      visited, since the initial 24h load never fetches multi-source data for the weekly window —
      confirmed correct against the actual pre-feature behavior, not a bug; the round trip's
      *second* visit to each window is the cache-hit case this test actually proves.)
- [X] T007 [P] [US2] Unit test in `tests/unit/useObservationData.test.ts`: after an initial load,
      advancing the periodic refresh timer by 15 minutes (059-periodically-auto-refresh, reusing
      that feature's existing fake-timer test pattern) still issues fresh
      `getObservations`/`getMultiSourceForecast` calls even though the window's data was already
      cached — the cache must never suppress the existing auto-refresh guarantee.
- [X] T008 [P] [US2] Unit test in `tests/unit/useObservationData.test.ts`: switching to a different
      location that happens to reuse the same window as the previous location always fetches fresh
      data for the new location — the cache never crosses a location change (FR-006).
- [X] T009 [US2] Integration test in `tests/integration/weatherIconOverview.test.tsx`: through the
      real `WeatherIconOverview`/hook wiring, loading a location on the 24-hour view, switching to
      the 7-day view via its own control, then back to 24-hour, issues no duplicate
      `getObservations`/`getMultiSourceForecast` calls for either window beyond the initial load
      (quickstart.md step 2, end-to-end confirmation of T006).
      (Also found and fixed one pre-existing test, "triggers no duplicate getObservations call for
      last-7-days when switching to/from the 7-day tab," which had explicitly asserted the *old*
      redundant-fetch behavior as its expected outcome — updated to assert the new no-duplicate
      behavior this feature delivers.)

**Checkpoint**: User Stories 1 AND 2 both verified — no implementation task needed in this phase
either (delivered by Phase 2); this phase is coverage only.

---

## Phase 5: User Story 3 - Comparison data stays deferred until Details is opened (Priority: P3)

**Goal**: Lock in (regression-guard) the already-correct behavior that nearby-station comparison
data only loads once Details is opened.

**Independent Test**: Render the Overview without opening Details; confirm zero
`getNearbyStationSeries` calls. Open Details; confirm exactly one such call fires.

### Tests for User Story 3

- [X] T010 [US3] Integration test in `tests/integration/weatherIconOverview.test.tsx`: rendering the
      Overview and never opening Details issues zero `getNearbyStationSeries` calls during the
      visit; opening Details for the first time issues exactly one (SC-003).
      (Found this was already fully covered end-to-end through the real `App` wiring by
      `appHeader.test.tsx`'s existing "does not fetch nearby-station data on the Overview" /
      "fetches nearby-station data once the Details/graph view is opened for the first time" tests
      — 025-reduce-api-requests. No new test added; a comment in `weatherIconOverview.test.tsx`
      points to that existing coverage instead of duplicating it.)

**Checkpoint**: All three user stories verified — Phase 2's rewrite is now fully covered.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T011 [P] Run `npm run lint`.
- [X] T012 [P] Run `npx tsc -b`.
- [X] T013 Run `npm test` (full suite) — also confirms no other existing test's call-count
      assertions were broken by Phase 2's rewrite (research.md's test audit found none besides
      T005, but the full suite is the actual gate).
      (The full suite found one more pre-existing test the initial audit missed — fixed as part of
      T009 above.)
- [X] T014 Run `npm run build`.
- [X] T015 Bump `package.json` version (patch).
- [X] T016 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (T002 blocks T003; T003 is
  the actual behavior change every later test exercises).
- **User Story 1 (Phase 3)**: Depends on Foundational only.
- **User Story 2 (Phase 4)**: Depends on Foundational only; independent of Phase 3.
- **User Story 3 (Phase 5)**: Depends on Foundational only (in practice touches no code Phase 2
  changed, but its regression value only matters once Phase 2's rewrite has landed in the same
  file).
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Within Each User Story

- Phases 3-5 are test-only; nothing within them depends on task order beyond "Phase 2 must be done
  first."

### Parallel Opportunities

- T005-T008 are all `[P]` — independent test cases in the same file, no shared mutable state
  between them (each uses its own `renderHook` instance).
- T004 is `[P]` with all of Phase 4's tests (different concern, same file).
- T009 and T010 are integration tests in the same file but independent scenarios — could run in
  parallel if written by different people, though not marked `[P]` here since they're the last
  tasks in their respective phases with no other same-file task alongside them.

---

## Implementation Strategy

### MVP First (Foundational + User Story 2 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational — this alone delivers both the request-reduction (US2) and
   progressive-rendering (US1) behavior; without it nothing else in this feature exists.
3. Complete Phase 4: User Story 2 tests — proves the literal "alot of api requests" complaint is
   fixed.
4. **STOP and VALIDATE**: run `npm run dev`, watch the Network tab per quickstart.md step 3.

### Incremental Delivery

1. Setup + Foundational → the actual fix is live.
2. Add User Story 1 tests → progressive-rendering behavior proven.
3. Add User Story 2 tests → no-duplicate-fetch behavior proven, both directions, refresh-safe,
   location-safe.
4. Add User Story 3 test → Details-stays-lazy guarantee locked in.
5. Polish → lint/typecheck/full test suite/build/version bump/commit.
