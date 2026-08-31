---

description: "Task list template for feature implementation"
---

# Tasks: Extended History Window, Additional Weather Metrics, and Display Controls

**Input**: Design documents from `/specs/003-extended-history-metrics/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested in the feature spec. Light regression tests are still included alongside the files they cover, consistent with this repo's existing testing conventions (every prior feature ships unit/integration coverage) — not a full TDD gate.

**Organization**: Tasks are grouped by user story (US1-US6 from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- Exact file paths are included in every task description

## Path Conventions

Single frontend-only project (per [plan.md](./plan.md)): `src/`, `tests/` at repository root. No new directories beyond new files listed below.

---

## Phase 1: Setup

**Purpose**: Confirm the existing project baseline before making changes. No new dependencies (plan.md — Recharts' existing grouped-bar behavior covers User Story 3, no new library).

- [X] T001 Run `npm install`, `npm run test`, and `npm run build` at the repo root to confirm a clean baseline before edits; no code changes in this task.

**Checkpoint**: Baseline confirmed green — safe to start Foundational work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data-shape and data-fetching changes that every user story needs, so each story can then be implemented and tested independently on top of a stable foundation, per [data-model.md](./data-model.md) and [contracts/](./contracts/).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Extend `src/models/types.ts` per [data-model.md](./data-model.md): add `"last-30-days"` to `ObservationWindow`; add `windSpeed`/`cloudCoverPercent` (`number | null`) to `WeatherObservation`; add `windAverage`/`cloudAverage` (`number | null`) to `DailyAggregate`; add `export type WeatherMetric = "temperature" | "rain" | "wind" | "cloud"` and `DEFAULT_METRIC`; add `export type NearbyStationCount = 0 | 1 | 2 | 3 | 4` and `DEFAULT_NEARBY_STATION_COUNT = 4`.
- [X] T003 [P] Add `convertWindSpeed(ms: number | null, to: UnitSystem): number | null` to `src/services/units.ts` (mph conversion for `"imperial"`, per [research.md](./research.md) §7) — additive only, no change to existing exports yet (the default-value change is US6's task, kept separate so this addition doesn't block other stories).
- [X] T004 [P] Parameterize `src/services/dailyAggregation.ts`: change `toDailyAggregates(observations)` to `toDailyAggregates(observations, bucketCount)` (replacing the hardcoded `BUCKET_COUNT = 7`), and compute `windAverage`/`cloudAverage` per bucket the same way `average` is computed (mean of non-null values, `null` if none), per [contracts/daily-aggregation.md](./contracts/daily-aggregation.md). Update the two existing call sites — `src/components/chartData.ts`'s `buildDailyRows` and `src/components/ObservationDetails.tsx`'s 7-day table — to pass `7` explicitly, preserving today's behavior exactly.
- [X] T005 Extend `src/services/openMeteoProvider.ts` per [contracts/weather-metrics-service.md](./contracts/weather-metrics-service.md): add `wind_speed_10m,cloud_cover` to the `hourly` query param, add `wind_speed_unit=ms`, populate `windSpeed`/`cloudCoverPercent` on returned observations, add a `"last-30-days"` case to `pastDaysFor` (`31`) and `WINDOW_HOURS` (`24 * 30`). (Depends on T002 for the new `WeatherObservation` fields and `ObservationWindow` value.)
- [X] T006 Extend `src/services/smhiProvider.ts` per [contracts/weather-metrics-service.md](./contracts/weather-metrics-service.md): fetch parameter `4` (wind, m/s) and parameter `16` (cloud, already percent — confirmed via SMHI's own parameter metadata, no conversion) against each parameter's own nearest active station, populate `windSpeed`/`cloudCoverPercent` in `buildHourlySeries`; add `"last-30-days"` to `WINDOW_HOURS` (`24 * 30`) and `SMHI_PERIOD` (`"latest-months"`, same value as `"last-7-days"`). A missing wind/cloud station near a location MUST NOT fail the whole request — those fields stay `null`. (Depends on T002.)

  **Correction during implementation**: initial live-testing found parameter 16's Y-axis rendering values up to ~1400 on the Cloud coverage tab — the originally-planned `okta * 12.5` conversion was double-scaling data that SMHI already reports in percent (`unit: "procent"` in the parameter's own metadata). The conversion was removed; see research.md §2's correction note.
- [X] T007 Add `src/services/nearbyStationCount.ts` per [contracts/nearby-station-count-service.md](./contracts/nearby-station-count-service.md): `getNearbyStationCountPreference()` / `setNearbyStationCountPreference(count)`, `localStorage` key `weather-app:nearby-station-count:v1`, default/fallback `4`, invalid/out-of-range stored values fall back to `4`. (Depends on T002 for the `NearbyStationCount` type.)
- [X] T008 Add `src/hooks/useNearbyStationCountPreference.ts`: mirrors `useThemePreference`/`useUnitPreference`'s shape, exposing `{ count, setCount }` backed by T007's service.
- [X] T009 Update `src/services/weatherApi.ts` per [contracts/weather-metrics-service.md](./contracts/weather-metrics-service.md): `getNearbyStationSeries(location, window, count)` takes a required `count: NearbyStationCount` parameter (remove the hardcoded `NEARBY_STATION_COUNT = 5` constant); `count === 0` returns `[]` immediately with no network request; otherwise fetch at most `count` stations using the existing "fetch one extra, skip the nearest" logic. (Depends on T002, T006.)
- [X] T010 Update `src/hooks/useObservationData.ts` to accept a `nearbyStationCount: NearbyStationCount` parameter and forward it to `getNearbyStationSeries` (T009); add it to the effect's dependency array so changing the count re-fetches.
- [X] T011 Wire `src/App.tsx` to use `useNearbyStationCountPreference` (T008) and pass its `count` into `useObservationData` (T010) — UI control itself is out of scope here (added in US4); this task only makes the default-4 behavior take effect end-to-end so US1/US2/US3/US5/US6 are all testable against real (default-4) nearby-station data.

**Checkpoint**: Foundation ready — every user story phase below can now be implemented and tested independently, all running against the default nearby-station count of 4 until US4 adds the visible control.

---

## Phase 3: User Story 1 - See a 30-day history alongside the existing views (Priority: P1) 🎯 MVP

**Goal**: A "Last 30 days" window option, alongside the existing 24h/7d windows, showing 30 daily-aggregated points and available via "View details."

**Independent Test**: Select "Last 30 days" on any location's graph; confirm 30 daily points render and "View details" shows the matching 30-row table (quickstart.md scenario 1).

### Implementation for User Story 1

- [X] T012 [US1] In `src/components/chartData.ts`, add a `bucketCount` parameter to `buildDailyRows` (7 or 30, forwarded to `toDailyAggregates` from T004) so it works for both `"last-7-days"` and `"last-30-days"`.
- [X] T013 [US1] In `src/components/ObservationChart.tsx`, add `"Last 30 days"` to the `WINDOWS` list and generalize the existing 7-day chart branch to render for both `"last-7-days"` and `"last-30-days"` (computing `bucketCount` from `window`, per T012) rather than adding a near-duplicate third branch.
- [X] T014 [US1] In `src/components/ObservationDetails.tsx`, generalize the existing 7-day table branch the same way (both windows share one table renderer, parameterized by `bucketCount`).
- [X] T015 [P] [US1] Add/extend `tests/unit/dailyAggregation.test.ts` to cover `bucketCount = 30` (30 buckets returned, gap propagation unchanged) alongside the existing `7` case.
- [X] T016 [US1] Run [quickstart.md](./quickstart.md) scenario 1 manually: select "Last 30 days," confirm the graph and details table both show 30 points.

**Checkpoint**: User Story 1 is fully functional and independently testable — the app now offers a 30-day view end-to-end.

---

## Phase 4: User Story 2 - Switch between weather metrics via tabs (Priority: P2)

**Goal**: A tab control to switch the graph between Temperature (default, unchanged combined view), Rain, Wind, and Cloud coverage, without altering the selected location/window/nearby-station count; an "unavailable" state when a metric has no data.

**Independent Test**: Switch tabs and confirm the graph redraws to the selected metric for the same location/window; confirm an unavailable metric shows a message, not an empty graph (quickstart.md scenario 2).

### Implementation for User Story 2

- [X] T017 [US2] Create `src/components/MetricTabs.tsx`: a `role="group"` button set (Temperature/Rain/Wind/Cloud coverage), following `ThemePicker.tsx`'s exact shape (`value`/`label` list, `aria-pressed`, `onChange`).
- [X] T018 [US2] In `src/components/chartData.ts`, add row-builder support for the `wind`/`cloud` metrics: extend `buildHourlyRows`/`buildDailyRows` (or add sibling functions) to also emit `windSpeed`/`cloudCoverPercent`-derived values (with unit conversion via `convertWindSpeed` from T003) per series index, using the existing `seriesKey` convention.
- [X] T019 [US2] Add an `isMetricAvailable(series, nearbyStations, metric)` helper (co-located in `chartData.ts`) returning `false` when every relevant value across the primary and comparison series is `null` for the active metric, for FR-004's unavailable-state check.
- [X] T020 [US2] In `src/components/ObservationChart.tsx`, add `metric: WeatherMetric` / `onMetricChange` props, render `MetricTabs` (T017), and add render branches for `"rain"` (bar, primary series only — extended with comparison bars in US3), `"wind"` (line), and `"cloud"` (line), each using T018's row data and appropriate axis label/unit (`m/s`/`mph` for wind, `%` for cloud). When `isMetricAvailable` (T019) is `false` for the active metric, render an inline "not available for this location" message instead of an empty chart.
- [X] T021 [US2] In `src/App.tsx`, add `metric` state (default `DEFAULT_METRIC` from T002, not persisted — mirrors the existing unpersisted `obsWindow`/`view` state) and pass it + a setter to `ObservationChart` (T020). Confirm switching `metric` does not touch `selected`, `obsWindow`, or the nearby-station count (FR-005).
- [X] T022 [P] [US2] Add `tests/unit/chartData.test.ts` (new, or extend if one exists) covering wind/cloud row building and `isMetricAvailable`.
- [X] T023 [US2] Extend `tests/integration/chartAndDetails.test.tsx` to cover switching between all four tabs and the unavailable-metric state.

**Checkpoint**: User Stories 1 and 2 both work independently — the app now has four metric tabs alongside the 30-day window.

---

## Phase 5: User Story 3 - See comparison-station data on the bar chart too (Priority: P3)

**Goal**: The Rain tab's bar chart (US2) shows one bar series per currently-shown nearby station, not just the primary location, each visually distinguishable and with the primary clearly identifiable.

**Independent Test**: View the Rain tab for a location with nearby stations; confirm a bar per station appears alongside the primary's bar, distinguishable from one another (quickstart.md scenario 3).

### Implementation for User Story 3

- [X] T024 [US3] In `src/components/chartData.ts`'s rain-metric row builder (T018), add each nearby station's precipitation value under its `seriesKey(i + 1)`, mirroring how temperature already includes comparison-station values today.
- [X] T025 [US3] In `src/components/ObservationChart.tsx`'s `"rain"` branch (T020), add one `<Bar>` per entry in `nearbyStations` (no `stackId`, so Recharts groups them side-by-side by default per [research.md](./research.md) §3), using `seriesColor(i + 1)` for fill so each is visually distinguishable and the primary (`seriesColor(0)`, first in legend order) stays identifiable, consistent with FR-006's "extends the existing line-chart distinguishing behavior."
- [X] T026 [US3] Extend `tests/integration/chartAndDetails.test.tsx` to assert the Rain tab renders one bar series per shown nearby station (in addition to US2's coverage of the tab itself).
- [X] T027 [US3] Run [quickstart.md](./quickstart.md) scenario 3 manually against an SMHI-covered location with nearby stations.

**Checkpoint**: User Stories 1-3 all work independently — the Rain tab now shows full station comparison, matching the existing temperature line chart's behavior.

---

## Phase 6: User Story 4 - Choose how many nearby stations to compare (Priority: P4)

**Goal**: A dropdown (0-4, default 4) controlling how many nearby comparison stations are shown, remembered across location/tab switches.

**Independent Test**: Change the dropdown through each value 0-4 and confirm the chart(s) show exactly that many comparison series (quickstart.md scenario 4).

### Implementation for User Story 4

- [X] T028 [US4] Create `src/components/NearbyStationCountControl.tsx`: a labeled `<select>` (or button group, matching `UnitToggle.tsx`'s style) offering `0, 1, 2, 3, 4`, wired to `count`/`onChange` props.
- [X] T029 [US4] In `src/App.tsx`, render `NearbyStationCountControl` (T028) in the header controls (alongside `ThemePicker`/`UnitToggle`), wired to the `setCount` already available from T011's `useNearbyStationCountPreference` usage.
- [X] T030 [P] [US4] Add `tests/unit/nearbyStationCount.test.ts`: default `4`, persists a manual selection, falls back to `4` for an invalid/out-of-range stored value (e.g., a stale `5`).
- [X] T031 [US4] Add `tests/integration/nearbyStationCount.test.tsx`: selecting each value updates the number of comparison series shown on the chart, and the choice persists across a location switch and a fresh render (reload).

**Checkpoint**: User Stories 1-4 all work independently — nearby-station comparisons are now fully user-controlled.

---

## Phase 7: User Story 5 - See rounded, easy-to-read values by default (Priority: P5)

**Goal**: Every displayed numeric weather value (tooltip, details table) rounds to at most one decimal place, uniformly.

**Independent Test**: Hover any graph point and open the details table; confirm every numeric value shows at most one decimal (quickstart.md scenario 5).

### Implementation for User Story 5

- [X] T032 [US5] Add `src/services/format.ts` per [contracts/format-service.md](./contracts/format-service.md): `formatValue(value: number | null, decimals = 1): string`, returning `"—"` for `null`.
- [X] T033 [US5] In `src/components/ObservationDetails.tsx`, replace the local `formatTemperature`/`formatPrecipitation` bodies to call `formatValue(x, 1)` (keeping each function's unit-suffix logic) — this also fixes the existing `toFixed(2)` precipitation inconsistency noted in [research.md](./research.md) §6.
- [X] T034 [US5] In `src/components/ObservationChart.tsx`, add a `formatter` prop to every `<Tooltip>` that calls `formatValue(Number(value), 1)` (plus the active metric's unit suffix), so hover tooltips round the same way as the details table.
- [X] T035 [P] [US5] Add `tests/unit/format.test.ts`: `null` → `"—"`, a long decimal rounds to one place, a whole number still shows one decimal (e.g., `18` → `"18.0"`).
- [X] T036 [US5] Run [quickstart.md](./quickstart.md) scenario 5 manually: confirm tooltip and table values are rounded across all metrics/windows.

**Checkpoint**: User Stories 1-5 all work independently — every numeric display is now uniformly rounded.

---

## Phase 8: User Story 6 - Sensible default units without relying on locale (Priority: P6)

**Goal**: A first-time user (no saved unit preference) sees Celsius/m per s/mm regardless of browser locale; a manual choice still persists as before.

**Independent Test**: Clear any stored unit preference, reload, and confirm metric units regardless of locale; manually switch, reload, and confirm the switch persists (quickstart.md scenario 6).

### Implementation for User Story 6

- [X] T037 [US6] In `src/services/units.ts`, change `getUnitPreference()`'s no-stored-value fallback from `getDefaultUnitSystem(navigator.language)` to the literal `"metric"`; remove the now-unused `getDefaultUnitSystem` function and `IMPERIAL_LOCALE_REGIONS` constant.
- [X] T038 [US6] Update `tests/unit/units.test.ts`: remove/replace any locale-based-default assertions with a test that `getUnitPreference()` returns `"metric"` when nothing is stored, regardless of `navigator.language`; add a `convertWindSpeed` (T003) test (m/s → mph and back).
- [X] T039 [US6] Run [quickstart.md](./quickstart.md) scenario 6 manually: fresh profile shows metric units; manual switch still persists across reload.

**Checkpoint**: All six user stories now work independently and together.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final whole-app validation after all six stories are complete.

- [X] T040 [P] Run `npm run lint` and `npm run test` at the repo root to confirm no regressions across all changed/added files.
- [X] T041 [P] Run `npm run build` to confirm the app still builds cleanly for GitHub Pages deployment (plan.md — no build/deploy config changes expected).
- [X] T042 Run the full [quickstart.md](./quickstart.md) validation end-to-end (all 6 scenarios) as a final sign-off.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks every user story** — T002 (types) gates nearly everything; T004-T011 build the data layer every story's UI work sits on top of.
- **User Story 1 (Phase 3)**: Depends on Foundational (T002 for `ObservationWindow`/30-day support, T004 for parameterized aggregation, T005/T006 for provider 30-day support). No dependency on US2-US6.
- **User Story 2 (Phase 4)**: Depends on Foundational (T002 for `WeatherMetric`/wind/cloud fields, T003 for `convertWindSpeed`, T005/T006 for wind/cloud data, T009-T011 for nearby-station data flowing through at all). No dependency on US1, US3-US6 — but shares `ObservationChart.tsx`/`chartData.ts`/`App.tsx` with US1, US3, US5, so implement in priority order (US1 → US2 → US3 → ...) to avoid rework, even though the stories are conceptually independent.
- **User Story 3 (Phase 5)**: Depends on Foundational and on US2's Rain-tab scaffolding (T017-T021) — extends the same `"rain"` branch T020 creates.
- **User Story 4 (Phase 6)**: Depends on Foundational (T007-T011 already deliver the default-4 behavior end-to-end) — only adds the visible control on top.
- **User Story 5 (Phase 7)**: Depends on Foundational only; touches `ObservationDetails.tsx`/`ObservationChart.tsx`, which US1-US3 also touch — implement after US1-US3 to minimize merge friction, though the rounding change itself is logically independent of them.
- **User Story 6 (Phase 8)**: Depends on Foundational's T003 (`convertWindSpeed` must exist before US6's tests reference it) but is otherwise fully independent — could be done first or last with no functional difference.
- **Polish (Phase 9)**: Depends on all desired user stories being complete.

### Within Each User Story

- US1: chartData (T012) → chart component (T013) → details component (T014) → tests (T015) → manual validation (T016).
- US2: tab component (T017) → chartData metric support (T018) → availability helper (T019) → chart integration (T020) → App wiring (T021) → tests (T022-T023).
- US3: chartData rain-comparison values (T024) → chart bar rendering (T025) → tests (T026) → manual validation (T027).
- US4: control component (T028) → App wiring (T029) → tests (T030-T031).
- US5: format helper (T032) → details usage (T033) → chart tooltip usage (T034) → tests (T035) → manual validation (T036).
- US6: units default change (T037) → tests (T038) → manual validation (T039).

### Parallel Opportunities

- T002, T003 can run in parallel in Foundational (different files, no dependency between them).
- T015 (US1 test) can run in parallel with T013/T014 once T012 lands (different files).
- T022 (US2 chartData test) can run in parallel with T020/T021 (different files).
- T030 (US4 unit test) can run in parallel with T028/T029.
- T035 (US5 format test) can run in parallel with T033/T034.
- T040 and T041 (lint/test vs. build) can run in parallel in Polish.
- Across stories: once Foundational is done, US4 and US6 have no file overlap with US1/US2/US3/US5 at the story-scaffolding level (T028-T031, T037-T039 touch only `NearbyStationCountControl.tsx`, `units.ts`, and their own tests) and could be worked on by a different developer in parallel; US1/US2/US3/US5 share `ObservationChart.tsx`/`chartData.ts`/`ObservationDetails.tsx` and should stay sequential (or carefully coordinated) as noted above.

---

## Parallel Example: Foundational Phase

```bash
# These two have no dependency on each other and can run together:
Task: "Add convertWindSpeed to src/services/units.ts"
Task: "Extend src/models/types.ts with 30-day window, wind/cloud fields, WeatherMetric, NearbyStationCount"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (data-shape + fetch-layer changes — the heaviest phase, but it's shared cost every later story amortizes against).
3. Complete Phase 3: User Story 1 — the 30-day view is live.
4. **STOP and VALIDATE**: Run quickstart.md scenario 1 independently.
5. This alone satisfies the single most-requested capability and can ship before the remaining five stories land.

### Incremental Delivery

1. Setup + Foundational → data layer ready (wind/cloud fetched, 30-day supported, station-count plumbing in place at its default).
2. Add US1 (30-day window) → validate → demo (MVP).
3. Add US2 (metric tabs) → validate → demo.
4. Add US3 (comparison bars on Rain) → validate → demo.
5. Add US4 (station-count dropdown) → validate → demo.
6. Add US5 (rounding) → validate → demo.
7. Add US6 (fixed unit default) → validate → demo.
8. Polish → final lint/test/build/quickstart sign-off.

---

## Notes

- [P] tasks touch different files (or clearly non-overlapping regions of the same file) and have no unmet dependency.
- [Story] label maps each task to US1-US6 for traceability back to spec.md.
- The Foundational phase is unusually large for this feature because three of six stories (US1, US2, US4) each need a different piece of the same underlying data-fetch change (30-day window, wind/cloud fields, station count) before any UI work is meaningful — front-loading it avoids rework compared to threading these changes through each story separately.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently before continuing.
