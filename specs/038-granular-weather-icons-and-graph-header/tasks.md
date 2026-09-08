---

description: "Task list for 038-granular-weather-icons-and-graph-header"
---

# Tasks: More Granular Weather Icons and a Slimmer Graph Header

**Input**: Design documents from `/specs/038-granular-weather-icons-and-graph-header/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Included where automatable. The graph-header layout change (US2) is CSS/visual and not meaningfully assertable beyond DOM structure — covered by one structural test plus quickstart.md's manual steps.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: User Story 1 - More granular, more accurate weather icons (Priority: P1) 🎯 MVP

**Goal**: A low-confidence forecast (small amount, low chance-of-rain) no longer shows rain/snow; cloud icons distinguish light from heavy cover.

**Independent Test**: `npm run test -- weatherCondition weatherIconOverview`.

### Tests for User Story 1 ⚠️

- [X] T001 [P] [US1] In `tests/unit/weatherCondition.test.ts` (create if it doesn't exist — check first), add tests: a period with `precipitation: 0.2, chanceOfRain: 7` does NOT resolve to `light-rain`/`heavy-rain`; the same period with `chanceOfRain: 60` (or omitted) DOES resolve to rain as before; a period with `precipitation: 5, chanceOfRain: 7` (large amount despite low chance) still resolves to `heavy-rain` (amount takes precedence per research.md); a snow-temperature equivalent (`temperature: -2, precipitation: 0.2, chanceOfRain: 7`) does NOT resolve to snow. Cloud-cover-percent inputs of 60 and 90 (no symbol code) resolve to `partly-cloudy` and `cloudy` respectively; 40 still resolves to `clear-day`/`clear-night` (boundary unchanged).
- [X] T002 [P] [US1] In `tests/unit/` (SMHI provider's existing symbol-mapping test file — locate via `grep -rl "SMHI_SYMBOL_CONDITIONS\|symbolCodeToCondition" tests/`), add/update tests: Wsymb2 codes 3 and 4 resolve to `partly-cloudy`; codes 5 and 6 resolve to `cloudy`.
- [X] T003 [P] [US1] In `tests/unit/` (MET Norway provider's existing symbol-classification test file — locate via `grep -rl "classifyMetNoSymbol" tests/`), add/update tests: `"fair"` and `"partlycloudy"` (and their day/night/polartwilight variants, e.g. `"fair_day"`) resolve to `partly-cloudy`; `"cloudy"` resolves to `cloudy`.
- [X] T004 [P] [US1] In `tests/integration/weatherIconOverview.test.tsx`, add a test: a forecast observation with a small `precipitation` and a low `chanceOfRain` renders a non-rain icon class (e.g. `weather-condition-cloudy` or `weather-condition-clear-day`, not `weather-condition-light-rain`) in the Weather row/Today card.

### Implementation for User Story 1

- [X] T005 [US1] In `src/services/weatherCondition.ts`: add `"partly-cloudy"` to the `WeatherCondition` union; add `chanceOfRain?: number | null` to `WeatherConditionInput`; add `LOW_CONFIDENCE_CHANCE_OF_RAIN_PERCENT = 20` and `OVERCAST_THRESHOLD_PERCENT = 80` constants; in the amount-based precipitation branch, skip rain/snow classification (fall through) when `chanceOfRain != null && chanceOfRain < LOW_CONFIDENCE_CHANCE_OF_RAIN_PERCENT`; add `"partly-cloudy"` to the existing `symbolCondition === "cloudy" || ...` short-circuit list; split the cloud-cover-percent fallback into `cloudCoverPercent >= OVERCAST_THRESHOLD_PERCENT` → `"cloudy"`, else `cloudCoverPercent >= CLOUDY_THRESHOLD_PERCENT` → `"partly-cloudy"`.
- [X] T006 [US1] In `src/components/weatherIcons.tsx`, add a `"partly-cloudy"` entry to `WEATHER_ICONS` using lucide-react's `CloudSun` icon, label `"Partly cloudy"`.
- [X] T007 [US1] In `src/services/smhiProvider.ts`, split `SMHI_SYMBOL_CONDITIONS`' codes 3 and 4 to `"partly-cloudy"` (currently `"cloudy"`), keep 5 and 6 as `"cloudy"`.
- [X] T008 [US1] In `src/services/metNoProvider.ts`, change `classifyMetNoSymbol` so `code.includes("fair") || code.includes("partlycloudy")` returns `"partly-cloudy"`, checked before/separately from a plain `code.includes("cloud")` returning `"cloudy"`.
- [X] T009 [US1] In `src/components/timelineData.ts`, pass `chanceOfRain: obs.chanceOfRain` into the hourly icon-affecting `deriveWeatherCondition` call (~line 299) and `chanceOfRain: day.chanceOfRainMax` into the daily icon-affecting call (~line 367). Do NOT change the two `isSnowyCondition(deriveWeatherCondition({...}))` calls (~lines 318, 388) — see research.md's scope boundary.
- [X] T010 [US1] In `src/components/TodaySummaryCard.tsx`, pass `chanceOfRain: today.chanceOfRainMax` into its `deriveWeatherCondition` call.
- [X] T011 [US1] In `src/components/WeeklyForecastStrip.tsx`, pass `chanceOfRain: day.chanceOfRainMax` into its `deriveWeatherCondition` call.
- [X] T012 [US1] In `src/components/WeatherIconOverview.tsx`, pass `chanceOfRain: nearestObservation.chanceOfRain` into the `currentCondition`-computing `deriveWeatherCondition` call.
- [X] T013 [US1] In `src/components/ObservationDetails.tsx`, pass `chanceOfRain: obs.chanceOfRain` into its `deriveWeatherCondition` call.

**Checkpoint**: `npm run test -- weatherCondition weatherIconOverview` passes; a 7%-chance forecast no longer shows rain; light vs. heavy cloud cover show distinct icons.

---

## Phase 2: User Story 2 - A slimmer graph view on mobile (Priority: P2)

**Goal**: The Details/graph view's fixed top area is visibly shorter on mobile, with the location title inline with the window-toggle row; desktop is unaffected.

**Independent Test**: `npm run test -- chartAndDetails` plus manual narrow-viewport check (quickstart.md).

### Tests for User Story 2 ⚠️

- [X] T014 [P] [US2] In `tests/integration/chartAndDetails.test.tsx`, add a test asserting the graph view's location-title element and the window-toggle group are both present and the title is no longer `visually-hidden` (e.g. check the heading element lacks the `visually-hidden` class, or that its text is queryable via `getByRole("heading", { name: location.displayName })` without it being screen-reader-only).

### Implementation for User Story 2

- [X] T015 [US2] In `src/components/ObservationChart.tsx`, wrap the existing `<h2>` (currently `className="visually-hidden"`, ~line 256) and the `.window-toggle` div in a shared flex container (e.g. `.observation-window-header`), and drop `visually-hidden` from the `<h2>` — reusing that single element as the visible inline title rather than adding a second copy of the location name (keeps `headingRef`/the existing focus-on-view-change behavior intact).
- [X] T016 [US2] In `src/index.css`, add rules for the new `.observation-window-header` wrapper (flex row, title + `.window-toggle` side by side, wrapping to a stacked layout only if truly needed at very narrow widths) and, inside the existing `@media (max-width: 480px)` block, make `.window-toggle` and `.metric-tabs` horizontally scrollable single rows (`display: flex; flex-wrap: nowrap; overflow-x: auto`) instead of letting their buttons wrap onto extra lines. **Deviation from plan**: the mobile rule targets `.observation-window-header .window-toggle` specifically, not the bare `.window-toggle` — that class is also reused, unscoped, by the Overview's own window toggle (`WeatherIconOverview.tsx`), which spec.md's Assumptions explicitly puts out of scope for this change (caught before shipping, not live).

**Checkpoint**: `npm run test -- chartAndDetails` passes; manual check at a narrow viewport (quickstart.md step 3) shows a visibly shorter top area with no desktop regression.

---

## Phase 3: Polish & Cross-Cutting

- [X] T017 Run `npm test` (full suite) — confirm no regressions across both stories.
- [X] T018 Run `npm run build` — confirm the production build compiles cleanly.
- [X] T019 Bump `package.json`'s version.

---

## Dependencies & Execution Order

- Phase 1 (US1) and Phase 2 (US2) touch entirely different files (icon/condition logic vs. `ObservationChart.tsx`/CSS) and are fully independent — either can be done first, or in parallel.
- Within Phase 1: T001-T004 (tests) before T005-T013 (implementation); T005 (core `weatherCondition.ts` change) blocks T006-T013, since they all depend on the new `"partly-cloudy"` type/constant/field existing.
- Within Phase 2: T014 (test) before T015-T016; T015 and T016 touch different files and could be done in parallel, but T016's CSS targets the wrapper class T015 introduces, so do T015 first in practice.
- Phase 3 depends on both prior phases.

## Implementation Strategy

Two independent stories. US1 (P1) is the higher-value, more self-contained change (pure logic + data plumbing, well-tested); US2 (P2) is a smaller, CSS-focused layout fix. Either can ship alone.
