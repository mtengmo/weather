---

description: "Task list for 018-dashboard-visual-redesign"
---

# Tasks: Dashboard Visual Redesign

**Input**: Design documents from `/specs/018-dashboard-visual-redesign/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in the spec, but included per this repo's established convention (every prior feature paired implementation tasks with unit/integration test tasks in the same phase).

**Organization**: Tasks are grouped by user story (spec.md priorities: US1/US2/US3 = P1, US4/US5 = P2, US6 = P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Paths are relative to the repo root (`c:\GitRepos\weather`)

---

## Phase 1: Setup

- [X] T001 Run `npm test` and `npm run build` to confirm a clean baseline before starting

---

## Phase 2: Foundational

- [X] T002 [P] In `src/services/dailyAggregation.ts`, add `windDirection?: number | null` to `aggregateBucket`'s return (last non-null reading in the bucket — needed by US4), per `data-model.md`
- [X] T003 [P] In `src/hooks/useObservationData.ts`, add `weeklySeries`/`lastUpdated` to `UseObservationDataResult` — always-on `last-7-days` fetch (reused, not duplicated, when `window` is already `last-7-days`) plus a fetch-completion timestamp, per `contracts/summary-cards.md` (needed by US4/US5/US6)

**Checkpoint**: Both foundational pieces are additive to files no other Phase-2 task touches — safe to do in parallel. US1-US3 don't depend on either.

---

## Phase 3: User Story 1 - A consolidated, at-a-glance header (Priority: P1) 🎯 MVP

**Goal**: The header shows location + current conditions inline, a single "Display" menu, a "Forecast sources" selector, and keeps Map/Details.

**Independent Test**: Open the app; confirm the header shows location/temperature/condition/feels-like together; confirm Display opens theme/units/High-Low; confirm Forecast sources offers Automatic/Combined; confirm Map/Details still work.

- [X] T004 [P] [US1] Create `src/components/DisplayMenu.tsx` (dropdown containing `ThemePicker`/`UnitToggle`/`HighLowToggle`, mirrors `LocationPanel`'s open/close/outside-click/Escape pattern), per `contracts/header-redesign.md`
- [X] T005 [P] [US1] Create `src/components/ForecastSourcesControl.tsx` (dropdown with "Automatic"/"Combined" options, same `combined`/`onChange` contract as the old `CombineForecastToggle`), per `contracts/header-redesign.md`
- [X] T006 [US1] In `src/App.tsx`, derive `currentConditions` (last non-forecast observation in `series`, plus `deriveFeelsLike` on it) and `currentConditionLabel`; restructure the header to show them inline alongside `LocationPanel`, replace `ThemePicker`/`UnitToggle`/`HighLowToggle`/`CombineForecastToggle` with `<DisplayMenu>`/`<ForecastSourcesControl>`, per `contracts/header-redesign.md` (depends on T004, T005)
- [X] T007 [US1] In `src/components/WeatherIconOverview.tsx`, remove the local `<div className="app-header"><h2>...</h2></div>` heading block — now redundant with the app-level header's location display (depends on T006)
- [X] T008 [P] [US1] In `src/index.css`, add `.current-conditions`/`.current-temperature`/`.current-condition-label`/`.current-feels-like`, `.display-menu`/`.display-menu-content`, and `.forecast-sources-control` rules
- [X] T009 [US1] In `tests/integration/appHeader.test.tsx`, add tests: `DisplayMenu` contains and correctly wires theme/unit/High-Low; `ForecastSourcesControl` offers Automatic/Combined and toggles `combineForecastSources` identically to the old two-button control; the current-conditions summary (temperature/condition/feels-like) renders; Map and Details remain present (depends on T006, T007, T008)

**Checkpoint**: The header redesign is independently shippable and testable.

---

## Phase 4: User Story 2 - The timeline table shows clear observed/forecast sections (Priority: P1)

**Goal**: "Observed"/"Forecast" section labels span the timeline's columns; the "Now" marker is a filled pill.

**Independent Test**: Open a view with both observed and forecast data; confirm both section labels appear correctly sized; confirm a no-forecast view shows only "Observed."

- [X] T010 [US2] In `src/components/WeatherIconOverview.tsx`, add the `observedForecastSplit` derived value and render the `.weather-timeline-sections` row above the time-label `PeriodGrid`, per `contracts/timeline-structure.md` (depends on T007 — same file, apply after)
- [X] T011 [P] [US2] In `src/index.css`, add `.weather-timeline-sections`/`.weather-timeline-section-observed`/`.weather-timeline-section-forecast`, and restyle `.weather-timeline-now-label` as a filled pill, per `contracts/timeline-structure.md`
- [X] T012 [US2] In `tests/integration/weatherIconOverview.test.tsx`, add tests: both section labels present and correctly proportioned when forecast data exists; only "Observed" renders (no empty "Forecast" section) when there's none (depends on T010)

**Checkpoint**: US1-US2 both work independently.

---

## Phase 5: User Story 3 - Each timeline row keeps its label and units in view (Priority: P1)

**Goal**: Every row's label/unit/sub-label stays visible in a sticky left column while the row's data scrolls horizontally.

**Independent Test**: Open a wide timeline; scroll it; confirm every row's label column stays pinned to the left edge.

- [X] T013 [US3] In `src/components/WeatherIconOverview.tsx`, restructure `LineRow`/`BarRow`/`WindRow`/`ConditionRow` to a flex-row wrapper with a sticky `.weather-timeline-row-title` column; add an optional `subLabel` prop (Rain: "Probability", Wind: "Gusts"); add a title stub to the time-label row and a "Weather" title to `ConditionRow`, per `contracts/timeline-structure.md` (depends on T010 — same file, apply after)
- [X] T014 [P] [US3] In `src/index.css`, add `.weather-timeline-row-label-wrap` (flex row), `.weather-timeline-row-title` (sticky, fixed width, opaque background), `.weather-timeline-row-sublabel`, and `.weather-timeline-row-grid-cells` (flex: 1), per `contracts/timeline-structure.md`
- [X] T015 [US3] In `tests/integration/weatherIconOverview.test.tsx`, add tests: Rain shows a "Probability" sub-label and Wind shows "Gusts" in the title column; `ConditionRow` shows a "Weather" title; every row's title element carries the sticky-column class (depends on T013)

**Checkpoint**: US1-US3 all work independently — the P1 slice of this redesign is complete.

---

## Phase 6: User Story 4 - A "Today" summary card (Priority: P2)

**Goal**: A persistent card shows today's high/low, description, rain, wind+direction, and sunrise/sunset on all three tabs.

**Independent Test**: Open any tab; confirm the Today card shows all fields, with gap indicators for anything genuinely missing.

- [X] T016 [P] [US4] In `src/services/format.ts`, add `directionToCompass(degrees)` (8-point compass abbreviation), per `data-model.md`
- [X] T017 [P] [US4] In `tests/unit/format.test.ts`, add `directionToCompass` tests covering all 8 points and the wraparound near 360°/0°
- [X] T018 [P] [US4] In `tests/unit/dailyAggregation.test.ts`, add a test asserting `windDirection` is the bucket's most recent non-null reading (depends on T002)
- [X] T019 [US4] Create `src/components/TodaySummaryCard.tsx` (icon, high/low, description, rain, wind+compass, sunrise/sunset; gap indicator for any null field), per `contracts/summary-cards.md` (depends on T016)
- [X] T020 [US4] In `src/components/WeatherIconOverview.tsx`, add the `weeklySeries` prop, derive `weeklyDays`/`today` (last non-forecast entry from `toDailyAggregates(weeklySeries.observations, 7)`), and mount `<TodaySummaryCard>` unconditionally (not gated on `displayMode`), per `contracts/summary-cards.md` (depends on T013, T003, T019)
- [X] T021 [US4] In `src/App.tsx`, pass `weeklySeries` from `useObservationData` through to `WeatherIconOverview` (depends on T003, T006, T020)
- [X] T022 [P] [US4] In `src/index.css`, add `.today-summary-card` and its child element rules
- [X] T023 [US4] In `tests/integration/weatherIconOverview.test.tsx`, add tests: Today card shows icon/high-low/description/rain/wind-with-compass/sunrise-sunset; missing fields show the gap indicator, never a fabricated value; the card is visible on all three tabs (depends on T020, T021)

**Checkpoint**: US1-US4 all work independently.

---

## Phase 7: User Story 5 - A 7-day forecast strip (Priority: P2)

**Goal**: A persistent strip of day-cards (icon + high/low) shows all 7 days, on all three tabs.

**Independent Test**: Open any tab; confirm one card per available day, never a fabricated day beyond the forecast's own reach.

- [X] T024 [US5] Create `src/components/WeeklyForecastStrip.tsx` (one card per `days` entry: weekday, icon, high/low), per `contracts/summary-cards.md`
- [X] T025 [US5] In `src/components/WeatherIconOverview.tsx`, mount `<WeeklyForecastStrip days={weeklyDays} unit={unit} />` unconditionally, per `contracts/summary-cards.md` (depends on T020, T024)
- [X] T026 [P] [US5] In `src/index.css`, add `.weekly-forecast-strip` and `.weekly-forecast-day` rules
- [X] T027 [US5] In `tests/integration/weatherIconOverview.test.tsx`, add tests: the strip shows exactly as many cards as `toDailyAggregates` returned (never fabricated); it's visible on all three tabs; switching to/from the 7-day tab triggers no duplicate `getObservations` call for `last-7-days` (depends on T025)

**Checkpoint**: US1-US5 all work independently.

---

## Phase 8: User Story 6 - A footer that discloses data sources and freshness (Priority: P3)

**Goal**: The footer shows the active data source(s) and last-updated time, alongside version/Privacy.

**Independent Test**: With a location selected, confirm the footer shows source + freshness text; with none selected, confirm it's absent.

- [X] T028 [US6] In `src/services/format.ts`, add `dataSourceDisclosure(series)` (a longer-form sibling of `dataSourceNote`), per `contracts/footer-redesign.md` (depends on T016 — same file, apply after)
- [X] T029 [P] [US6] In `tests/unit/format.test.ts`, add `dataSourceDisclosure` tests for the smhi/open-meteo/fallback/undefined-`primarySource` cases (depends on T028)
- [X] T030 [US6] In `src/components/Footer.tsx`, accept `series`/`lastUpdated` props and render the disclosure + "Updated HH:MM" text only when `series !== null`, per `contracts/footer-redesign.md` (depends on T028)
- [X] T031 [US6] In `src/App.tsx`, pass `series`/`lastUpdated` to `<Footer>` (depends on T021, T030 — same file, apply after)
- [X] T032 [P] [US6] In `src/index.css`, add `.app-footer-source` and extend `.app-footer` with `justify-content: space-between`
- [X] T033 [US6] In `tests/integration/footer.test.tsx`, add tests: the source/freshness text renders when `series` is present, is absent when `null`; version/Privacy are unaffected either way (depends on T030, T031)

**Checkpoint**: All 6 user stories are independently functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T034 [P] Run the manual validation scenarios in `specs/018-dashboard-visual-redesign/quickstart.md` (desktop + mobile, all 3 themes) via Playwright, covering all 6 user stories — the sticky-column and section-pill visuals (US2/US3) are best confirmed this way since jsdom can't meaningfully assert `position: sticky`
- [X] T035 Run `npm test` (full suite), `npm run lint`, and `npm run build`; fix any regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: T002 and T003 are independent of each other and of US1-US3; both are prerequisites for US4/US5/US6 only
- **User Stories (Phase 3-8)**: Ordered here by priority (P1 → P2 → P3); several share files that must be edited in the order listed below within a single session to avoid merge conflicts
- **Polish (Phase 9)**: Depends on all 6 user stories being complete

### Shared-File Ordering

- `src/App.tsx`: T006 (US1) → T021 (US4) → T031 (US6)
- `src/components/WeatherIconOverview.tsx`: T007 (US1) → T010 (US2) → T013 (US3) → T020 (US4) → T025 (US5)
- `src/services/format.ts`: T016 (US4) → T028 (US6)
- `src/index.css`: additive rules from every story — no real conflict risk, order-independent

### Within Each User Story

- New standalone components before the file that mounts them.
- Data-layer changes (Foundational) before the UI that consumes them.
- Implementation before its own tests (tests can be written alongside; TDD not required since not explicitly requested).

### Parallel Opportunities

- T002 and T003 (Foundational) — different files, safe together.
- T004 and T005 (US1's two new components) — different files.
- T016, T017, T018 (US4's format/test groundwork) — different files, though T017 depends on T016 landing first for the import to exist; T018 is fully independent.
- Every `index.css` task (T008, T011, T014, T022, T026, T032) is safe to parallelize with its story's non-CSS tasks.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 → validate independently — the consolidated header ships alone
4. **STOP and VALIDATE**: deploy/demo if ready

### Incremental Delivery

1. Setup → Foundational → US1 (header)
2. US2 → US3 (timeline structure — completes the P1 slice)
3. US4 → US5 (summary cards)
4. US6 (footer)
5. Each story adds value without breaking previously-shipped stories

---

## Notes

- [P] tasks touch different files with no dependency on an incomplete task
- [Story] label maps each task to its user story for traceability
- Commit after each story's checkpoint, per this session's standing "commit and push after every
  /speckit-implement" preference
