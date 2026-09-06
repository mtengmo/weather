---

description: "Task list for Dashboard Polish, Round Seven"
---

# Tasks: Dashboard Polish, Round Seven

**Input**: Design documents from `/specs/032-dashboard-polish-round-seven/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the spec; regression/unit tests are added alongside each
change per this session's established practice.

**Organization**: Tasks are grouped by user story (P1: US1/US2, P2: US3/US4, P3: US5/US6/US7),
matching spec.md's priorities. The seven stories touch mostly disjoint files and can be
implemented/tested independently and largely in parallel.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

Not applicable — no new project setup; no new runtime dependency anywhere in this feature
(research.md, every section).

---

## Phase 2: Foundational

Not applicable — the seven stories are independent of one another (different files, no shared
new infrastructure). Each story's own implementation section below is self-contained.

---

## Phase 3: User Story 1 - Real radar imagery on the map (Priority: P1) 🎯 MVP

**Goal**: Replace the `031` forecast-circle overlay with a genuine radar imagery tile layer
(RainViewer), non-blocking on failure.

**Independent Test**: Open the Map view; a real radar imagery layer is visible, pins/navigation
still work, and a radar-fetch failure leaves the map fully functional (per quickstart.md).

### Implementation for User Story 1

- [X] T001 [US1] Delete `src/components/mapPrecipitationVisual.ts` and
      `tests/unit/mapPrecipitationVisual.test.ts` — this feature's radar layer replaces the
      forecast-circle overlay entirely (research.md §1, plan.md Structure Decision)
- [X] T002 [US1] In `src/components/MapView.tsx`, remove the `precipitationByPin` state, its
      `useEffect`, the `pinKey`/precipitation-fetch logic, and the `CircleMarker`/legend JSX added
      in `031-map-precipitation-overlay`
- [X] T003 [US1] In `src/components/MapView.tsx`, add a `radarTileUrl: string | null` state and a
      `useEffect` (fires once per mount when `pins.length > 0`) that fetches
      `https://api.rainviewer.com/public/weather-maps.json`, and on success builds
      `` `${host}${radar.past[last].path}/256/{z}/{x}/{y}/2/1_1.png` `` from the latest `past`
      frame; sets `radarTileUrl` to `null` on any failure or an empty `radar.past` array, per
      contracts/radar-and-naming.md
- [X] T004 [US1] In `src/components/MapView.tsx`, render a Leaflet `TileLayer` using
      `radarTileUrl` (when non-null) inside `MapContainer`, above the base OpenStreetMap
      `TileLayer`, with reduced opacity and a `zIndex` that keeps marker/popup panes fully
      interactive, per contracts/radar-and-naming.md
- [X] T005 [P] [US1] Add integration tests in `tests/integration/mapView.test.tsx` (replacing the
      `031` precipitation-overlay tests removed in T002's spirit): a successful RainViewer fetch
      renders the radar `TileLayer`; a failed/empty fetch renders no radar layer while pins still
      render; pin click-through (`onSelectLocation`) still works with the radar layer showing

**Checkpoint**: US1 is independently complete — the Map view shows real radar imagery, with
pins/navigation unaffected by its own success or failure.

---

## Phase 4: User Story 2 - See a place I recognize as my current location (Priority: P1)

**Goal**: Prefer a reverse-geocoded place name over the raw nearest-station name for the current
location's display name.

**Independent Test**: Grant current-location access somewhere with both a resolvable place name
and a differently-named nearby station; the header shows the place name (per quickstart.md).

### Implementation for User Story 2

- [X] T006 [US2] In `src/hooks/useGeolocation.ts`, restructure the post-coordinates flow to call
      `reverseGeocode(coords)` and `getNearestStations(coords, 1)` independently (each with its
      own `.catch` degrading to `null`), then set `displayName` to the geocoded place name when
      non-null, else the station name when usable, else keep the existing `"Unnamed station"`
      placeholder — dropping the `` `near ${placeName}` `` prefix, per contracts/radar-and-naming.md
      and research.md §3
- [X] T007 [P] [US2] Update/add unit tests for `useGeolocation` (new or existing test file)
      asserting: a resolved place name wins over a resolved station name; a failed geocode falls
      back to the station name; both failing keeps the placeholder

**Checkpoint**: US2 is independently complete — current-location naming prefers a human place
name.

---

## Phase 5: User Story 3 - "Home" behaves the same, everywhere, under a name that makes sense (Priority: P2)

**Goal**: Every "Back" control is relabeled "Home" and always returns to the Overview.

**Independent Test**: From Details, the graph, and the Map, "Home" is present and always lands on
the Overview, including when the Map was opened from Details or the graph (per quickstart.md).

### Implementation for User Story 3

- [X] T008 [US3] In `src/App.tsx`, change `closeMap()` to call `viewOverview()` instead of
      restoring `previousView`; remove the now-unused `previousView` state and its `setPreviousView`
      call in `openMap()`, per research.md §4
- [X] T009 [P] [US3] In `src/App.tsx`, change every button currently labeled "Back" (graph,
      details, and map views) to read "Home"
- [X] T010 [P] [US3] Update/add an integration test in `tests/integration/appHeader.test.tsx`
      asserting: no "Back"-labeled button exists anywhere; opening the Map from Details and then
      clicking "Home" lands on the Overview (not Details)

**Checkpoint**: US3 is independently complete — one consistently-labeled, consistently-behaving
way back to the Overview from every other screen.

---

## Phase 6: User Story 4 - Dismiss a warning I've already read (Priority: P2)

**Goal**: A user can dismiss an individual active warning; it stays hidden in that browser for as
long as it remains the same warning.

**Independent Test**: Dismiss an active warning, reload while it's still active — it stays
hidden; a genuinely different warning still appears (per quickstart.md).

### Implementation for User Story 4

- [X] T011 [US4] Create `src/hooks/useWarningDismissal.ts` — reads a dismissed-id array from
      `localStorage` once on mount (empty `Set` on any parse failure), exposes `{ dismissedIds:
      Set<string>; dismiss: (id: string) => void }`, with `dismiss` updating both in-memory state
      and storage synchronously, mirroring `useThemePreference`'s existing shape, per
      contracts/home-and-warnings.md
- [X] T012 [US4] In `src/App.tsx`, call `useWarningDismissal()` and pass
      `warnings.filter(w => !dismissedIds.has(w.id))` to `<WarningBanner />` instead of the raw
      `warnings` array
- [X] T013 [US4] In `src/components/WarningBanner.tsx`, add `dismiss: (id: string) => void` prop
      and a dismiss control per listed warning (collapsed leading warning, and each warning in
      the expanded list), calling `dismiss(warning.id)` for that specific warning only, per
      contracts/home-and-warnings.md
- [X] T014 [P] [US4] Add unit tests for `useWarningDismissal` in
      `tests/unit/useWarningDismissal.test.ts` — dismissing persists across a fresh hook
      instance (simulated reload); a parse failure/absent key yields an empty set, never throws
- [X] T015 [P] [US4] Add/update integration tests in `tests/integration/warningBanner.test.tsx`
      asserting: dismissing the shown warning removes it from the banner; a second, different
      warning id is unaffected by dismissing the first

**Checkpoint**: US4 is independently complete — warnings can be dismissed per-browser, precisely
scoped to the specific warning dismissed.

---

## Phase 7: User Story 5 - Understand how much rain or snow to expect (Priority: P3)

**Goal**: The weather icon distinguishes light from heavy rain, and light from heavy snow, using
each source's own symbol-code intensity where available.

**Independent Test**: A lightly-rainy period's icon is visibly distinguishable from a
heavily-rainy one; same for light vs. heavy snow (per quickstart.md).

### Implementation for User Story 5

- [X] T016 [US5] In `src/services/weatherCondition.ts`, replace `"rainy"`/`"snowy"` in the
      `WeatherCondition` type with `"light-rain"`/`"heavy-rain"`/`"light-snow"`/`"heavy-snow"`;
      update `SYMBOL_PRECIPITATION_CONDITIONS` and the symbol-condition precedence check to cover
      all four; add a fixed mm threshold (e.g. `PRECIPITATION_HEAVY_THRESHOLD_MM`) to the
      no-symbol-condition branch so it returns `light-rain`/`light-snow` vs.
      `heavy-rain`/`heavy-snow` instead of the old flat values, per research.md §6 and
      contracts/icons-and-charts.md
- [X] T017 [P] [US5] In `src/services/smhiProvider.ts`, update `SMHI_SYMBOL_CONDITIONS`: codes
      8/18 → `light-rain`; 9/10/19/20 → `heavy-rain`; 15/25 → `light-snow`; 16/17/26/27 →
      `heavy-snow`, per research.md §6
- [X] T018 [P] [US5] In `src/services/metNoProvider.ts`, update `classifyMetNoSymbol` to check
      `code.includes("light")` before the existing `rain`/`snow` substring checks, returning
      `light-rain`/`light-snow`; the existing (now-fallthrough) `rain`/`snow` checks return
      `heavy-rain`/`heavy-snow` (moderate and heavy both fold into "heavy," per research.md §6)
- [X] T019 [US5] In `src/components/weatherIcons.tsx`, replace the `rainy`/`snowy` entries in
      `WEATHER_ICONS` with `light-rain` (`CloudDrizzle`), `heavy-rain` (`CloudRain`), `light-snow`
      (`Snowflake`), `heavy-snow` (`CloudSnow`); reassign `sleet` to `CloudHail`, per research.md §7
- [X] T020 [US5] In `src/components/timelineData.ts`, update both `=== "snowy"` checks
      (`daysToTimelineData`'s two `isSnowy` computations) to
      `=== "light-snow" || ... === "heavy-snow"`, per contracts/icons-and-charts.md
- [X] T021 [P] [US5] In `src/index.css`, add `.weather-condition-light-rain svg`,
      `.weather-condition-heavy-rain svg`, `.weather-condition-light-snow svg`,
      `.weather-condition-heavy-snow svg` color rules (reusing the existing `--wx-rain`/
      `--wx-snow` tokens), per contracts/icons-and-charts.md
- [X] T022 [P] [US5] Add unit tests in `tests/unit/weatherCondition.test.ts` covering: each new
      symbol condition value takes precedence correctly; the mm-threshold fallback splits light
      vs. heavy for both rain and snow; thunderstorm/foggy/sleet classification is unaffected
- [X] T023 [P] [US5] Update existing unit tests referencing the old `"rainy"`/`"snowy"` values in
      `tests/unit/smhiProvider.test.ts` and `tests/unit/metNoProvider.test.ts` to their new
      light/heavy equivalents

**Checkpoint**: US5 is independently complete — precipitation intensity is visible in the icon
for both rain and snow, everywhere a condition icon already renders.

---

## Phase 8: User Story 6 - Read the rain chart's bars and numbers without overlap (Priority: P3)

**Goal**: `BarRow` (precipitation and snow) splits into a bars-only row and a values-only row
directly beneath it, column-aligned.

**Independent Test**: The precipitation chart's bar row has no text on it; a second row below
shows each column's mm/percentage, aligned under its own bar (per quickstart.md).

### Implementation for User Story 6

- [X] T024 [US6] In `src/components/WeatherIconOverview.tsx`, split `BarRow` into two adjacent
      `.weather-timeline-row` elements sharing the same `periods`: the first renders only bar
      elements (no text node), the second renders only the mm value + chance-of-rain text for
      each column, using the same `PeriodGrid` column count so column `i` lines up in both rows,
      per contracts/icons-and-charts.md and research.md §8 — applies to both the precipitation
      and snow row call sites, since both share `BarRow`
- [X] T025 [P] [US6] Add CSS in `src/index.css` for the new two-row bar layout (bar row height/
      alignment, values row spacing) reusing existing `.weather-timeline-bar*` rules where
      possible
- [X] T026 [P] [US6] Update/add an integration test in
      `tests/integration/weatherIconOverview.test.tsx` asserting: the bar row's cells contain no
      text content; the values row's cells contain the expected mm/percentage text, aligned by
      column index, for both the precipitation and snow rows

**Checkpoint**: US6 is independently complete — the precipitation and snow charts read clearly
with bars and values in separate, aligned rows.

---

## Phase 9: User Story 7 - Read the temperature chart against a real degree scale (Priority: P3)

**Goal**: `LineRow`'s temperature chart gains a sticky-left degree scale (5°-step ticks) and
matching horizontal gridlines.

**Independent Test**: A degree scale stays visible on the left edge while the chart scrolls, with
gridlines at each labeled 5° interval (per quickstart.md).

### Implementation for User Story 7

- [X] T027 [US7] In `src/components/WeatherIconOverview.tsx`, extract `buildSegments`'s min/max
      range computation (or compute it alongside) into a tick-generation step for `LineRow`:
      round the range outward to the nearest 5, generate one tick per 5°-step value, and map each
      through the same `yFor` formula already used for the polyline, per research.md §9
- [X] T028 [US7] In `src/components/WeatherIconOverview.tsx`'s `LineRow`, render a sticky-left
      column of tick labels (mirroring `.weather-timeline-row-title`'s existing `position:
      sticky` pattern) and one horizontal `<line>` per tick drawn into the existing SVG behind the
      polyline/area, gated on `row.key === "temperature"` per contracts/icons-and-charts.md
- [X] T029 [P] [US7] Add CSS in `src/index.css` for the sticky degree-scale column and gridline
      styling (a subtle/muted line color, consistent with the existing chart's visual weight)
- [X] T030 [P] [US7] Add unit tests for the tick-generation logic (extracted as a small pure
      function if practical) in `tests/unit/weatherIconOverview.test.ts` (new file) or alongside
      existing chart-math tests — asserting 5°-step values spanning a given min/max, rounded
      outward correctly
- [X] T031 [P] [US7] Add/update an integration test in
      `tests/integration/weatherIconOverview.test.tsx` asserting the temperature row renders tick
      labels and gridlines, and no other row kind (wind/precipitation/snow) renders them

**Checkpoint**: All seven user stories independently complete.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T032 Run `TZ=UTC npx vitest run` and fix any regressions introduced by T001-T031
- [X] T033 Run `npm run lint` and fix any issues
- [X] T034 Run `npm run build` and confirm a clean build
- [X] T035 Start `npm run dev` and manually walk through quickstart.md's live Playwright
      verification steps for all seven stories, taking screenshots for the record
- [X] T036 Bump `package.json`'s version as the final step before commit, per standing practice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: Skipped — not applicable
- **User Stories (Phase 3-9)**: All seven are independent of one another (disjoint files, no
  shared new infrastructure) — may proceed in any order or fully in parallel; grouped here by
  spec priority (P1 → P2 → P3) as a suggested sequence, not a hard dependency
- **Polish (Phase 10)**: Depends on all seven stories being complete

### Within Each Story

- US1: T001 → T002 (removes the old overlay first) → T003 → T004 (needs T003's state) → T005
  (test)
- US2: T006 → T007 (test)
- US3: T008, T009 mutually parallel → T010 (test, exercises both)
- US4: T011 → T012 (needs the hook) → T013 (needs T012's filtered-warnings shape in mind, though
  technically independent of T012's exact call site) → T014, T015 mutually parallel
- US5: T016 (the type/threshold change) → T017, T018, T019, T020, T021 mutually parallel (each
  touches a different file, all depend on T016's new type existing) → T022, T023 mutually
  parallel (tests, depend on T016-T021)
- US6: T024 → T025 (styling, can follow immediately) → T026 (test)
- US7: T027 → T028 (needs T027's tick data) → T029 (styling, parallel with T028) → T030, T031
  mutually parallel (tests)

### Parallel Opportunities

- US1 through US7 can be worked on in parallel by different contributors (fully disjoint files
  per plan.md's Project Structure)
- Within US5, T017/T018/T019/T020/T021 are mutually parallel once T016 lands
- Within US7, T030/T031 are mutually parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (real radar on the map)
2. **STOP and VALIDATE**: Run quickstart.md's US1 scenario live
3. Deploy/demo if ready

### Incremental Delivery

1. US1 + US2 (P1, the two most-flagged issues) → validate → early deploy
2. US3 + US4 (P2, consistency + quality-of-life) → validate
3. US5 + US6 + US7 (P3, refinements) → validate
4. Phase 10 polish pass across everything → commit + push (per standing memory: commit+push
   automatically after `/speckit-implement`, with the version bump from T036 included in that
   same commit)
