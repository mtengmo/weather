---

description: "Task list for MET Norway Forecast Source & Richer Conditions"
---

# Tasks: MET Norway Forecast Source & Richer Conditions

**Input**: Design documents from `/specs/022-met-forecast-source/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested for this round; test tasks are included per this session's
established practice of updating/adding unit and integration tests alongside implementation.

**Organization**: Tasks are grouped by user story (P1: US1, US2; P2: US3; P3: US4), matching
spec.md's priorities.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No new project setup required — all changes touch existing files plus one new provider file
(`src/services/metNoProvider.ts`), following the existing `openMeteoProvider.ts` shape.

---

## Phase 2: Foundational

No blocking prerequisites — US1, US2, US3, and US4 touch disjoint sets of files (confirmed during
planning) and can proceed in any order.

---

## Phase 3: User Story 1 - A third independent forecast source (Priority: P1) 🎯 MVP

**Goal**: Fetch MET Norway's public forecast as a third source, blended alongside SMHI and
Open-Meteo, with its own genuine "generated at" timestamp and footer attribution.

**Independent Test**: Reload the dashboard with DevTools Network open; confirm a successful
`api.met.no` request, and that the footer names MET Norway when it genuinely contributes to the
blend (per quickstart.md US1).

### Implementation for User Story 1

- [X] T001 [US1] Create `src/services/metNoProvider.ts` implementing `getForecastOnly` per
      data-model.md: fetch `locationforecast/2.0/compact` with 6-decimal-rounded coordinates
      (reusing the same rounding approach as `smhiProvider.ts`'s `roundCoordinate`), map
      `timeseries` entries within `FORECAST_HOURS[window]` into `WeatherObservation`s
      (temperature/windSpeed/windDirection/cloudCoverPercent from `instant.details`, precipitation
      from `next_1_hours.details.precipitation_amount`), classify each observation's
      `symbolCondition` via a new `classifyMetNoSymbol(code: string)` substring-matching function
      (per research.md §3: thunder → thunderstorm, fog → foggy, sleet → sleet, snow → snowy,
      rain → rainy, clearsky → clear-day/night via `_day`/`_night` suffix, cloud/fair → cloudy),
      return `issuedAt` from `properties.meta.updated_at`, and degrade to
      `{ observations: [], issuedAt: null }` on any fetch/parse failure
- [X] T002 [US1] Add `"met-no"` to `MultiSourceForecastEntry.source` and update
      `getMultiSourceForecast` in `src/services/weatherApi.ts` to fetch SMHI, Open-Meteo, and
      MET Norway concurrently via `Promise.allSettled`, pushing an entry only for a source that
      returned 1+ forecast observations (per contracts/met-no-source.md)
- [X] T003 [US1] Add a `"met-no": "MET Norway"` entry to `SOURCE_LABELS` in
      `src/components/ObservationChart.tsx`
- [X] T004 [US1] Widen `dataSourceDisclosure`'s `combined: boolean` parameter to
      `contributingForecastSourceNames: string[]` in `src/services/format.ts`, joining 2+ names
      with `" + "` (e.g. `"SMHI + MET Norway forecast"`) and keeping plain `"Forecast"` for 0-1
      names, per data-model.md
- [X] T005 [US1] Update `FooterProps` to `contributingForecastSourceNames: string[]` (replacing
      `combinedForecast: boolean`) and thread it into `dataSourceDisclosure` in
      `src/components/Footer.tsx`
- [X] T006 [US1] Update the `<Footer>` call site in `src/App.tsx` to pass
      `contributingForecastSourceNames` built from `multiSourceForecast.map(...)` and a new
      `SOURCE_DISPLAY_NAMES` map (`smhi` → "SMHI", `open-meteo` → "Open-Meteo",
      `met-no` → "MET Norway")
- [X] T007 [P] [US1] Add `tests/unit/metNoProvider.test.ts` covering: `issuedAt` threads
      `properties.meta.updated_at` verbatim; `classifyMetNoSymbol` maps
      `"heavyrainandthunder"` → `thunderstorm` (matches "thunder" before other substrings),
      `"fog"` → `foggy`, `"lightsleet"` → `sleet`, `"clearsky_night"` → `clear-night`; a
      non-ok/thrown fetch degrades to `{ observations: [], issuedAt: null }`
- [X] T008 [P] [US1] Update `tests/unit/format.test.ts`'s `dataSourceDisclosure` tests to pass
      `contributingForecastSourceNames: string[]` instead of the old `combined: boolean`,
      including a 3-name-join case (`"SMHI + Open-Meteo + MET Norway forecast"`)
- [X] T009 [P] [US1] Update `tests/integration/footer.test.tsx` for the new
      `contributingForecastSourceNames` prop (replacing `combinedForecast`)
- [X] T010 [US1] Update `tests/unit/weatherApi.test.ts`'s `getMultiSourceForecast` tests to mock
      `metNoProvider` and assert a 3-entry result when all three sources succeed, and correct
      degradation when MET Norway alone fails

**Checkpoint**: US1 is independently complete and testable — MET Norway is a genuine third
forecast source with correct attribution.

---

## Phase 4: User Story 2 - Fix the 7-day strip's broken icon colors (Priority: P1)

**Goal**: Give the 7-day forecast strip's icons the same per-condition colors the main timeline
already has.

**Independent Test**: Compare a day's icon color in the 7-day strip against the same condition's
icon on the main timeline (per quickstart.md US2). Fully independent of US1/US3/US4.

### Implementation for User Story 2

- [X] T011 [US2] Wrap each day's icon in a `weather-condition-${condition}` class (matching
      `ConditionRow`'s existing pattern) in `src/components/WeeklyForecastStrip.tsx`, per
      data-model.md
- [X] T012 [P] [US2] Add or update a test asserting `WeeklyForecastStrip`'s rendered day element
      carries the `weather-condition-${condition}` class for a known condition (integration test
      alongside existing `WeeklyForecastStrip`/`weatherIconOverview` coverage)

**Checkpoint**: US1 and US2 (both P1) independently complete — MVP scope reached.

---

## Phase 5: User Story 3 - More distinguishable weather conditions (Priority: P2)

**Goal**: Classify thunderstorm, fog, and sleet using each source's own official weather-symbol
code (SMHI's numeric table; MET Norway's from US1), each with its own icon and color, applied
everywhere conditions are shown.

**Independent Test**: With a mocked SMHI `symbol_code` indicating thunderstorm/fog/sleet, confirm
that period shows its own distinct icon/color on the main timeline, 7-day strip, and Details table
(per quickstart.md US3). Testable using SMHI's symbol code alone — does not require US1's MET
Norway integration to be present.

### Implementation for User Story 3

- [X] T013 [US3] Add `"thunderstorm" | "foggy" | "sleet"` to `WeatherCondition` and an optional
      `symbolCondition?: WeatherCondition | null` field to `WeatherConditionInput` in
      `src/services/weatherCondition.ts`; update `deriveWeatherCondition`'s precedence so a
      `symbolCondition` of `thunderstorm`/`foggy`/`sleet` is returned before the windy-threshold
      check, and a `symbolCondition` of `cloudy`/`clear-day`/`clear-night` is returned after it,
      per data-model.md
- [X] T014 [US3] Add an optional `symbolCondition?: WeatherCondition | null` field to
      `WeatherObservation` in `src/models/types.ts`
- [X] T015 [US3] Add `symbol_code?: number` to `SmhiForecastData`, a `SMHI_SYMBOL_CONDITIONS`
      lookup table (Wsymb2 codes 1-27 per research.md §3), and set each forecast observation's
      `symbolCondition` in `buildForecastHourlySeries` (resolving codes 1-2 to
      `clear-day`/`clear-night` via that observation's own timestamp) in
      `src/services/smhiProvider.ts`
- [X] T016 [US3] Add `CloudLightning` (thunderstorm), `CloudFog` (foggy), and `CloudDrizzle`
      (sleet) entries to `WEATHER_ICONS` in `src/components/weatherIcons.tsx`
- [X] T017 [US3] Add `--wx-thunderstorm`, `--wx-fog`, `--wx-sleet` CSS variables to the midnight,
      bright, and glass themes, and `.weather-condition-thunderstorm/foggy/sleet svg` color rules,
      in `src/index.css`, per data-model.md
- [X] T018 [P] [US3] Add unit tests in `tests/unit/weatherCondition.test.ts` for the new
      precedence: a `symbolCondition: "thunderstorm"` with very high wind still classifies as
      `thunderstorm`; a `symbolCondition: "cloudy"` with high wind classifies as `windy` (existing
      override preserved); no `symbolCondition` falls back to today's unchanged six-condition logic
- [X] T019 [P] [US3] Add unit tests in `tests/unit/smhiProvider.test.ts` for
      `SMHI_SYMBOL_CONDITIONS`/`symbolCondition` threading (e.g. `symbol_code: 11` →
      `thunderstorm`, `symbol_code: 7` → `foggy`, `symbol_code: 22` → `sleet`)
- [X] T020 [P] [US3] Add a CSS-source regression test asserting the three new `--wx-*` variables
      and `.weather-condition-*` color rules exist, in `tests/unit/indexCssGlassTheme.test.ts`

**Checkpoint**: US1, US2, US3 independently complete.

---

## Phase 6: User Story 4 - Compare forecast sources on separate series (Priority: P3)

**Goal**: Extend the already-existing per-source chart-line overlay (24-hour Temperature tab only,
per research.md §2) to the 7-day Temperature chart and the Rain/Wind tabs, and add a compact
source-count indicator to the Overview's blended values.

**Independent Test**: On the Details/graph view, confirm per-source lines now render on the 7-day
Temperature chart and the Rain/Wind tabs (not just 24-hour Temperature); on the Overview, confirm
a 3-source-blended period shows `(avg of 3)` (per quickstart.md US4).

### Implementation for User Story 4

- [X] T021 [US4] Add `combinedSourceCount?: number` to `TimelineRowPoint` in
      `src/components/timelineData.ts` and set it to `perSourceAverages.length` in
      `mergeMultiSourceIntoTimelinePoints`
- [X] T022 [US4] Update `LineRow`'s `(avg)` suffix in `src/components/WeatherIconOverview.tsx` to
      render `(avg of N)` when `combinedSourceCount > 2`, keeping plain `(avg)` for exactly 2
      (per data-model.md)
- [X] T023 [US4] Extend the existing per-source `<Line>` + combined-average `<Line>` pattern
      (reusing `sourceKey`, `seriesColor`, `seriesDash`, `SOURCE_LABELS` exactly as the 24-hour
      Temperature tab already does) to the 7-day Temperature `ComposedChart` in
      `src/components/ObservationChart.tsx`
- [X] T024 [US4] Extend the same per-source `<Line>` pattern to the Rain tab's precipitation
      metric (both 24-hour and 7-day) in `src/components/ObservationChart.tsx`
- [X] T025 [US4] Extend the same per-source `<Line>` pattern to the Wind tab's wind-speed metric
      (both 24-hour and 7-day) in `src/components/ObservationChart.tsx`
- [X] T026 [P] [US4] Add/update integration tests in `tests/integration/chartAndDetails.test.tsx`
      asserting per-source lines render on the 7-day Temperature, Rain, and Wind tabs when 2+
      mocked sources have data
- [X] T027 [P] [US4] Add unit/integration tests for `combinedSourceCount` and the `(avg of 3)`
      wording in `tests/unit/timelineData.test.ts` and `tests/integration/weatherIconOverview.test.tsx`

**Checkpoint**: All four user stories independently complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T028 Run `npm test` and fix any regressions introduced by T001-T027
- [X] T029 Run `npm run lint` and fix any issues
- [X] T030 Run `npm run build` and confirm a clean build
- [X] T031 Start `npm run dev` and manually walk through all 4 scenarios in
      `specs/022-met-forecast-source/quickstart.md` via live Playwright verification — especially
      US1's live `api.met.no` network call (jsdom can't make real cross-origin requests) and
      US2/US3's actual rendered icon colors (jsdom can't compute real CSS), matching this
      session's established live-testing practice
- [X] T032 Bump `package.json`'s version as the final step before commit, per standing practice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: None — skipped, no blocking prerequisites
- **User Stories (Phase 3-6)**: Fully independent of one another (disjoint files, confirmed during
  planning) — may proceed in any order or in parallel
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### Within Each User Story

- US1: T001 → T002 (needs the new provider) → T003/T004/T005/T006 (can follow in sequence since
  T005 depends on T004's new signature, T006 depends on T005); T007-T010 (tests) can follow their
  respective implementation tasks in parallel with each other
- US2: T011 → T012
- US3: T013/T014 (type changes) → T015 (consumes both) → T016/T017 (parallel, independent files) →
  T018/T019/T020 (tests, parallel)
- US4: T021 → T022 (consumes T021's field); T023/T024/T025 are the same pattern applied to
  different tabs — parallelizable against each other but all touch `ObservationChart.tsx`, so
  treat as sequential edits to avoid merge conflicts within the task; T026/T027 (tests) parallel

### Parallel Opportunities

- All of US1, US2, US3, US4 can be implemented in parallel by different contributors — no shared
  files across stories (confirmed during planning: US1 touches `metNoProvider.ts`/`weatherApi.ts`/
  `format.ts`/`Footer.tsx`/`App.tsx`; US2 touches only `WeeklyForecastStrip.tsx`; US3 touches
  `weatherCondition.ts`/`types.ts`/`smhiProvider.ts`/`weatherIcons.tsx`/`index.css`; US4 touches
  `timelineData.ts`/`WeatherIconOverview.tsx`/`ObservationChart.tsx`)
- Within US1, T007/T008/T009 (test files) are mutually parallel once their implementation tasks land
- Within US3, T016/T017 are parallel (different files); T018/T019/T020 are mutually parallel

---

## Parallel Example: User Story 3

```bash
Task: "Add CloudLightning/CloudFog/CloudDrizzle to WEATHER_ICONS in src/components/weatherIcons.tsx"
Task: "Add --wx-thunderstorm/--wx-fog/--wx-sleet variables and color rules in src/index.css"
Task: "Add weatherCondition.test.ts precedence tests"
Task: "Add smhiProvider.test.ts symbol-code tests"
Task: "Add indexCssGlassTheme.test.ts regression test for the new color variables"
```

---

## Implementation Strategy

### MVP First (User Stories 1-2, both P1)

1. Complete Phase 3 (US1: MET Norway source) and Phase 4 (US2: icon color fix)
2. **STOP and VALIDATE**: Run quickstart.md scenarios US1-US2
3. Deploy/demo if ready

### Incremental Delivery

1. US1 + US2 (P1) → validate → MVP
2. US3 (P2, richer conditions) → validate
3. US4 (P3, chart/indicator polish) → validate
4. Phase 7 polish pass across everything → commit + push (per standing memory: commit+push
   automatically after `/speckit-implement`, with the version bump from T032 included in that
   same commit)
