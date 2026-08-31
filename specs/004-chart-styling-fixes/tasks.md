---

description: "Task list template for feature implementation"
---

# Tasks: Nearby-Station Name Fix and Temperature/Wind Chart Styling

**Input**: Design documents from `/specs/004-chart-styling-fixes/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested in the feature spec. Light regression tests are still included alongside the files they cover, consistent with this repo's existing testing conventions.

**Organization**: Tasks are grouped by user story (US1-US4 from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US4)
- Exact file paths are included in every task description

## Path Conventions

Single frontend-only project (per [plan.md](./plan.md)): `src/`, `tests/` at repository root. No new directories beyond new files listed below.

---

## Phase 1: Setup

**Purpose**: Confirm the existing project baseline before making changes. No new dependencies.

- [X] T001 Run `npm install`, `npm run test`, and `npm run build` at the repo root to confirm a clean baseline before edits; no code changes in this task.

**Checkpoint**: Baseline confirmed green — safe to start Foundational work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data-shape changes that User Story 3 and User Story 4 both need, per [data-model.md](./data-model.md). User Story 1 and User Story 2 have no foundational dependency and could start immediately after Setup.

**⚠️ CRITICAL**: No User Story 3 or User Story 4 work can begin until this phase is complete.

- [X] T002 Extend `src/models/types.ts` per [data-model.md](./data-model.md): add `windHigh`/`windLow` (`number | null`) to `DailyAggregate`; add `export type HighLowVisibility = boolean` and `export const DEFAULT_HIGH_LOW_VISIBLE = true`.

**Checkpoint**: Foundation ready — User Story 3 and User Story 4 can now be implemented independently. User Story 1 and User Story 2 do not depend on this and may be done in any order relative to it.

---

## Phase 3: User Story 1 - See a name for every nearby comparison station (Priority: P1) 🎯 MVP

**Goal**: Every nearby comparison station shows a readable name everywhere it appears, even when the data source's own name for it is blank.

**Independent Test**: View a location with a nearby station that has no name in the data source; confirm the app shows a fallback label ("Unnamed station") instead of a blank name in the legend, tooltip, and details table (quickstart.md scenario 1).

### Implementation for User Story 1

- [X] T003 [US1] In `src/services/smhiProvider.ts`'s `nearestActiveStations`, change `displayName: s.name` to fall back to `"Unnamed station"` when `s.name` is blank/whitespace-only after trimming, per [contracts/station-name-and-chart-rows.md](./contracts/station-name-and-chart-rows.md).
- [X] T004 [P] [US1] Add a test to `tests/unit/smhiProvider.test.ts`: a station with an empty (or whitespace-only) `name` in the mocked station list resolves to `displayName: "Unnamed station"` via `getNearestStations`; a station with a real name is unaffected.
- [X] T005 [US1] Run [quickstart.md](./quickstart.md) scenario 1: confirm no nearby-station name is ever blank across the legend, tooltip, and details table, and that real station names are unaffected.

**Checkpoint**: User Story 1 is fully functional and independently testable — no more blank station names anywhere in the app.

---

## Phase 4: User Story 2 - Distinguish high and low temperature at a glance via color (Priority: P2)

**Goal**: The temperature graph's 7-day/30-day "high" line is red and "low" line is blue for the primary location, leaving the average line and every nearby-station line unchanged.

**Independent Test**: View the temperature graph's 7-day or 30-day window; confirm the high line is red, the low line is blue, and both remain visually distinct from the average line and any nearby-station lines (quickstart.md scenario 2).

### Implementation for User Story 2

- [X] T006 [US2] Add `HIGH_COLOR = "#dc2626"` and `LOW_COLOR = "#0ea5e9"` constants to `src/components/seriesColors.ts`, per [data-model.md](./data-model.md) and [research.md](./research.md) §2.
- [X] T007 [US2] In `src/components/ObservationChart.tsx`'s temperature 7-day/30-day branch, change the `primaryHigh` `<Line>`'s `stroke` from `seriesColor(0)` to `HIGH_COLOR`, and the `primaryLow` `<Line>`'s `stroke` to `LOW_COLOR`. Leave the `primaryAverage` line's `stroke={seriesColor(0)}` and every nearby-station `<Line>`'s `stroke={seriesColor(i + 1)}` unchanged.
- [X] T008 [US2] Run [quickstart.md](./quickstart.md) scenario 2 manually in the browser: confirm the red/blue high/low colors render correctly under all three themes (Midnight, Bright, Glass) and remain distinguishable from nearby-station colors when comparison stations are shown.

**Checkpoint**: User Story 1 and User Story 2 both work independently — the temperature graph's high/low lines are now colored red/blue.

---

## Phase 5: User Story 3 - Choose whether to see high/low alongside the average (Priority: P3)

**Goal**: A persisted on/off control (default on) that shows/hides the temperature graph's high/low lines on the 7-day/30-day view, without affecting the 24-hour view or the details table.

**Independent Test**: Toggle the control off and confirm only the average line remains on the temperature graph's 7-day/30-day view; toggle back on; confirm the 24-hour view and details table are unaffected throughout (quickstart.md scenario 3).

### Implementation for User Story 3

- [X] T009 [US3] Add `src/services/highLowVisibility.ts` per [contracts/high-low-visibility-service.md](./contracts/high-low-visibility-service.md): `getHighLowVisibility()` / `setHighLowVisibility(visible)`, `localStorage` key `weather-app:high-low-visible:v1`, default/fallback `true`. (Depends on T002 for the `HighLowVisibility` type.)
- [X] T010 [US3] Add `src/hooks/useHighLowVisibilityPreference.ts`: mirrors `useThemePreference`/`useNearbyStationCountPreference`'s shape, exposing `{ visible, setVisible }` backed by T009's service.
- [X] T011 [US3] Create `src/components/HighLowToggle.tsx`: a simple on/off control (two buttons or a checkbox, matching `UnitToggle.tsx`'s style), wired to `visible`/`onChange` props.
- [X] T012 [US3] In `src/App.tsx`, use `useHighLowVisibilityPreference` (T010) and render `HighLowToggle` (T011) in the header controls; pass `visible` into `ObservationChart` as a new `highLowVisible` prop.
- [X] T013 [US3] In `src/components/ObservationChart.tsx`, add a `highLowVisible: boolean` prop; wrap the temperature 7-day/30-day branch's `primaryHigh`/`primaryLow` `<Line>` elements in `{highLowVisible && (...)}` (the `primaryAverage` line and the precipitation bar remain unconditional). Do not touch the 24-hour branch or any Rain/Cloud rendering (FR-008).
- [X] T014 [P] [US3] Add `tests/unit/highLowVisibility.test.ts`: defaults to `true`, persists a manual selection, falls back to `true` for an invalid stored value.
- [X] T015 [US3] Extend `tests/integration/chartAndDetails.test.tsx`: toggling `highLowVisible` off/on changes whether the temperature 7-day/30-day chart's high/low lines render (assert via `aria-pressed` on the toggle control plus that the chart branch still renders without error — see the existing "jsdom doesn't measure ResponsiveContainer" note already in this file for what can/can't be asserted about chart internals); confirm the 24-hour view and details table render unaffected regardless of the toggle's state.
- [X] T016 [US3] Run [quickstart.md](./quickstart.md) scenario 3 manually: confirm default-on, toggle-off hides high/low on 7-day/30-day only, toggle-on restores it, and the preference persists across location/window/metric-tab changes and a reload.

**Checkpoint**: User Stories 1-3 all work independently — high/low visibility is now user-controlled.

---

## Phase 6: User Story 4 - See wind high/low the same way as temperature (Priority: P4)

**Goal**: The wind graph's 7-day/30-day view shows high, low, and average wind-speed lines, styled and toggled identically to temperature's.

**Independent Test**: View the wind graph's 7-day or 30-day window; confirm high (red), low (blue), and average lines all render; confirm the User Story 3 toggle also hides/shows wind's high/low the same way it does for temperature (quickstart.md scenario 4).

### Implementation for User Story 4

- [X] T017 [US4] In `src/services/dailyAggregation.ts`'s `toDailyAggregates`, compute `windHigh`/`windLow` the same way `high`/`low` already are for temperature (`Math.max`/`Math.min` over the bucket's non-null `windSpeed` readings, `null` if none), per [contracts/daily-aggregation.md](./contracts/daily-aggregation.md). (Depends on T002.)
- [X] T018 [US4] In `src/components/chartData.ts`, factor `buildDailyRows`'s high/low/average row-building into a shared `buildHighLowAverageDailyRows(primary, nearbyStations, unit, bucketCount, fields, convert)` helper (per [contracts/station-name-and-chart-rows.md](./contracts/station-name-and-chart-rows.md)); reimplement `buildDailyRows` as a thin wrapper over it (adding the `primaryPrecipitation` bar field) so its output is unchanged; add a new `buildWindDailyRows(primary, nearbyStations, unit, bucketCount)` that calls the shared helper with `{ high: "windHigh", low: "windLow", average: "windAverage" }` and `convertWindSpeed`.
- [X] T019 [US4] In `src/components/ObservationChart.tsx`, change the wind 7-day/30-day rendering (currently the shared `metric === "wind" || metric === "cloud"` single-line branch) so that when `metric === "wind"` and `window !== "last-24-hours"`, it uses `buildWindDailyRows` and renders three lines (`primaryHigh`/`primaryLow` styled with `HIGH_COLOR`/`LOW_COLOR` and wrapped in `highLowVisible` per US2/US3, plus an always-shown `primaryAverage` line) instead of the single `windAverage` line — mirroring the temperature daily branch's structure exactly. The wind 24-hour branch and the Cloud tab (still single-line via `buildMetricDailyRows`) are unaffected.
- [X] T020 [P] [US4] Extend `tests/unit/dailyAggregation.test.ts`: `windHigh`/`windLow` computed correctly for a bucket with readings, `null` for an empty bucket, independent of `windAverage`/`average`/`totalPrecipitation` gaps.
- [X] T021 [P] [US4] Extend `tests/unit/chartData.test.ts`: `buildDailyRows`'s output is unchanged (regression) after the T018 refactor; `buildWindDailyRows` produces the expected `primaryHigh`/`primaryLow`/`primaryAverage`/nearby-station rows from `windHigh`/`windLow`/`windAverage`, unit-converted via `convertWindSpeed`.
- [X] T022 [US4] Extend `tests/integration/chartAndDetails.test.tsx`: the Wind tab's 7-day/30-day view renders without error for a location with wind data, and the `highLowVisible` toggle affects it the same way it affects the temperature tab.
- [X] T023 [US4] Run [quickstart.md](./quickstart.md) scenario 4 manually: confirm wind's high/low/average lines render with the same red/blue/default styling as temperature, and the toggle from User Story 3 hides/shows wind's high/low too.

**Checkpoint**: All four user stories now work independently and together.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final whole-app validation after all four stories are complete.

- [X] T024 [P] Run `npm run lint` and `npm run test` at the repo root to confirm no regressions across all changed/added files.
- [X] T025 [P] Run `npm run build` to confirm the app still builds cleanly for GitHub Pages / the `weather.tengmo.com` custom domain (plan.md — no build/deploy config changes expected).
- [X] T026 Run the full [quickstart.md](./quickstart.md) validation end-to-end (all 4 scenarios) as a final sign-off.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks User Story 3 and User Story 4 only** (T002's `HighLowVisibility` type and `DailyAggregate` fields). User Story 1 and User Story 2 have no dependency on it.
- **User Story 1 (Phase 3)**: Depends on Setup only. Fully independent of every other story.
- **User Story 2 (Phase 4)**: Depends on Setup only. Independent of User Story 1, but shares `ObservationChart.tsx`'s temperature-daily branch with User Story 3 — implement in priority order (US2 before US3) to avoid rework on the same lines.
- **User Story 3 (Phase 5)**: Depends on Foundational (T002) and, for a clean diff, on User Story 2's color change already being in place (T007) since T013 wraps the same `<Line>` elements T007 recolors.
- **User Story 4 (Phase 6)**: Depends on Foundational (T002) and reuses User Story 2's `HIGH_COLOR`/`LOW_COLOR` (T006) and User Story 3's `highLowVisible` prop (T013) — implement after both.
- **Polish (Phase 7)**: Depends on all four stories being complete.

### Within Each User Story

- US1: provider fix (T003) → test (T004) → manual validation (T005).
- US2: color constants (T006) → chart usage (T007) → manual validation (T008).
- US3: service (T009) → hook (T010) → control component (T011) → App wiring (T012) → chart conditional rendering (T013) → tests (T014-T015) → manual validation (T016).
- US4: daily aggregation (T017) → chartData refactor (T018) → chart wind branch (T019) → tests (T020-T022) → manual validation (T023).

### Parallel Opportunities

- User Story 1 and User Story 2 can be implemented in parallel by different people (no shared files) once Setup is done.
- T004 (US1 test) can run in parallel with T005 (manual validation) once T003 lands.
- T014 (US3 highLowVisibility test) can run in parallel with T011/T012 (different files).
- T020 and T021 (US4 dailyAggregation/chartData tests) can run in parallel with each other once T017/T018 land.
- T024 and T025 (lint/test vs. build) can run in parallel in Polish.

---

## Parallel Example: User Story 1 and User Story 2 together

```bash
# No shared files between these two stories — can be worked on simultaneously:
Task: "Fix blank station-name fallback in src/services/smhiProvider.ts (US1)"
Task: "Add HIGH_COLOR/LOW_COLOR constants and apply them in src/components/ObservationChart.tsx (US2)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 3: User Story 1 (no Foundational dependency).
3. **STOP and VALIDATE**: Run quickstart.md scenario 1 independently.
4. This alone fixes the reported data-integrity bug and can ship before the three styling refinements land.

### Incremental Delivery

1. Setup → baseline confirmed.
2. Add User Story 1 (station name fix) → validate → demo (MVP — the bug fix).
3. Add User Story 2 (red/blue high/low) → validate → demo.
4. Complete Foundational, then add User Story 3 (toggle) → validate → demo.
5. Add User Story 4 (wind high/low/average) → validate → demo.
6. Polish → final lint/test/build/quickstart sign-off.

---

## Notes

- [P] tasks touch different files (or clearly non-overlapping regions of the same file) and have no unmet dependency.
- [Story] label maps each task to US1-US4 for traceability back to spec.md.
- User Story 1 and User Story 2 are genuinely independent of the Foundational phase and of each other — they can ship as a fast first release while User Story 3/4's shared-preference plumbing is still in progress.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently before continuing.
