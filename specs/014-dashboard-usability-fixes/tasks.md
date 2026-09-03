---

description: "Task list for 014-dashboard-usability-fixes"
---

# Tasks: Dashboard Usability Fixes

**Input**: Design documents from `/specs/014-dashboard-usability-fixes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in the spec, but included per this repo's established convention (every prior feature 009-013 paired implementation tasks with unit/integration test tasks in the same phase).

**Organization**: Tasks are grouped by user story (spec.md priorities: US1/US2 = P1, US3/US4/US5 = P2, US6/US7/US8 = P3) so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Paths are relative to the repo root (`c:\GitRepos\weather`)

---

## Phase 1: Setup

- [X] T001 Run `npm test` and `npm run build` to confirm a clean baseline before starting (no repo-config changes needed — no new dependencies are introduced by this feature)

---

## Phase 2: Foundational

No cross-cutting scaffolding is required before user story work can begin — every story's changes are additive to existing files (`App.tsx`, `LocationPanel.tsx`, `timelineData.ts`, etc.) or entirely new files, with no shared new infrastructure. Proceed directly to Phase 3. (File-level overlaps between stories are called out in Dependencies & Execution Order below.)

---

## Phase 3: User Story 1 - View a searched place without saving it first (Priority: P1) 🎯 MVP

**Goal**: Search results offer a "View" action that shows a place's weather immediately, independent of "Add to favorites."

**Independent Test**: Search for a place that isn't already a favorite; confirm it can be viewed immediately without first adding it to favorites, and that adding it to favorites remains available separately.

- [X] T002 [P] [US1] In `src/components/PlaceSearch.tsx`, rename `PlaceSearchProps.onSelect` to `onAddFavorite` and add a new `onView: (place: PlaceCandidate) => void` prop; render both an "Add to favorites" button (`onAddFavorite`) and a new "View" button (`onView`) per result `<li>`, both clearing the search query/results on click per `contracts/location-actions.md`
- [X] T003 [US1] In `src/components/LocationPanel.tsx`, add a `candidateToLocation(place: PlaceCandidate): Location` helper and pass `PlaceSearch` both `onAddFavorite={onAddFavorite}` and `onView={(place) => selectAndClose(candidateToLocation(place))}` (depends on T002)
- [X] T004 [US1] In `src/App.tsx`, rename the prop passed to `LocationPanel` from `onSelect`/`onAddFavorite` mismatch so favoriting still calls `add(candidate)` under the new `onAddFavorite` name (depends on T003)
- [X] T005 [P] [US1] In `tests/integration/appHeader.test.tsx`, add cases covering: viewing a search result switches the active location without adding it to favorites; adding a search result to favorites still works independently (acceptance scenarios 1-3)

**Checkpoint**: A user can view any search result's weather in one action, without a favoriting step; favoriting still works separately.

---

## Phase 4: User Story 2 - Regain access to "current location" after declining permission (Priority: P1)

**Goal**: A user who denied the location prompt can retry current-location from within the app.

**Independent Test**: Deny the location permission prompt; confirm the app still offers a way to request current location again, and granting it on retry shows that location's weather.

- [X] T006 [P] [US2] In `src/components/LocationSwitcher.tsx`, add `geoStatus: GeolocationStatus` and `onRequestCurrentLocation: () => void` to `LocationSwitcherProps`; when `currentLocation` is `null` and `geoStatus` is `"denied"` or `"unavailable"`, render a "Use current location" button calling `onRequestCurrentLocation`, per `contracts/location-actions.md`
- [X] T007 [US2] In `src/components/LocationPanel.tsx`, add `geoStatus`/`onRequestCurrentLocation` to `LocationPanelProps` and pass them through to `LocationSwitcher` (depends on T003, T006 — same file as US1's T003, apply sequentially)
- [X] T008 [US2] In `src/App.tsx`, pass the already-destructured `geoStatus` and `requestLocation` (from `useGeolocation()`) into `LocationPanel` as `geoStatus`/`onRequestCurrentLocation` (depends on T004, T007 — same file as US1's T004, apply sequentially)
- [X] T009 [P] [US2] In `tests/integration/appHeader.test.tsx`, add a case simulating a denied `geoStatus`, confirming the "Use current location" retry button appears and calls the retry handler (acceptance scenarios 1-2)

**Checkpoint**: US1 and US2 both work independently; a denied location permission no longer traps the user.

---

## Phase 5: User Story 3 - The 7-day timeline fills the screen on wide displays (Priority: P2)

**Goal**: The 7-day Overview's columns stretch to fill available width when they fit, matching the 24-hour view.

**Independent Test**: Open the 7-day Overview on a wide viewport; confirm columns stretch to fill width; confirm narrow-viewport scrolling and the 24-hour view are unaffected.

- [X] T010 [P] [US3] In `src/components/WeatherIconOverview.tsx`, apply an additional `weather-timeline-fill` class to the `.weather-timeline` div only when `window === "last-7-days"`, per `contracts/overview-parity.md`
- [X] T011 [P] [US3] In `src/index.css`, add `.weather-timeline-fill { width: 100%; }`, overriding the base `.weather-timeline` rule's `width: max-content` while `min-width: 900px` is inherited unchanged (preserves narrow-viewport scroll fallback)
- [X] T012 [P] [US3] In `tests/integration/weatherIconOverview.test.tsx`, add cases asserting the fill class is present for the 7-day window and absent for the 24-hour window (acceptance scenarios 1-3)

**Checkpoint**: US1-US3 all work independently; the 7-day Overview no longer wastes space on wide screens.

---

## Phase 6: User Story 4 - The high/low toggle also affects the Overview (Priority: P2)

**Goal**: The existing app-wide High/Low toggle makes the 7-day Overview's temperature row show each day's high/low.

**Independent Test**: Turn on High/Low, open the 7-day Overview; confirm the temperature row shows high/low, not just the average; turn it off and confirm it reverts.

- [X] T013 [P] [US4] In `src/components/timelineData.ts`, add optional `high?: number | null` / `low?: number | null` fields to `RowSource` and `TimelineRowPoint`
- [X] T014 [US4] In `src/components/timelineData.ts`'s `buildDailyTimelineData`, populate the temperature row's `high`/`low` from each `DailyAggregate.high`/`.low`, converted via `convertTemperature` (depends on T013)
- [X] T015 [US4] In `src/components/WeatherIconOverview.tsx`, add a `highLowVisible: boolean` prop; in `LineRow`'s value-label rendering, show `` `${formatRowValue(row, point.value)} (${high}°/${low}°)` `` when `highLowVisible` and both `point.high`/`point.low` are present, else the existing plain label, per `contracts/overview-parity.md` (depends on T014)
- [X] T016 [US4] In `src/App.tsx`, pass the existing High/Low preference state as `highLowVisible` to `WeatherIconOverview` (depends on T015)
- [X] T017 [P] [US4] In `tests/unit/timelineData.test.ts`, add cases asserting `high`/`low` are populated on the daily temperature row and absent elsewhere
- [X] T018 [P] [US4] In `tests/integration/weatherIconOverview.test.tsx`, add cases toggling `highLowVisible` on/off on the 7-day Overview and asserting the temperature row's displayed text (acceptance scenarios 1-3)

**Checkpoint**: US1-US4 all work independently; the High/Low toggle is no longer a no-op on the Overview.

---

## Phase 7: User Story 5 - The nearby-stations control is hidden on the Overview (Priority: P2)

**Goal**: The "Nearby stations" header control only appears on the graph view.

**Independent Test**: Open the Overview; confirm the control is absent. Switch to the graph view; confirm it reappears and still works.

- [X] T019 [US5] In `src/App.tsx`, wrap the existing `<NearbyStationCountControl .../>` render in `{view !== "overview" && (...)}`, per `contracts/overview-parity.md`
- [X] T020 [P] [US5] In `tests/integration/appHeader.test.tsx`, add cases asserting the control is absent on the Overview and present on the graph view (acceptance scenarios 1-2)

**Checkpoint**: US1-US5 all work independently; the header no longer shows a no-op control on the Overview.

---

## Phase 8: User Story 6 - Swedish and Nordic places are easier to find (Priority: P3)

**Goal**: Search results rank Nordic places first without excluding non-Nordic results.

**Independent Test**: Search for a place name existing both in a Nordic country and elsewhere; confirm the Nordic result(s) appear first while non-Nordic result(s) remain present and selectable.

- [X] T021 [P] [US6] In `src/services/geocodingApi.ts`, read `country_code` from each Open-Meteo geocoding result and stable-sort `searchPlaces`'s output so results in `{SE, NO, DK, FI, IS}` rank before all others (preserving relative order within each group), per the full `searchPlaces` reimplementation in `contracts/nordic-ranking.md`; keep `PlaceCandidate`'s public shape (`latitude`/`longitude`/`displayName`) unchanged
- [X] T022 [P] [US6] In `tests/unit/geocodingApi.test.ts`, add cases asserting Nordic-first ordering for mixed results and full retention (no exclusion) of non-Nordic-only results (acceptance scenarios 1-2)

**Checkpoint**: US1-US6 all work independently; Nordic places surface first in search.

---

## Phase 9: User Story 7 - Combine multiple forecast sources into one averaged line (Priority: P3)

**Goal**: A "combine forecast sources" toggle shows an averaged forecast line plus every individual source's own line, forecast-only.

**Independent Test**: Open a location with more than one forecast source; turn on the option; confirm the averaged line and every source's own line appear; confirm observed data and single-source locations are unaffected.

- [X] T023 [P] [US7] Create `src/services/combineForecastPreference.ts` with `getCombineForecastSourcesPreference()`/`setCombineForecastSourcesPreference()`, mirroring `units.ts`'s localStorage get/set pattern, per `contracts/multi-source-forecast.md`
- [X] T024 [P] [US7] Create `src/hooks/useCombineForecastSourcesPreference.ts` mirroring `useUnitPreference.ts`'s shape (`useState(() => getX())` + persisting setter)
- [X] T025 [US7] In `src/services/weatherApi.ts`, add the `MultiSourceForecastEntry` interface and `getMultiSourceForecast(location, window)`, fetching SMHI-forecast and Open-Meteo-forecast-only in parallel via `Promise.allSettled`, per the full implementation in `contracts/multi-source-forecast.md`
- [X] T026 [US7] In `src/components/chartData.ts`, add `sourceKey(index)` and `buildMultiSourceForecastRows(entries, unit)` (per-timestamp averaging across whichever sources have data), per `contracts/multi-source-forecast.md` (depends on T025's `MultiSourceForecastEntry` type)
- [X] T027 [P] [US7] Create `src/components/CombineForecastToggle.tsx` mirroring `HighLowToggle.tsx`'s shape (`role="group"`, two `aria-pressed` buttons, `combined`/`onChange` props)
- [X] T028 [US7] In `src/App.tsx`, wire `useCombineForecastSourcesPreference()`, render `<CombineForecastToggle .../>` in the header, and fetch `multiSourceForecast` via `getMultiSourceForecast` only when the preference is on (mirroring the existing conditional nearby-station fetch), threading both `combineForecastSources` and `multiSourceForecast` into `ObservationChart` as new props (depends on T024, T025, T027)
- [X] T029 [US7] In `src/components/ObservationChart.tsx`, when `metric === "temperature"`, `combineForecastSources` is true, and `multiSourceForecast` has more than one entry, render one additional `<Line dataKey={sourceKey(i)}>` per source plus one `<Line dataKey="average">` using `buildMultiSourceForecastRows`'s output, laid out like the existing nearby-station comparison lines; render nothing extra when 0-1 entries (depends on T026, T028)
- [X] T030 [P] [US7] In `tests/unit/weatherApi.test.ts`, add cases for `getMultiSourceForecast`'s fail-soft behavior when one source rejects or returns no forecast data
- [X] T031 [P] [US7] In `tests/unit/chartData.test.ts`, add cases for `buildMultiSourceForecastRows`'s per-timestamp averaging across 1 and 2+ sources
- [X] T032 [P] [US7] In `tests/integration/chartAndDetails.test.tsx`, add smoke tests (per this repo's documented jsdom/Recharts limitation — no structural line-count assertions) toggling `combineForecastSources` on/off and switching metrics/windows, asserting no error state appears (acceptance scenarios 1-5)

**Checkpoint**: US1-US7 all work independently; forecast-source comparison is available without touching observed data or single-source locations.

---

## Phase 10: User Story 8 - More detail in the 7-day view for the next two days (Priority: P3)

**Goal**: The 7-day Overview's first two days each show 5 sub-day columns instead of one daily column; days 3-7 are unaffected.

**Independent Test**: Open the 7-day Overview; confirm days 1-2 each show morning/lunch/afternoon/evening/night sub-columns while days 3-7 remain single columns.

- [X] T033 [US8] In `src/services/dailyAggregation.ts`, add a `SubDayPeriod` type, `SUB_DAY_PERIODS` constant (morning 06-11, lunch 11-13, afternoon 13-17, evening 17-21, night 21-06), a `DailyAggregate.subDayLabel?: string` field, and `toSubDayAndDailyBuckets(observations, dailyBucketCount)`, which replaces the first two of `toDailyAggregates`' buckets with 5 fixed sub-day buckets each (reusing the existing per-bucket aggregation math) while leaving buckets for days 3+ identical to `toDailyAggregates`'s own output, per `contracts/overview-parity.md`
- [X] T034 [US8] In `src/components/timelineData.ts`'s `buildDailyTimelineData`, switch the call from `toDailyAggregates(series.observations, DAILY_BUCKET_COUNT)` to `toSubDayAndDailyBuckets(series.observations, DAILY_BUCKET_COUNT)`, and use `day.subDayLabel` (when present) instead of the weekday name for `TimelinePeriod.label` (depends on T033)
- [X] T035 [P] [US8] In `tests/unit/dailyAggregation.test.ts`, add cases for `toSubDayAndDailyBuckets`'s bucket boundaries and aggregation math, confirming days 3+ are unaffected and no buckets are fabricated beyond what hourly data reaches
- [X] T036 [P] [US8] In `tests/unit/timelineData.test.ts`, add cases asserting sub-day labels appear on days 1-2 and standard daily labels are unchanged on days 3-7 (acceptance scenarios 1-3)

**Checkpoint**: All 8 user stories are independently functional.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T037 [P] Run the manual validation scenarios in `specs/014-dashboard-usability-fixes/quickstart.md` (desktop + mobile, all 3 themes) via Playwright, covering all 8 user stories
- [X] T038 Run `npm test` (full suite) and `npm run build`; fix any regressions across all 8 stories
- [X] T039 [P] Review new code for stray comments/dead code left over from following the contracts literally; trim anything that doesn't meet this repo's "why, not what" comment convention

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: None required — proceed directly to Phase 3
- **User Stories (Phase 3-10)**: All can start after Setup; ordered here by priority (P1 → P2 → P3), but each story is independently testable
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1, US2 (P1)**: Independent of every other story, but both touch `LocationPanel.tsx` and `App.tsx` — implement US1 fully (T002-T005) before starting US2's shared-file tasks (T007-T008) to avoid merge conflicts within the same session
- **US3, US4, US5 (P2)**: Fully independent of US1/US2 and of each other (different files/props); US4's T015-T016 touch `WeatherIconOverview.tsx`/`App.tsx` alongside US3's T010 and US5's T019 — sequence within a session if working solo, safe to parallelize across contributors
- **US6 (P3)**: Fully independent — touches only `geocodingApi.ts`
- **US7 (P3)**: Fully independent — new files plus additive changes to `weatherApi.ts`, `chartData.ts`, `ObservationChart.tsx`, `App.tsx` (shares `App.tsx` with US4/US5/US2 — sequence within a session)
- **US8 (P3)**: Fully independent — touches only `dailyAggregation.ts`/`timelineData.ts` (shares `timelineData.ts` with US4 — sequence within a session)

### Within Each User Story

- Type/interface changes before the logic that populates them
- Logic changes before the UI that consumes them
- Implementation before its tests (tests can be written alongside or after; TDD not required since not explicitly requested)

### Parallel Opportunities

- T002 (US1), T006 (US2), T010+T011 (US3), T013 (US4), T021 (US6), T023+T024+T027 (US7), and T035-T036 (US8's tests) all touch files no other in-flight task touches — safe to parallelize across contributors
- All test-only tasks marked [P] within a story can run in parallel with each other once their story's implementation lands

---

## Parallel Example: User Story 7

```bash
# Launch independent US7 setup tasks together:
Task: "Create src/services/combineForecastPreference.ts"
Task: "Create src/hooks/useCombineForecastSourcesPreference.ts"
Task: "Create src/components/CombineForecastToggle.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 → validate independently
3. Complete Phase 4: User Story 2 → validate independently
4. **STOP and VALIDATE**: both P1 usability blockers are fixed — deploy/demo if ready

### Incremental Delivery

1. Setup → US1 → US2 (MVP: both P1 fixes)
2. US3 → US4 → US5 (P2: Overview parity fixes)
3. US6 → US7 → US8 (P3: quality-of-life and speculative additions)
4. Each story adds value without breaking previously-shipped stories

---

## Notes

- [P] tasks touch different files with no dependency on an incomplete task
- [Story] label maps each task to its user story for traceability
- Commit after each story's checkpoint, consistent with this session's established "/speckit-implement and commit push" pattern
- Recharts-under-jsdom renders nothing (confirmed empirically in 013) — US7's chart tests (T032) must stay smoke tests, not structural assertions
