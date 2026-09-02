# Tasks: Timeline Weather Dashboard Redesign

**Input**: Design documents from `C:\GitRepos\weather\specs\008-timeline-dashboard-redesign\`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested in spec.md, but this repo has paired implementation with tests under `tests/unit/`/`tests/integration/` for every prior feature (001–007) — this plan continues that convention. Because this feature's rendering is CSS Grid + SVG (not Recharts), its integration tests can make real DOM assertions rather than 005/006's smoke-test-only pattern (research.md §1).

**Organization**: Tasks are grouped by user story (spec.md priorities: US1=P1 synchronized 24h timeline, US2=P2 synchronized 7-day timeline, US3=P3 sun/moon + enrichment rows).

## Path Conventions

Single-project web frontend (unchanged). Source under `src/`; tests under the top-level `tests/unit/` and `tests/integration/`.

---

## Phase 1: Setup

- [X] T001 Verify the pre-008 baseline is clean: run `npm test`, `npx tsc -b --noEmit`, and `npm run build` against the current (007-complete) codebase before starting, so any failure surfaced later is known to be from this feature's changes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new provider fields, the pure computation modules, and the shared grid/now-line rendering shell are all used by every user story below.

- [X] T002 Extend `src/models/types.ts` (data-model.md): add `windDirection?: number | null`, `windGust?: number | null`, `relativeHumidity?: number | null` to `WeatherObservation`; add `windGustHigh?: number | null`, `feelsLikeAverage?: number | null` to `DailyAggregate`.
- [X] T003 [P] Extend `src/services/smhiProvider.ts` (contracts/provider-fields.md): add SMHI observation parameters **3** (Vindriktning, wind direction) and **21** (Byvind, gust) to the existing `Promise.all` in `getObservations`, following the same `fetchParameterValues` degrade-to-null pattern already used for precipitation/wind/cloud; parse `wind_from_direction` and `wind_speed_of_gust` directly off the forecast response's `data` object (already fetched, currently-unused fields) in `buildForecastHourlySeries`. Map both onto `WeatherObservation.windDirection`/`windGust`.
- [X] T004 [P] Extend `src/services/openMeteoProvider.ts` (contracts/provider-fields.md): add `wind_direction_10m`, `wind_gusts_10m`, and `relative_humidity_2m` to the existing `hourly` query parameter in `fetchHourlyPoints`; parse them onto `WeatherObservation.windDirection`/`windGust`/`relativeHumidity` in both `getObservations` and `getForecastOnly`'s shared parsing path.
- [X] T005 [P] Create `src/services/feelsLike.ts` (contracts/feels-like.md) exporting `deriveFeelsLike({ temperature, windSpeed, relativeHumidity }): number | null` — one shared formula (wind chill below ~10°C when wind data is available, a simplified heat index above ~27°C when humidity data is available, otherwise the plain temperature), returning `null` only when `temperature` is `null`.
- [X] T006 [P] Create `src/services/sunMoon.ts` (contracts/sun-moon.md) exporting `getSunTimes(location, date): { sunrise: string; sunset: string }` (NOAA solar-calculator equations, research.md §4) and `getMoonPhase(date): MoonPhase` (synodic-month approximation, research.md §4) — both pure, synchronous, no network access.
- [X] T007 Extend `src/services/dailyAggregation.ts`'s `toDailyAggregates`: compute `windGustHigh` (max of the bucket's `windGust` readings, mirroring how `windHigh` is already derived from `windSpeed`) and `feelsLikeAverage` (mean of each observation's `deriveFeelsLike` result via T005) per bucket (data-model.md). Depends on T002, T005.
- [X] T008 Rewrite `src/components/WeatherIconOverview.tsx`'s rendering shell (contracts/timeline-rendering.md, research.md §1): replace the existing per-hour `.weather-overview-cell` card grid with a single CSS Grid container (one column per displayed period), a condition-icon row along the top, and one absolutely-positioned "now" line spanning the grid's full height, computed via the same boundary-lookup concept `chartData.ts`'s `forecastBoundaryValue` (006) already established. Keep the component's existing external props/contract (`location`, `window`, `onWindowChange`, `unit`, `series`, `onBack`) and the existing loading/unavailable states unchanged. Wrap the grid in a horizontally-scrolling container (`overflow-x: auto`, research.md §6) instead of shrinking columns.
- [X] T009 [P] Add the shared grid/row/now-line CSS to `src/index.css`: grid container and column sizing, a `.weather-timeline-wrap` scroll container (mirroring the existing `.observation-table-wrap` pattern, research.md §6), row styling using the existing theme CSS variables, and the now-line's styling (reusing `--text-muted`, matching 006's `NOW_MARKER_STROKE` convention). Depends on T008's class names existing.

**Checkpoint**: The overview renders its new grid shell with condition icons and a working now-line, on real (already-fetched) data; each user story phase below adds the remaining rows.

---

## Phase 3: User Story 1 - One synchronized timeline instead of a grid of cards (Priority: P1) 🎯 MVP

**Goal**: The 24-hour view's temperature, precipitation, wind, and cloud-cover rows all render aligned to the shared grid from Phase 2, each distinguishing observed from forecast the same way, with gaps shown clearly.

**Independent Test**: Open the overview for a location with 24 hours of mixed observed/forecast/gap data; confirm one row per core metric, all aligned to the same hour columns, with one shared now-line and a consistent observed/forecast visual split across every row.

### Implementation for User Story 1

- [X] T010 [US1] Create `src/components/timelineData.ts` exporting `buildHourlyTimelineRows(series, unit)`: maps `series.observations` into per-row point arrays (temperature, precipitation, wind — including `windDirection`/`windGust`, cloud cover), each point carrying its converted display value (reusing `convertTemperature`/`convertPrecipitation`/`convertWindSpeed`), `isForecast`, and a gap flag when the underlying value is `null` — mirroring `chartData.ts`'s existing row-builder pattern (005) but shaped for one-row-per-metric rather than one-row-per-hour.
- [X] T011 [P] [US1] Unit tests for `buildHourlyTimelineRows` in new `tests/unit/timelineData.test.ts`: gap points are flagged (not fabricated as zero), `isForecast` passes through unchanged, values are unit-converted per the `unit` argument.
- [X] T012 [US1] In `WeatherIconOverview.tsx`, render the temperature and cloud-cover rows as one `<svg>` polyline overlay each (contracts/timeline-rendering.md): a solid segment for observed points, a dashed segment for forecast points, joined at the boundary the same way 006's chart forecast lines already connect, with each point's value shown as an inline label (matching the mockup) and gaps rendered as a visible break in the line (not interpolated across).
- [X] T013 [US1] In `WeatherIconOverview.tsx`, render the precipitation row as a bar per column and the wind row as speed value + a directional arrow icon rotated by `windDirection` (falling back to a plain speed label with no arrow when direction is unavailable) — both using the same forecast-distinction and gap-indicator conventions as T012's line rows.
- [X] T014 [US1] Extend `tests/integration/weatherIconOverview.test.tsx` (rewriting its 007-era per-card assertions) with a `describe("US1: synchronized 24h timeline", ...)` block: all five rows (condition, temperature, precipitation, wind, cloud) render for a 24h series; a forecast hour is visually distinguished consistently across every row; a gap hour shows a clear break/indicator in the affected row(s) rather than a fabricated value; exactly one now-line element exists.

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable — this alone is a shippable MVP redesign.

---

## Phase 4: User Story 2 - The same timeline for a week (Priority: P2)

**Goal**: The same row layout renders for the 7-day period, one column per day, reusing User Story 1's rendering with daily-aggregated data.

**Independent Test**: Switch the overview to the 7-day period; confirm the same five rows now align to one column per day, with forecast days distinguished the same way as forecast hours.

### Implementation for User Story 2

- [X] T015 [US2] Extend `src/components/timelineData.ts` with `buildDailyTimelineRows(series, unit)`: same row shape as `buildHourlyTimelineRows` (T010), sourced from `toDailyAggregates(series.observations, 7)` — temperature row uses daily high/low (matching 007's existing daily-cell convention), precipitation uses `totalPrecipitation`, wind uses `windAverage`/`windGustHigh`, cloud uses `cloudAverage`.
- [X] T016 [P] [US2] Unit tests for `buildDailyTimelineRows` in `tests/unit/timelineData.test.ts`: daily gap/forecast handling; confirms no fabricated days beyond what the underlying `toDailyAggregates` call already returns (matching 007's existing "no fabricated forecast days" guarantee).
- [X] T017 [US2] In `WeatherIconOverview.tsx`, wire the `window === "last-7-days"` branch to render the same row components (T012/T013) using `buildDailyTimelineRows`'s output instead of the hourly one.
- [X] T018 [US2] Extend `tests/integration/weatherIconOverview.test.tsx` with a `describe("US2: synchronized 7-day timeline", ...)` block: switching to the 7-day window renders the same five rows aligned to day columns; a forecast day is distinguished the same way as User Story 1's forecast hours.

**Checkpoint**: User Stories 1 and 2 both work independently and together.

---

## Phase 5: User Story 3 - Sun, moon, and richer context rows (Priority: P3)

**Goal**: A Sun & Moon summary appears once per view; feels-like, snow, and wind-gust rows appear using the same shared-axis pattern wherever the underlying data supports them, and are cleanly omitted otherwise.

**Independent Test**: Open the overview for a location with full data; confirm a Sun & Moon summary with plausible sunrise/sunset/phase, and confirm feels-like/snow/gust rows appear using the same rendering as the core rows. Simulate a series with none of those three fields populated; confirm all three rows are simply absent.

### Implementation for User Story 3

- [X] T019 [US3] In `WeatherIconOverview.tsx`, render a "Sun & Moon" summary once per view (not per column) using `sunMoon.ts`'s `getSunTimes(location, displayedDate)` and `getMoonPhase(displayedDate)` (T006) — sunrise/sunset formatted the same way other time values in this app already are, moon phase shown with its name (and, if a matching icon exists in `lucide-react`'s existing moon-related icons, an icon — plain text is an acceptable fallback).
- [X] T020 [P] [US3] Unit tests for `sunMoon.ts` in new `tests/unit/sunMoon.test.ts`: `getSunTimes` returns a sunrise before sunset for a known date/location with plausible values (sanity-checked against the location's known daylight pattern, not exact-second precision); `getMoonPhase` cycles through all 8 phases over a full synodic month and returns the same phase for the same date deterministically.
- [X] T021 [US3] Extend `src/components/timelineData.ts`'s row builders (T010/T015) to also produce feels-like, snow, and wind-gust row data — feels-like via `deriveFeelsLike` (T005) per point, snow as the period's precipitation amount when `deriveWeatherCondition` classifies it `"snowy"` (007, reused, research.md §5) else absent, gusts from `WeatherObservation.windGust`/`DailyAggregate.windGustHigh` (T002/T007) — each row's inclusion flag set to `false` when every point in the series is absent for that field (data-model.md, FR-011).
- [X] T022 [P] [US3] Unit tests for the row-inclusion logic in `tests/unit/timelineData.test.ts`: a row with at least one non-null point across the series is included; a row with zero non-null points is flagged for omission; `deriveFeelsLike`'s cold/warm/neutral cases are exercised via `feelsLike.test.ts` (new file, alongside T005) rather than duplicated here.
- [X] T023 [US3] In `WeatherIconOverview.tsx`, render the feels-like row using the same line-overlay pattern as T012, the snow row using the same bar pattern as T013's precipitation row, and the wind-gust row alongside the existing wind row — each conditionally rendered only when `timelineData.ts` flags it as included (T021), never rendered empty.
- [X] T024 [US3] Extend `tests/integration/weatherIconOverview.test.tsx` with a `describe("US3: sun/moon and enrichment rows", ...)` block: the Sun & Moon summary renders with sunrise/sunset/phase text; a series with feels-like/snow/gust data renders those rows; a series with none of that data renders none of those rows (and doesn't otherwise break the core five rows from User Story 1).

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T025 [P] Run `npm run lint` and fix any issues in the touched files.
- [X] T026 Run `npm test`, `npx tsc -b --noEmit`, and `npm run build`; fix any failures across the extended/rewritten test suite and the TypeScript build.
- [X] T027 Manually execute `specs/008-timeline-dashboard-redesign/quickstart.md` scenarios 1–5 against the running dev server. Unlike prior features in this repo, a working Playwright setup is available in this environment (confirmed working against both the local dev server and the live production site during 007's post-implementation verification) — use it to drive a real browser, grant geolocation for a real SMHI-covered location, and take screenshots of the 24h timeline, 7-day timeline, and a narrow viewport, rather than settling for a dev-server-boots-only check.
- [X] T028 [P] Confirm the timeline's rows, now-line, and Sun & Moon summary follow the active theme and unit system by inspecting `WeatherIconOverview.tsx`'s CSS-variable usage and its use of `convertTemperature`/`convertPrecipitation`/`convertWindSpeed` for every displayed value — condition/feels-like/snow derivation itself stays unit-independent (contracts/weather-condition.md, contracts/feels-like.md), only displayed numbers convert. Spot-check visually via the Playwright pass from T027 (toggle unit/theme controls, re-screenshot) rather than code inspection alone.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. T007 depends on T002+T005; T008 depends on T002 (types used by the shell); T009 depends on T008 (styles the classes it introduces). BLOCKS all three user stories — none of them can render their rows without the grid shell and the underlying data fields existing.
- **User Story 1 (Phase 3)**: Depends on Foundational. Independent of Phase 4/5's *content*, though all three extend the same `timelineData.ts` and `WeatherIconOverview.tsx` files — sequence Phase 3 before Phase 4 before Phase 5 if one person/agent is doing all three, to avoid merge conflicts within those two files.
- **User Story 2 (Phase 4)**: Depends on Foundational; T015 reuses T012/T013's row-rendering components (built in Phase 3), so in practice Phase 3 lands first even though the *daily data-shaping* (T015) has no logical dependency on hourly data-shaping.
- **User Story 3 (Phase 5)**: Depends on Foundational (T006 `sunMoon.ts`, T005 `feelsLike.ts`, T007's daily aggregates) and, for T021/T023, on Phase 3's row-rendering patterns existing to reuse.
- **Polish (Phase 6)**: Depends on whichever of Phases 3–5 are in scope for this delivery.

### Within Each Phase

- T002 before T003/T004 (both parse into the fields T002 adds) before T007 (aggregates them) before T008 (shell) before T009 (styles it).
- T010 before T011 (tests) before T012/T013 (rendering) before T014 (integration tests).
- T015 before T016 (tests) before T017 (wiring) before T018 (integration tests).
- T006/T005 before T019/T021 respectively; T021 before T023; T020/T022 alongside their respective implementation tasks; T024 last.

### Parallel Opportunities

- T003, T004, T005, T006 are all `[P]` — four different, independent files, none depending on each other (only on T002, which lands first).
- T009 is `[P]` relative to the start of Phase 3 once T008 lands (CSS vs. component logic).
- T011, T016, T020, T022 are each `[P]` relative to their sibling implementation tasks (test files vs. source files).
- T025 and T028 are `[P]` within Polish.

---

## Parallel Example: Foundational Phase

```bash
# After T002 (types) lands, run in parallel:
Task: "Extend smhiProvider.ts to parse wind direction/gust"
Task: "Extend openMeteoProvider.ts to parse wind direction/gust/humidity"
Task: "Create feelsLike.ts"
Task: "Create sunMoon.ts"
# ...then T007 (needs T002+T005), then T008 (shell), then T009 (styles).
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (User Story 1) — the synchronized 24h timeline with its four core rows.
3. **STOP and VALIDATE**: run quickstart.md scenario 1 against a real location, ideally with a live Playwright pass (T027's approach, pulled forward).
4. Demo/ship if ready — spec.md frames this as the heart of what was asked for.

### Incremental Delivery

1. Setup + Foundational → the grid shell and now-line exist, with condition icons but no metric rows yet.
2. Add User Story 1 → validate independently → ship (MVP redesign).
3. Add User Story 2 → validate independently → ship.
4. Add User Story 3 → validate independently → ship.
