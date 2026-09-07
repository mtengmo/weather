---

description: "Task list for 037-header-controls-and-chart-fixes"
---

# Tasks: Header Controls Cleanup and Chart Bug Fixes

**Input**: Design documents from `/specs/037-header-controls-and-chart-fixes/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Included where automatable (component/unit tests). US4 (CSS zoom/layout) and part of US3 (visual overlap) are not meaningfully assertable in jsdom — covered by quickstart.md's manual steps instead, called out explicitly per task.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Foundational — header control swap (blocks US1 and US2)

**Purpose**: `DisplayMenu` currently owns theme + units + high/low together; `App.tsx` can only ever render one header-actions tree, so removing `DisplayMenu` and introducing its two replacements has to land as one atomic change. US1 and US2 each add their own behavior on top of this shared scaffold.

- [X] T001 [P] Create `src/components/ThemeToggle.tsx`: a single button, no dropdown, `aria-pressed`/label reflecting current theme, labeled "Dark" for `theme === "midnight"` and "Light" for `theme === "ivory"`, calling `onThemeChange` with the *other* value on click. Props: `{ theme: Theme; onThemeChange: (t: Theme) => void }`.
- [X] T002 [P] Create `src/components/SettingsMenu.tsx`: copy `DisplayMenu.tsx`'s dropdown-panel pattern (open/close state, outside-click + Escape handling) verbatim, but render only `<UnitToggle>` and `<HighLowToggle>` inside (drop `<ThemePicker>`). Button label "Settings". Props: `{ unit, onUnitChange, highLowVisible, onHighLowChange }` (no theme props).
- [X] T003 In `src/App.tsx` (~lines 202-210), replace the single `<DisplayMenu .../>` with `<ThemeToggle theme={theme} onThemeChange={setTheme} />` followed by `<SettingsMenu unit={unit} onUnitChange={setUnit} highLowVisible={highLowVisible} onHighLowChange={setHighLowVisible} />`.
- [X] T004 Delete `src/components/DisplayMenu.tsx` and `src/components/ThemePicker.tsx` (fully superseded by T001/T002).
- [X] T005 In `src/index.css`, rename/adjust the `.display-menu`/`.display-menu-content` rules to `.settings-menu`/`.settings-menu-content` (or add a `.theme-toggle` rule alongside), matching whatever class names T001/T002 use, and remove the now-dead `.theme-picker` rule (superseded by T009's glass-CSS removal for the theme-specific parts).

**Checkpoint**: App builds and renders with `ThemeToggle` + `SettingsMenu` in the header; `DisplayMenu`/`ThemePicker` no longer exist anywhere.

---

## Phase 2: User Story 1 - One-tap Dark/Light switch in the header (Priority: P1) 🎯 MVP

**Goal**: A single, always-visible header button that flips between Dark and Light with no menu step.

**Independent Test**: `npm run test -- appHeader` plus opening the app and clicking the theme button.

### Tests for User Story 1 ⚠️

- [X] T006 [P] [US1] In `tests/integration/appHeader.test.tsx`, replace/add tests asserting: no element with the old "Display" button text exists; a single button labeled "Dark" or "Light" (matching current theme) is present; clicking it calls the theme setter with the other value and the button's label updates accordingly after the state change.

### Implementation for User Story 1

- [X] T007 [US1] Verify `ThemeToggle` (T001) satisfies FR-001/FR-002/FR-003: no dropdown, immediate switch, label always reflects current state (fold any fixes found while making T006 pass back into `ThemeToggle.tsx`).

**Checkpoint**: `npm run test -- appHeader` passes; manually confirm one-click Dark/Light switch (quickstart.md step 2).

---

## Phase 3: User Story 2 - Remaining display options behind Settings, new defaults, Glass removed (Priority: P2)

**Goal**: Units + high/low live in a new Settings control; high/low defaults off for new viewers; "Glass" is gone everywhere with a safe fallback for anyone who had it saved.

**Independent Test**: `npm run test -- appHeader highLowVisibility theme` plus opening Settings and confirming its contents; clearing `localStorage` and confirming high/low starts off.

### Tests for User Story 2 ⚠️

- [X] T008 [P] [US2] In `tests/integration/appHeader.test.tsx`, add/update tests: a "Settings" control (separate from the theme button) exists; opening it reveals the unit toggle and high/low toggle and no theme option; with no saved preference, high/low starts off; a previously-saved high/low preference is preserved.
- [X] T009 [P] [US2] In `tests/unit/` (new or existing theme-preference test file), add tests: `Theme` no longer accepts `"glass"`; `getThemePreference()` returns `DEFAULT_THEME` ("midnight") when `localStorage` holds a stored `"glass"` value; `DEFAULT_HIGH_LOW_VISIBLE === false`; `DEFAULT_NEARBY_STATION_COUNT === 0` (shared with US5 — see T017).

### Implementation for User Story 2

- [X] T010 [US2] In `src/models/types.ts`, narrow `Theme` to `"midnight" | "ivory"` (drop `"glass"`).
- [X] T011 [US2] In `src/services/theme.ts`, drop `"glass"` from `VALID_THEMES` (existing fallback logic then satisfies FR-005b with no new code — see research.md).
- [X] T012 [US2] In `src/models/types.ts`, flip `DEFAULT_HIGH_LOW_VISIBLE` from `true` to `false`.
- [X] T013 [US2] In `src/index.css`, remove every `[data-theme="glass"]` rule block (search the whole file — at least the one already known near the timeline-wrap rules, plus any others).

**Checkpoint**: `npm run test` passes; Settings panel contains only units + high/low; a manually-seeded `localStorage` "glass" value now renders Dark; fresh profile shows high/low off by default.

---

## Phase 4: User Story 3 - Correct, evenly-spaced temperature degree scale (Priority: P3)

**Goal**: Confirm (and lock in with tests) that the tick/label logic no longer skips a middle step or forces a mismatched label, and give labels a bit more breathing room from adjacent rows.

**Independent Test**: `npm run test -- weatherIconOverview`.

### Tests for User Story 3 ⚠️

- [X] T014 [P] [US3] In `tests/integration/weatherIconOverview.test.tsx`, add a regression test reproducing the exact reported screenshot values (a multi-day series whose values span ~11-20°C) asserting the rendered tick labels are `["10°", "20°"]` — not `["0°", "20°"]` — proving the already-reverted (036) tick logic handles this input correctly today.

### Implementation for User Story 3

- [X] T015 [US3] In `src/components/WeatherIconOverview.tsx`, widen `TICK_LABEL_SAFE_MIN_PERCENT`/`TICK_LABEL_SAFE_MAX_PERCENT` slightly (e.g. 8/92 → 12/88) for more visual clearance from the rows above/below, updating the adjoining comment.
- [~] T016 [US3] **Manual only** (not automatable — see research.md): per quickstart.md step 4, visually confirm no gridline touches an adjacent row after T015, across narrow/wide/zero-crossing ranges. Not performed this session — no browser tool available; the automated regression test (T014) plus the widened safe margin (T015) are the shipped mitigation, but a real-browser check is still outstanding.

**Checkpoint**: `npm run test -- weatherIconOverview` passes, including the new regression test.

---

## Phase 5: User Story 4 - Timeline fills available width when zoomed (Priority: P4)

**Goal**: 3-day/7-day timelines resize to fill available width consistently across zoom levels, matching 24h's already-correct behavior.

**Independent Test**: Manual only (see below).

### Implementation for User Story 4

- [X] T017 [US4] In `src/index.css`, on the base `.weather-timeline` rule (~line 492-503), add `min-width: 100%;` alongside the existing `width: max-content; min-width: 900px;` (all three apply together — CSS resolves the largest applicable min-width per viewport).
- [X] T018 [US4] Remove the `.weather-timeline-fill { width: 100%; }` rule (~line 509-511) and its conditional class application in `src/components/WeatherIconOverview.tsx` (~line 804: drop the `displayMode !== "last-24-hours" ? " weather-timeline-fill" : ""` conditional, always rendering plain `"weather-timeline"`).
- [~] T019 [US4] **Manual only** (no jsdom layout engine — see research.md): per quickstart.md step 5, verify in a real browser across at least 3 zoom levels (e.g. 80%, 100%, 125%) that 3-day/7-day fill available width with no dead space and 24h has no regression. Not performed this session — no browser tool available. The CSS change (T017/T018) is reasoned through in research.md and unifies all three views under one rule, but hasn't been visually confirmed under actual zoom.

**Checkpoint**: `npm run test` still passes (no DOM structure change beyond a class name); manual zoom check confirms the fix.

---

## Phase 6: User Story 5 - Nearby stations off by default in Details (Priority: P5)

**Goal**: Details view's "Nearby stations" control starts at 0 for new viewers; existing saved choices unaffected.

**Independent Test**: `npm run test -- nearbyStationCount`.

### Tests for User Story 5 ⚠️

- [X] T020 [P] [US5] In the existing nearby-station-count unit test file, add/update a test asserting `DEFAULT_NEARBY_STATION_COUNT === 0` and that `getNearbyStationCountPreference()` returns `0` when nothing is stored, while an existing stored value of e.g. `2` is still returned unchanged.

### Implementation for User Story 5

- [X] T021 [US5] In `src/models/types.ts`, flip `DEFAULT_NEARBY_STATION_COUNT` from `4` to `0`.

**Checkpoint**: `npm run test` passes; fresh-profile Details view shows "Nearby stations: 0".

---

## Phase 7: User Story 6 - Temperature-banded coloring on the chart (Priority: P6)

**Goal**: The primary temperature line (Overview timeline row + Details/graph chart) is colored by the 11-band table instead of one flat color.

**Independent Test**: `npm run test -- temperatureColorScale weatherIconOverview observationChart`.

### Tests for User Story 6 ⚠️

- [X] T022 [P] [US6] Create `tests/unit/temperatureColorScale.test.ts`: table has exactly 11 entries, strictly increasing `maxC` 5°C apart (last `null`); `buildGradientStops(min, max)` produces stops covering `[0, 100]`, with hard (duplicate-offset) edges at each internal band boundary that falls within `[min, max]`, and correctly picks the extreme band's color at offsets 0/100 when `min`/`max` fall outside the table's named range (e.g. `min = -20` still resolves to "Very cold"'s color, not undefined).
- [X] T023 [P] [US6] In `tests/integration/weatherIconOverview.test.tsx`, add a test asserting the temperature row's line/gradient references the new per-value color scale (e.g. a `<linearGradient>` with stops matching `buildGradientStops` for that render's own min/max) instead of the old flat `var(--row-temperature)` stroke. An equivalent test was attempted for `ObservationChart` (Recharts) too but dropped: `<ResponsiveContainer>` needs `ResizeObserver`, which jsdom doesn't provide here (no polyfill configured, and no existing test in that file asserts Recharts-internal SVG for the same reason) — covered by `temperatureColorScale.test.ts`'s unit tests plus manual verification (quickstart.md) instead.

### Implementation for User Story 6

- [X] T024 [US6] Create `src/services/temperatureColorScale.ts` exporting the 11-band table (data-model.md) and `buildGradientStops(min, max)`.
- [X] T025 [US6] In `src/components/WeatherIconOverview.tsx`, add a per-row `<linearGradient>` built from `buildGradientStops(scale.min, scale.max)` for the temperature row, and reference it via `style={{ stroke: "url(#...)" }}` on the temperature line's observed/forecast polylines in place of `var(--row-temperature)` (keep the existing separate area-fill gradient unchanged). **Deviation from plan**: uses `gradientUnits="userSpaceOnUse"` (anchored to `scale.yFor`'s shared 0-100 coordinate space) instead of the planned `objectBoundingBox` — a row's observed/forecast line can render as several separate `<polyline>` elements split by data gaps, and `objectBoundingBox` scopes to each *referencing element's own* bbox, which would have colored each segment relative to its own local min/max instead of the row's actual range (caught before shipping, not live).
- [X] T026 [US6] In `src/components/ObservationChart.tsx`, add per-series `<linearGradient>`s (`objectBoundingBox`, as originally planned — valid here since Recharts renders one `<path>` per `<Line>`, so its bbox already spans that Line's own full extent) inside each `<ComposedChart>`'s `<defs>` for the primary temperature series (the `yAxisId="temp"` blocks only), with **separate gradients for the observed and forecast `<Line>` each built from that Line's own min/max** (not one shared gradient — two different Line elements have two different bboxes), referenced via `stroke="url(#...)"` in place of `seriesColor(0)` (nearby-station and high/low lines keep `seriesColor(i)`/`HIGH_COLOR`/`LOW_COLOR` unchanged).

**Checkpoint**: `npm run test` passes; manually confirm the color change on both charts (quickstart.md step 6) in both Dark and Light.

---

## Phase 8: Polish & Cross-Cutting

- [X] T027 Run `npm test` (full suite) — confirm no regressions across all 6 stories together. Result: 543/543 passed.
- [X] T028 Run `npm run build` — confirm the production build (including the removed `DisplayMenu`/`ThemePicker` and new modules) compiles cleanly. Result: builds successfully (pre-existing >500kB chunk-size warning, unrelated to this feature).
- [~] T029 Manually walk quickstart.md's remaining steps not already covered per-story (Settings panel contents, Glass-fallback, cross-story interactions). Not performed this session — no browser tool available; covered at the automated-test level (T006/T008/T009) but not visually confirmed in a running browser.
- [X] T030 Bump `package.json`'s version (`0.4.3` → `0.4.4`).

---

## Dependencies & Execution Order

- Phase 1 (Foundational) blocks Phases 2 and 3 (both touch the same header markup).
- Phase 2 (US1) and Phase 3 (US2) touch overlapping files (`App.tsx`, `index.css`) — implement sequentially (US1 then US2), not in parallel, even though both are "P" at the test level.
- Phase 4 (US3), Phase 5 (US4), Phase 6 (US5), Phase 7 (US6) are independent of Phases 1-3 and of each other — no shared files besides `index.css` (US3 and US4 both edit it, in different rule blocks; do sequentially to avoid merge confusion within one working session).
- Phase 8 depends on all prior phases.

## Implementation Strategy

Six independent stories bundled in one feature. Suggested order matches priority (P1→P6) since that's also roughly increasing implementation risk (header swap → defaults → verify-and-tighten → CSS layout → default → new cross-cutting visual feature), but US3/US4/US5/US6 have no dependency on each other or on US1/US2 and could be reordered freely.
