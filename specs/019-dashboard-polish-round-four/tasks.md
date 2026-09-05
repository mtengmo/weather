---

description: "Task list for 019-dashboard-polish-round-four"
---

# Tasks: Dashboard Polish Round Four

**Input**: Design documents from `/specs/019-dashboard-polish-round-four/`

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

**No Foundational phase**: all 8 stories touch disjoint file sets or make independent, additive
changes to shared files (see Shared-File Ordering below) — none blocks another's start.

---

## Phase 2: User Story 1 - See which location the dashboard is showing (Priority: P1) 🎯 MVP

**Goal**: The selected location's name is visible in the persistent header on every view.

**Independent Test**: Select a location; confirm its name is visible in the header without opening any menu, on every tab/view.

- [X] T002 [US1] In `src/App.tsx`, add a `.current-location-name` element inside `.current-conditions`, rendering `selected.displayName` whenever `selected !== null`, per `contracts/header-and-navigation.md`
- [X] T003 [P] [US1] In `src/index.css`, add `.current-location-name` styling (weight/size consistent with the mockup's inline header treatment)
- [X] T004 [US1] In `tests/integration/appHeader.test.tsx`, add a test asserting the selected location's name is visible in the header (`getByRole("banner")`) on the Overview, graph, details, and map views

**Checkpoint**: The header regression is independently shippable and testable.

---

## Phase 3: User Story 2 - Leave the map view (Priority: P1)

**Goal**: A "Back" control on the map view returns the user to the view they came from.

**Independent Test**: Open the map view from any screen; confirm a "Back" control returns to that same screen.

- [X] T005 [US2] In `src/App.tsx`, add `previousView` state, `openMap`/`closeMap` handlers, and swap the "Map" button for a "Back" button while `view === "map"`, per `contracts/header-and-navigation.md` (same file as T002 — apply after)
- [X] T006 [US2] In `tests/integration/appHeader.test.tsx`, add tests: opening Map from Overview then clicking Back returns to Overview; opening Map from the graph view then clicking Back returns to the graph view

**Checkpoint**: US1-US2 both work independently.

---

## Phase 4: User Story 3 - Read the Display and Forecast-sources menus in every theme (Priority: P1)

**Goal**: Both dropdown menus are legible against an opaque background in every theme.

**Independent Test**: Open each dropdown in the "glass" theme; confirm the background is opaque enough to read the contents clearly.

- [X] T007 [P] [US3] In `src/index.css`, add `.display-menu-content` and `.forecast-sources-control ul` to the existing `[data-theme="glass"] .location-panel-content` selector list, per `contracts/timeline-and-display-fixes.md`
- [X] T008 [P] [US3] In a new `tests/unit/indexCssGlassTheme.test.ts` (or append to an existing CSS-source test if one exists), read `src/index.css` via `readFileSync` and assert the `[data-theme="glass"]` opaque-background rule's selector list includes both `.display-menu-content` and `.forecast-sources-control ul` (mirrors this repo's existing precedent of asserting `index.html`'s raw source in `tests/integration/footer.test.tsx` for the GA snippet, since jsdom can't meaningfully assert computed `backdrop-filter`/opacity)

**Checkpoint**: US1-US3 all work independently.

---

## Phase 5: User Story 4 - See an accurate rain forecast bar (Priority: P1)

**Goal**: Rain bars share a common zero baseline and scale proportionally to each period's forecasted amount.

**Independent Test**: View a period with varying forecast rain amounts; confirm bar heights scale with amount and share a baseline.

- [X] T009 [US4] Investigate the live root cause per `research.md` §4: run the dev server with a real (or synthetic, via a temporary mocked series) multi-day forecast with varying precipitation amounts on both the 3-day/7-day Overview timeline and the graph view's Rain metric tab; determine which view and which specific data/CSS path produces the misaligned/non-scaling bars the user reported
- [X] T010 [US4] Apply the fix found in T009 (likely `src/components/WeatherIconOverview.tsx`'s `BarRow`, `src/components/timelineData.ts`'s day/sub-day precipitation aggregation, or `src/components/ObservationChart.tsx`'s Rain tab), keeping `BarRow`'s existing `Math.max(2, (point.value / max) * 100)` proportional-height contract and shared bottom baseline intact per `contracts/timeline-and-display-fixes.md`
- [X] T011 [US4] Add a regression test (in `tests/integration/weatherIconOverview.test.tsx` or `tests/integration/chartAndDetails.test.tsx`, matching whichever view T009 identified) asserting a forecast column with more precipitation renders a taller bar than one with less, and that all bars (observed and forecast) share the same baseline

**Checkpoint**: US1-US4 all work independently.

---

## Phase 6: User Story 5 - See wind direction on every timeline resolution (Priority: P1)

**Goal**: The 3-day and 7-day Wind rows show a direction indicator, matching the 24-hour view.

**Independent Test**: View the 3-day and 7-day tabs with wind data; confirm a direction arrow appears alongside the speed.

- [X] T012 [US5] In `src/components/timelineData.ts`'s `daysToTimelineData`, change `windDirection: null` to `windDirection: day.windDirection ?? null`, per `contracts/timeline-and-display-fixes.md`
- [X] T013 [P] [US5] In `tests/integration/weatherIconOverview.test.tsx`, add tests: a wind-direction arrow appears on the Wind row for the 3-day view and for the 7-day view when the underlying data has a wind reading; no arrow is fabricated when a period has no wind reading at all

**Checkpoint**: US1-US5 all work independently — the full P1 slice of this round is complete.

---

## Phase 7: User Story 6 - Understand a paired temperature reading (Priority: P2)

**Goal**: High/low temperature pairs are explicitly labeled wherever they appear.

**Independent Test**: View the Today card and the timeline's high/low parenthetical; confirm both are clearly labeled.

- [X] T014 [US6] In `src/components/TodaySummaryCard.tsx`, add "High"/"Low" labels to `.today-summary-highlow`'s two values, per `contracts/timeline-and-display-fixes.md`
- [X] T015 [US6] In `src/components/WeatherIconOverview.tsx`'s `LineRow`, change the high/low parenthetical from `(${high}°/${low}°)` to `(H ${high}° / L ${low}°)`, per `contracts/timeline-and-display-fixes.md` (depends on T010 — same file, apply after)
- [X] T016 [P] [US6] In `src/index.css`, add `.today-summary-high`/`.today-summary-low` styling if the new markup needs it beyond the existing `.today-summary-highlow` rule
- [X] T017 [US6] In `tests/integration/weatherIconOverview.test.tsx`, update/add tests asserting "High"/"Low" text appears in the Today card and the labeled `H °/L °` form appears in the timeline's high/low parenthetical (depends on T014, T015)

**Checkpoint**: US1-US6 all work independently.

---

## Phase 8: User Story 7 - See a clean, dated 7-day forecast (Priority: P2)

**Goal**: The 7-day timeline and the persistent weekly strip both show exactly 7 dated day columns/cards.

**Independent Test**: Open the 7-day tab for a location with forecast reaching well beyond a week; confirm exactly 7 dated columns, and that the weekly strip below/beside it also shows exactly 7 cards.

- [X] T018 [US7] In `src/components/timelineData.ts`, add and export a `mostRecent<T>(items: T[], count: number): T[]` helper (`items.slice(-count)`); apply it in `buildDailyTimelineData` to cap `toDailyAggregates(series.observations, DAILY_BUCKET_COUNT)` at `DAILY_BUCKET_COUNT`; change the daily column label from `{weekday: "short"}` to `{weekday: "short", day: "numeric"}`, per `contracts/timeline-and-display-fixes.md` (depends on T012 — same file, apply after)
- [X] T019 [US7] In `src/components/WeatherIconOverview.tsx`, import `mostRecent` and cap `weeklyDays` at 7 entries, per `contracts/timeline-and-display-fixes.md` (depends on T015 — same file, apply after; depends on T018 for the helper)
- [X] T020 [US7] In `tests/integration/weatherIconOverview.test.tsx`, add/update tests: the 7-day tab shows exactly 7 columns (not more) when forecast reaches well beyond a week; each column's label includes a calendar date; the persistent weekly forecast strip shows exactly 7 cards under the same condition (depends on T018, T019)

**Checkpoint**: US1-US7 all work independently.

---

## Phase 9: User Story 8 - Trust the forecast source shown (Priority: P2)

**Goal**: "Automatic" strictly prefers SMHI's forecast when available; "Combined" shows one averaged reading per period; a freshness time is always visible for the forecast in use.

**Independent Test**: With "Automatic," confirm SMHI's forecast is used whenever available. With "Combined," confirm one averaged value (not two side-by-side) is shown per forecast period, and a freshness time is visible in the footer.

- [X] T021 [P] [US8] In `src/services/smhiProvider.ts`, add `approvedTime?: string` to `SmhiForecastResponse`; change `fetchForecastTimeSeries` to return `{ timeSeries, issuedAt }`; thread `issuedAt` through `getObservations`' SMHI path as `forecastIssuedAt` on the returned series (`null` when absent), per `contracts/forecast-source-behavior.md`
- [X] T022 [P] [US8] In `src/models/types.ts`, add `forecastIssuedAt?: string | null` to `ObservationSeries`, per `data-model.md`
- [X] T023 [US8] In `src/services/weatherApi.ts`, add `issuedAt: string | null` to `MultiSourceForecastEntry` and populate it from the SMHI path in `getMultiSourceForecast` (`null` for Open-Meteo); add a regression test in `tests/unit/weatherApi.test.ts` (create if it doesn't exist) asserting "Automatic" mode returns SMHI's forecast whenever the location is SMHI-covered and SMHI provides one, matching FR-010 (depends on T021, T022)
- [X] T024 [US8] In `src/components/timelineData.ts`'s `mergeMultiSourceIntoTimelinePoints`, replace populating `point.sources` with overwriting `point.value` to the mean of the two sources' per-period averages and setting `point.combined = true`; remove the now-unused `sources` field from `TimelineRowPoint`, per `contracts/forecast-source-behavior.md` (depends on T018 — same file, apply after)
- [X] T025 [US8] In `src/components/WeatherIconOverview.tsx`'s `LineRow`, replace the `point.sources !== undefined` rendering branch with `point.combined ? "... (avg)" : ...`, per `contracts/timeline-and-display-fixes.md` (depends on T015, T019 — same file, apply after; depends on T024)
- [X] T026 [US8] In `src/services/format.ts`, change `dataSourceDisclosure` to accept `lastUpdated` as a second parameter and append a `(updated HH:MM)` fragment using `series.forecastIssuedAt ?? lastUpdated`, per `contracts/forecast-source-behavior.md`
- [X] T027 [US8] In `src/components/Footer.tsx`, update the `dataSourceDisclosure(series)` call site to `dataSourceDisclosure(series, lastUpdated)` (depends on T026)
- [X] T028 [US8] In `tests/unit/format.test.ts`, update `dataSourceDisclosure` tests for the new signature and the appended freshness fragment; in `tests/integration/footer.test.tsx`, update the existing disclosure test to match the new rendered text (depends on T026, T027)
- [X] T029 [US8] In `tests/integration/weatherIconOverview.test.tsx`, add a test asserting "Combined" mode shows exactly one "(avg)"-suffixed value per forecast period (no per-source values) when 2+ sources have data for that period (depends on T024, T025)

**Checkpoint**: All 8 user stories are independently functional.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T030 [P] Run the manual validation scenarios in `specs/019-dashboard-polish-round-four/quickstart.md` (all 8 user stories, all 3 themes for US3) via Playwright against the dev server
- [X] T031 Run `npm test` (full suite), `npm run lint`, and `npm run build`; fix any regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **User Stories (Phase 2-9)**: Ordered here by priority (P1 → P2); several share files that must be edited in the order listed below within a single session to avoid merge conflicts
- **Polish (Phase 10)**: Depends on all 8 user stories being complete

### Shared-File Ordering

- `src/App.tsx`: T002 (US1) → T005 (US2)
- `src/components/WeatherIconOverview.tsx`: T010 (US4, if T009 lands there) → T015 (US6) → T019 (US7) → T025 (US8)
- `src/components/timelineData.ts`: T012 (US5) → T018 (US7) → T024 (US8)
- `src/services/format.ts`: T026 (US8) only
- `src/components/Footer.tsx`: T027 (US8) only
- `src/index.css`: additive rules from every story — no real conflict risk, order-independent

### Within Each User Story

- Investigation before fix, where the root cause isn't already known (US4 only).
- Implementation before its own tests (tests can be written alongside; TDD not required since not explicitly requested).

### Parallel Opportunities

- T003 (US3's index.css) and T007/T008 (US3's own tasks) — different files, safe together across stories once each story's own same-file ordering above is respected.
- T021 and T022 (US8's smhiProvider.ts and types.ts) — different files.
- Every `index.css`-only task (T003, T007, T016) is safe to parallelize with its story's non-CSS tasks.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 1 → validate independently — the header regression fix ships alone
3. **STOP and VALIDATE**: deploy/demo if ready

### Incremental Delivery

1. Setup → US1 (header) → US2 (map back) → US3 (dropdown legibility) → US4 (rain bar) → US5 (wind direction) — completes the P1 slice
2. US6 (high/low labels) → US7 (7-day cap/dates) → US8 (forecast source behavior)
3. Each story adds value without breaking previously-shipped stories

---

## Notes

- [P] tasks touch different files with no dependency on an incomplete task
- [Story] label maps each task to its user story for traceability
- Commit after each story's checkpoint, per this session's standing "commit and push after every
  /speckit-implement" preference
