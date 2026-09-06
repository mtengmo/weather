---

description: "Task list for Reduce API Requests & Hide 0% Rain Chance"
---

# Tasks: Reduce API Requests & Hide 0% Rain Chance

**Input**: Design documents from `/specs/025-reduce-api-requests/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested for this round; regression tests are added alongside each fix
per this session's established practice.

**Organization**: Tasks are grouped by user story (P1: US1, P2: US2, P3: US3), matching spec.md's
priorities.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No new project setup required — all changes touch existing files only.

---

## Phase 2: Foundational

No blocking prerequisites — US1 (`useObservationData.ts` + `App.tsx`), US2
(`smhiProvider.ts` + `weatherApi.ts`), and US3 (`WeatherIconOverview.tsx`'s Rain row) touch
disjoint files and can proceed in any order.

---

## Phase 3: User Story 1 - The Overview loads without fetching data it doesn't show (Priority: P1) 🎯 MVP

**Goal**: Defer nearby-station comparison data fetching until the Details/graph view has been
opened at least once in the session, instead of fetching it unconditionally with every Overview
load.

**Independent Test**: Load the dashboard fresh; confirm no nearby-station request occurs until
the Details/graph view is opened for the first time (per quickstart.md US1).

### Implementation for User Story 1

- [X] T001 [US1] Split `useObservationData`'s single `Promise.all` effect in
      `src/hooks/useObservationData.ts` into two effects: one for
      primary/weekly/multi-source-forecast data (unchanged dependencies), and a new one for
      `nearbyStations`, gated on a new `includeNearbyStations: boolean` parameter — per
      data-model.md
- [X] T002 [US1] Add `hasOpenedDetails` state to `src/App.tsx` (set to `true` the first time
      `view` becomes `"graph"` or `"details"`, never reset), and pass it as
      `includeNearbyStations` to `useObservationData`, per data-model.md
- [X] T003 [P] [US1] Add/update tests in `tests/integration/observationFlow.test.tsx` (or a new
      `tests/unit/useObservationData.test.ts` if none exists) asserting: with
      `includeNearbyStations: false`, `getNearbyStationSeries` is never called and
      `nearbyStations` is `[]`; with `includeNearbyStations: true`, it is called with the current
      location/window/count; flipping `includeNearbyStations` from `false` to `true` does not
      re-trigger `getObservations`/`getMultiSourceForecast` for the same location/window
- [X] T004 [P] [US1] Add an integration test asserting opening the Details or graph view for the
      first time results in `nearbyStations` becoming populated, and returning to the Overview
      afterward does not clear it or trigger a re-fetch

**Checkpoint**: US1 is independently complete — the Overview no longer fetches Details-only data.

---

## Phase 4: User Story 2 - No redundant duplicate requests for the same data (Priority: P2)

**Goal**: Add `smhiProvider.getForecastOnly`, mirroring the existing
Open-Meteo/MET Norway shape, and have `getMultiSourceForecast`'s SMHI branch use it instead of
the full 6-parameter `getObservations` pipeline.

**Independent Test**: Load the dashboard; confirm `smhiProvider.getObservations` (the full
pipeline) is not called by `getMultiSourceForecast`, only by the primary/weekly series fetches
(per quickstart.md US2).

### Implementation for User Story 2

- [X] T005 [US2] Add `getForecastOnly(location, window)` to `src/services/smhiProvider.ts`,
      reusing the existing internal `fetchForecastTimeSeries` + `buildForecastHourlySeries`
      functions, per data-model.md
- [X] T006 [US2] Update `getMultiSourceForecast`'s SMHI branch in `src/services/weatherApi.ts` to
      call `smhiProvider.getForecastOnly` instead of the full `smhiProvider.getObservations`,
      keeping the existing `isSmhiCovered` gate unchanged, per data-model.md
- [X] T007 [P] [US2] Add unit tests for `smhiProvider.getForecastOnly` in
      `tests/unit/smhiProvider.test.ts`, mirroring the existing `openMeteoProvider.getForecastOnly`
      test coverage pattern (forecast observations returned, `issuedAt` threaded, empty/degraded
      case for `last-30-days` or a failed fetch)
- [X] T008 [P] [US2] Update `tests/unit/weatherApi.test.ts`'s `getMultiSourceForecast` tests to
      mock `smhiProvider.getForecastOnly` instead of `smhiProvider.getObservations`, and add an
      assertion that `smhiProvider.getObservations` is never called by `getMultiSourceForecast`

**Checkpoint**: US1 and US2 both independently complete.

---

## Phase 5: User Story 3 - No "0%" chance of rain shown (Priority: P3)

**Goal**: Hide the chance-of-rain percentage on the Rain row when it's genuinely 0%.

**Independent Test**: View a forecast period with a genuine 0% chance of rain; confirm no
percentage is shown (per quickstart.md US3).

### Implementation for User Story 3

- [X] T009 [US3] Add `&& point.chanceOfRain > 0` to the chance-of-rain render condition in
      `src/components/WeatherIconOverview.tsx`'s Rain row, per data-model.md
- [X] T010 [P] [US3] Add an integration test in `tests/integration/weatherIconOverview.test.tsx`
      asserting a period with `chanceOfRain: 0` renders no `.weather-timeline-bar-chance` element,
      while a period with `chanceOfRain: 1` (or higher) still renders it

**Checkpoint**: All three user stories independently complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T011 Run `npm test` and fix any regressions introduced by T001-T010
- [X] T012 Run `npm run lint` and fix any issues
- [X] T013 Run `npm run build` and confirm a clean build
- [X] T014 Run `npm run build && npm run preview`, then use live Playwright request-count
      verification (per quickstart.md's US1/US2 scenarios) against the production preview — not
      `npm run dev` — to confirm the request-count reduction is real and not a dev-tooling
      artifact, matching this session's established practice
- [X] T015 Bump `package.json`'s version as the final step before commit, per standing practice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: None — skipped, no blocking prerequisites
- **User Stories (Phase 3-5)**: Fully independent of one another (disjoint files) — may proceed in
  any order or in parallel
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each User Story

- US1: T001 → T002 (App.tsx depends on the hook's new parameter) → T003/T004 (tests, parallel)
- US2: T005 → T006 (call-site depends on the new function existing) → T007/T008 (tests, parallel)
- US3: T009 → T010

### Parallel Opportunities

- US1, US2, and US3 can be implemented in parallel by different contributors — no shared files
  (`useObservationData.ts`/`App.tsx` vs. `smhiProvider.ts`/`weatherApi.ts` vs.
  `WeatherIconOverview.tsx`)
- Within each story, its test task(s) are parallel with each other once the implementation lands

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3 (US1: defer nearby-station data)
2. **STOP and VALIDATE**: Run quickstart.md's US1 scenario against a production preview build
3. Deploy/demo if ready

### Incremental Delivery

1. US1 (P1, the largest request-volume win) → validate → MVP
2. US2 (P2, eliminate the confirmed duplicate) → validate
3. US3 (P3, hide 0% rain) → validate
4. Phase 6 polish pass across everything → commit + push (per standing memory: commit+push
   automatically after `/speckit-implement`, with the version bump from T015 included in that
   same commit)
