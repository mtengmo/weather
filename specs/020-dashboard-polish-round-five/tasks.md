---

description: "Task list for 020-dashboard-polish-round-five"
---

# Tasks: Dashboard Polish Round Five

**Input**: Design documents from `/specs/020-dashboard-polish-round-five/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in the spec, but included per this repo's established convention (every prior feature paired implementation tasks with unit/integration test tasks in the same phase).

**Organization**: Tasks are grouped by user story (spec.md priorities: US1-US5 = P1, US6-US8 = P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Paths are relative to the repo root (`c:\GitRepos\weather`)

---

## Phase 1: Setup

- [X] T001 Run `npm test` and `npm run build` to confirm a clean baseline before starting

**No Foundational phase**: each story's changes are additive/self-contained or ordered via the
Shared-File Ordering below — none blocks another story's start.

---

## Phase 2: User Story 1 - See observations on the 3-day view (Priority: P1) 🎯 MVP

**Goal**: The 3-day view's first rendered day shows real observed values for 00:00-06:00 instead of a permanent gap.

**Independent Test**: Open the 3-day view for a location with observed data in the early-morning hours; confirm those hours show real values on the Morning column, not gaps.

- [X] T002 [US1] In `src/services/dailyAggregation.ts`'s `subDayBucketsForDate`, add an `isFirstDay` parameter that widens the Morning period's start hour to `0` (instead of `6`) only when true; pass `isFirstDay: dayOffset === 0` from `toSubDayBuckets`'s single call site, per `data-model.md`
- [X] T003 [P] [US1] In `tests/unit/dailyAggregation.test.ts`, add tests: an observation timestamped between local midnight and 06:00 on the first rendered day is included in that day's Morning bucket's aggregates; a later rendered day's own Morning period still starts at hour 6 (unaffected)

**Checkpoint**: The 3-day observation gap is independently shippable and testable.

---

## Phase 3: User Story 2 - One clear forecast, no source picker to think about (Priority: P1)

**Goal**: The "Forecast sources" control is gone; forecast is always averaged across available sources; observations always prefer SMHI (unchanged fallback for uncovered locations).

**Independent Test**: Open the app; confirm no forecast-source picker exists; confirm a forecast period with 2+ sources' data shows one averaged value.

- [X] T004 [P] [US2] Delete `src/components/ForecastSourcesControl.tsx`
- [X] T005 [P] [US2] Delete `src/hooks/useCombineForecastSourcesPreference.ts`
- [X] T006 [P] [US2] Delete `src/services/combineForecastPreference.ts`
- [X] T007 [US2] In `src/hooks/useObservationData.ts`, remove the `combineForecastSources` parameter and always call `getMultiSourceForecast`, per `contracts/observation-and-forecast-behavior.md` (depends on T004-T006)
- [X] T008 [US2] In `src/components/WeatherIconOverview.tsx`, remove the `combineForecastSources` prop and drop the `combineForecastSources &&` guard around `mergeMultiSourceIntoTimelinePoints` (depends on T007 — same file as US3/US5 tasks below, apply before those)
- [X] T009 [US2] In `src/components/ObservationChart.tsx`, remove the `combineForecastSources` prop; `showCombinedForecast = multiSourceForecast.length > 1`, per `contracts/observation-and-forecast-behavior.md` (depends on T007 — same file as US4's T014, apply before)
- [X] T010 [US2] In `src/App.tsx`, remove `useCombineForecastSourcesPreference()`, the `<ForecastSourcesControl>` element, and `combineForecastSources` prop threading to `WeatherIconOverview`/`ObservationChart`/`useObservationData` (depends on T004-T009 — same file as US4's T016, apply before)
- [X] T011 [US2] Update/remove tests referencing `ForecastSourcesControl`/`combineForecastSources` in `tests/integration/appHeader.test.tsx`, `tests/integration/weatherIconOverview.test.tsx`, `tests/integration/chartAndDetails.test.tsx`, and any unit tests mocking the removed hook/service (depends on T004-T010)

**Checkpoint**: US1-US2 both work independently.

---

## Phase 4: User Story 3 - A day-boundary line that lines up with the actual day (Priority: P1)

**Goal**: The "Now" line and 3-day day-boundary lines are positioned correctly relative to the actual data columns, accounting for the sticky label column's width.

**Independent Test**: Open the 3-day view; confirm each day-boundary line falls exactly at the border between days, not shifted into a column.

- [X] T012 [US3] In `src/components/WeatherIconOverview.tsx`, change the `left` style of `.weather-timeline-now` and `.weather-timeline-day-boundary` from a bare percentage to `calc(7rem + (100% - 7rem) * fraction)`, per `contracts/timeline-and-navigation.md` (depends on T008 — same file, apply after)
- [X] T013 [P] [US3] In `tests/integration/weatherIconOverview.test.tsx`, add a regression test asserting the "Now" line's and a day-boundary line's inline `left` style uses the `calc(7rem + ...)` form (jsdom can't assert real rendered position, so this locks in the formula itself as a regression guard)

**Checkpoint**: US1-US3 all work independently.

---

## Phase 5: User Story 4 - Consistent, correctly-targeted navigation everywhere (Priority: P1)

**Goal**: "Back" always means "go to the Overview," everywhere; the graph and Details pages drop their own local headers/nav in favor of the persistent App-level header.

**Independent Test**: From the Details page, use "Back" and confirm it lands on the Overview; compare header layout across Overview, graph, and Details.

- [X] T014 [US4] In `src/components/ObservationChart.tsx`, remove the `onViewDetails`/`onViewOverview` props and their local buttons; make the local `<h2>` visually-hidden (`ref`/`tabIndex={-1}`/`className="visually-hidden"`, matching `WeatherIconOverview.tsx`'s existing pattern), per `contracts/timeline-and-navigation.md` (depends on T009 — same file, apply after)
- [X] T015 [US4] In `src/components/ObservationDetails.tsx`, remove the `onBack`/`onViewOverview` props, the local `.app-header` div, and its buttons; make the local `<h2>` visually-hidden the same way, per `contracts/timeline-and-navigation.md`
- [X] T016 [US4] In `src/App.tsx`, restructure `header-actions` so: `view === "overview"` shows "Details" (→ graph); `view === "graph"` shows "Details" (→ details) and "Back" (→ overview); `view === "details"` shows "Back" (→ overview); `view === "map"` keeps its existing "Back" (→ `previousView`) unchanged, per `data-model.md` (depends on T010, T014, T015 — same file as T010, apply after)
- [X] T017 [US4] Update `tests/integration/appHeader.test.tsx` and `tests/integration/chartAndDetails.test.tsx`: assert "Back" from the Details page lands on the Overview; assert "Back" from the graph view lands on the Overview; assert consistent Details/Back labeling is present on Overview/graph/Details (depends on T014-T016)

**Checkpoint**: US1-US4 all work independently.

---

## Phase 6: User Story 5 - A 7-day forecast brief that means 7 days (Priority: P1)

**Goal**: The persistent forecast-brief strip on the Overview shows at most 7 cards, anchored on today and the days ahead.

**Independent Test**: Open the Overview for a location with 14 days of combined data; confirm the strip shows at most 7 cards.

- [X] T018 [US5] In `src/components/WeatherIconOverview.tsx`, add a `windowAroundToday(days, count)` helper and use it (instead of `capForecastReach`) for the `weeklyDays` array feeding `<WeeklyForecastStrip>` only — `buildDailyTimelineData`'s own `capForecastReach` call for the main timeline stays unchanged, per `data-model.md`/`contracts/display-polish.md` (depends on T012 — same file, apply after)
- [X] T019 [P] [US5] In `tests/integration/weatherIconOverview.test.tsx`, update/add tests: the weekly forecast strip shows at most 7 cards for a location with 14 days of combined data, anchored on today (today's own card present, plus forecast days prioritized over older history)

**Checkpoint**: US1-US5 all work independently — the full P1 slice of this round is complete.

---

## Phase 7: User Story 6 - Know how fresh the forecast is (Priority: P2)

**Goal**: The footer shows a single, unambiguous forecast freshness time, reworded now that there's no per-mode forecast-source naming.

**Independent Test**: With a forecast showing, confirm the footer shows one clear "last updated" time for the forecast.

- [X] T020 [US6] In `src/services/format.ts`, reword `dataSourceDisclosure` to describe only the observation source plus a single forecast-freshness fragment, dropping the per-mode "SMHI forecast"/"Open-Meteo forecast" naming, per `data-model.md`
- [X] T021 [P] [US6] Update `tests/unit/format.test.ts` and `tests/integration/footer.test.tsx` for the new wording

**Checkpoint**: US1-US6 all work independently.

---

## Phase 8: User Story 7 - The same icon style everywhere (Priority: P2)

**Goal**: The Details page's 24-hour table gains a Condition column showing the same style of weather icon the Overview uses.

**Independent Test**: Open Details (24-hour window); confirm a Condition column with icons matching the Overview's style/size.

- [X] T022 [US7] In `src/components/ObservationDetails.tsx`, add a "Condition" column to the 24-hour table using `deriveWeatherCondition` + `WEATHER_ICONS` at the same 28px size `ConditionRow` uses, per `data-model.md`/`contracts/display-polish.md` (depends on T015 — same file, apply after)
- [X] T023 [P] [US7] In `tests/integration/chartAndDetails.test.tsx`, add tests: the Details table shows a Condition icon for a row with enough data to classify one; shows the existing gap indicator (not a fabricated icon) for a row without enough data

**Checkpoint**: US1-US7 all work independently.

---

## Phase 9: User Story 8 - A dashboard that works well on a phone (Priority: P2)

**Goal**: The primary flows (location select, tab switch, Details, Map) are fully usable on a phone-sized viewport.

**Independent Test**: Walk through the primary flows at a phone-sized viewport; confirm every control is reachable and legible, with no unintended page-level horizontal scroll.

- [X] T024 [US8] Run the dev server and drive it via Playwright at phone-sized viewports (e.g. 390×844, 360×800) through the primary flows (select location, switch 24h/3d/7d tabs, open Details, open Map, use Back); document any concrete issues found (unreachable controls, illegible/truncated text, unintended horizontal scroll)
- [X] T025 [US8] Fix each concrete issue found in T024 (files determined by the findings)
- [X] T026 [P] [US8] Where a found issue is meaningfully testable (e.g. a specific overflow), add a regression test; otherwise rely on the manual quickstart.md validation (T027) as the ongoing check

**Checkpoint**: All 8 user stories are independently functional.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T027 [P] Run the manual validation scenarios in `specs/020-dashboard-polish-round-five/quickstart.md` (all 8 user stories) via Playwright against the dev server
- [X] T028 Run `npm test` (full suite) — including under `TZ=UTC` per this session's established CI-parity practice — `npm run lint`, and `npm run build`; fix any regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **User Stories (Phase 2-9)**: Ordered here by priority (P1 → P2); several share files that must be edited in the order listed below within a single session to avoid merge conflicts
- **Polish (Phase 10)**: Depends on all 8 user stories being complete

### Shared-File Ordering

- `src/components/WeatherIconOverview.tsx`: T008 (US2) → T012 (US3) → T018 (US5)
- `src/components/ObservationChart.tsx`: T009 (US2) → T014 (US4)
- `src/components/ObservationDetails.tsx`: T015 (US4) → T022 (US7)
- `src/App.tsx`: T010 (US2) → T016 (US4)
- `src/hooks/useObservationData.ts`: T007 (US2) only
- `src/services/format.ts`: T020 (US6) only

### Within Each User Story

- Deletion/removal before the call sites that depended on the removed thing are updated (US2).
- Implementation before its own tests (tests can be written alongside; TDD not required since not explicitly requested).
- US8's investigation (T024) before its fix (T025).

### Parallel Opportunities

- T004, T005, T006 (US2's three deletions) — different files.
- T003 (US1's test) is independent of US2-US8's own work.
- T013, T019, T021, T023, T026 — each story's own test task, safe to parallelize with a different story's non-conflicting work once shared-file ordering above is respected.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 1 → validate independently — the 3-day observation-gap fix ships alone
3. **STOP and VALIDATE**: deploy/demo if ready

### Incremental Delivery

1. Setup → US1 (3-day gap) → US2 (remove picker) → US3 (line positioning) → US4 (navigation) → US5 (7-day strip) — completes the P1 slice
2. US6 (freshness) → US7 (Details icons) → US8 (mobile pass)
3. Each story adds value without breaking previously-shipped stories

---

## Notes

- [P] tasks touch different files with no dependency on an incomplete task
- [Story] label maps each task to its user story for traceability
- Commit after each story's checkpoint, per this session's standing "commit and push after every
  /speckit-implement" preference
