---

description: "Task list for 042-preserve-scroll-on-window-change"
---

# Tasks: Keep Scroll Position When Switching the Time Window

**Input**: Design documents from `/specs/042-preserve-scroll-on-window-change/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/use-observation-data.md](./contracts/use-observation-data.md), [quickstart.md](./quickstart.md)

**Tests**: Included — extends the project's existing `tests/unit/useObservationData.test.ts`.

**Organization**: Tasks are grouped by user story. US1 (dashboard Overview) and US2 (Details/graph view) share the exact same fix (both consume the same hook), so US1 delivers the whole mechanism and US2 is effectively a verification-only story confirming the shared fix also covers the second view.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files/tests, no dependency on an incomplete task)
- **[Story]**: US1 or US2, per `spec.md`
- File paths are exact and relative to the repo root

## Phase 1: Setup

**Purpose**: Confirm baseline before touching anything.

- [X] T001 Run `npm test` from the repo root to confirm the current `main` branch is green, so any failures found later are attributable to this feature
  - **Result**: 568/568 passed (baseline).

**Checkpoint**: Baseline confirmed.

---

## Phase 2: Foundational

*No foundational tasks.* The fix lives entirely in `useObservationData.ts`, which both the Overview (US1) and Details/graph (US2) views already share — there's no separate shared infrastructure to build first.

---

## Phase 3: User Story 1 - Stay where I am when switching time windows (Priority: P1) 🎯 MVP

**Goal**: A window-only change (same location) never resets `series`/`weeklySeries` to `null`, so no view collapses and scroll position is never disturbed (FR-001, FR-003, FR-004, FR-005).

**Independent Test**: Render the hook, resolve an initial fetch, change only `window` (same location), and confirm `series`/`weeklySeries` are never observed as `null` between the two fetches.

### Tests for User Story 1

- [X] T002 [P] [US1] In `tests/unit/useObservationData.test.ts`, add a test: render the hook for a location, wait for the initial `series` to resolve, mock `getObservations` to return a controllable (unresolved) promise, change only the `window` prop via `rerender`, and assert `result.current.series` (and `weeklySeries`, where applicable) is still the *previous* value (not `null`) while the new fetch is pending
- [X] T003 [P] [US1] In `tests/unit/useObservationData.test.ts`, add a test: same setup, but change the `location` prop (different coordinates) instead of `window`, and assert `result.current.series` DOES become `null` while the new fetch is pending — confirms the existing first-load/location-change behavior is preserved
- [X] T004 [P] [US1] In `tests/unit/useObservationData.test.ts`, add a test asserting `result.current.isRefreshing` is `true` while a window-only refetch is pending (same controllable-promise technique as T002) and `false` once it resolves, and also `false` throughout the very first load for a location (per `data-model.md`)
  - **Result**: T002-T004 implemented as three tests using a shared `pendingPromise()` helper to hold `getObservations` in flight and inspect intermediate state. All pass.

### Implementation for User Story 1

- [X] T005 [US1] In `src/hooks/useObservationData.ts`, add a `useRef<{ latitude: number; longitude: number } | null>(null)` to track the previously-fetched location's coordinates, per `research.md` §3
- [X] T006 [US1] In `src/hooks/useObservationData.ts`, add an `isRefreshing` state (`useState<boolean>(false)`) and include it in the returned `UseObservationDataResult` object and its interface (per `data-model.md`)
- [X] T007 [US1] In `src/hooks/useObservationData.ts`'s primary effect (~line 56-85), replace the unconditional `setSeries(null)`/`setMultiSourceForecast([])`/`setWeeklySeries(null)` calls with logic that: compares `location`'s coordinates to the ref from T005; if they differ (or the ref is empty), resets to `null`/`[]` as today; if they match, sets `isRefreshing` to `true` and leaves `series`/`weeklySeries` untouched. Update the ref with the current location's coordinates. In the `.then()` callback, set `isRefreshing` back to `false` alongside the existing `setSeries`/`setWeeklySeries`/`setMultiSourceForecast`/`setLastUpdated` calls (per `contracts/use-observation-data.md`)
  - **Result**: Implemented as designed. `tsc --noEmit`/`tsc -b` clean, no consuming component needed any change.

**Checkpoint**: User Story 1 is independently functional — window-only changes no longer null out data, verified at the hook level.

---

## Phase 4: User Story 2 - The same fix applies to the Details/graph view (Priority: P2)

**Goal**: Confirm the Details/graph view's 24h/7d/30d toggle is fixed by the same hook change (FR-002) — this view consumes the identical `useObservationData` hook/`series` value as the Overview, so no separate implementation is expected.

**Independent Test**: On the Details/graph view, scroll down, press a different time-window button, and confirm no jump to the top (manual — see `quickstart.md`).

### Tests for User Story 2

- [X] T008 [US2] Review `src/components/ObservationChart.tsx` (~line 301) and `src/components/ObservationDetails.tsx` (~line 58) to confirm both read `series` from the same `useObservationData` call in `App.tsx` (no separate/duplicate fetch) — if confirmed, no new automated test is needed here since T002-T004 already cover the shared hook; document the confirmation in this task's result rather than adding a redundant test
  - **Result**: Confirmed. `App.tsx` calls `useObservationData` exactly once (line 60) and passes the same `series`/`obsWindow` into `ObservationChart`, `ObservationDetails`, and `WeatherIconOverview` (lines 220-256) — no separate fetch anywhere. The Details/graph view's window toggle is fixed by the identical hook-level change; no additional code was needed.

**Checkpoint**: Both user stories work together — this is the full feature, fixed by a single shared change.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T009 [P] Run `npm test` (full suite) and `npm run lint` to confirm no regressions — pay particular attention to existing tests asserting "Loading …" text on first load (`weatherIconOverview.test.tsx`, `chartAndDetails.test.tsx`, `observationFlow.test.tsx` if applicable) to confirm first-load behavior is unchanged
  - **Result**: `npm test` — 571/571 pass (35 files; the 3 new tests plus everything else). `npm run lint` — clean. `npm run build` — one `tsc -b` type error caught and fixed (an `initialProps` literal-type inference issue in the new test, unrelated to the hook logic itself); clean after the fix. All existing first-load "Loading …" tests pass unmodified.
- [X] T010 Bump the version in `package.json` per project convention
  - **Result**: Bumped `0.5.2` → `0.5.3`.
- [X] T011 Run the full `quickstart.md` validation (automated + manual) as a final sign-off, including the manual scroll-position checks on both views that automated tests can't directly assert (jsdom doesn't lay out real scroll positions)
  - **Result**: Automated section covered by T002-T004 and T009. Manual section (real scroll-position behavior in a browser) is left for the user to confirm — this sandboxed environment has no interactive browser to visually verify the scroll no longer jumps, but the underlying mechanism (no `series === null` collapse during a window-only change) is what caused the jump, confirmed via the hook-level tests.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: None — skipped
- **User Story 1 (Phase 3)**: Depends only on Phase 1 — delivers the entire fix
- **User Story 2 (Phase 4)**: Depends on User Story 1 being complete (it verifies the same underlying change, not a separate implementation)
- **Polish (Phase 5)**: Depends on both user stories being complete

### Parallel Opportunities

- T002, T003, T004 (US1 tests) can be written in parallel with each other before T005-T007 implement the behavior they assert

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (the actual fix, hook-level)
3. **STOP and VALIDATE**: Confirm via `npm test` and a manual check on the dashboard Overview
4. Ship — this already fixes both views, since they share the hook

### Incremental Delivery

1. Phase 1 → baseline confirmed
2. Phase 3 (US1) → implement and validate the hook fix → this is the whole feature
3. Phase 4 (US2) → confirm (not re-implement) the same fix covers the Details/graph view
4. Phase 5 → polish, version bump, final sign-off

## Notes

- No new dependencies, files, or architectural changes — one hook, one existing test file.
- Per `research.md` §2, no component (`WeatherIconOverview.tsx`, `ObservationChart.tsx`, `ObservationDetails.tsx`, `Footer.tsx`) needs any code change — this task list intentionally contains no tasks touching those files beyond the read-only confirmation in T008.
