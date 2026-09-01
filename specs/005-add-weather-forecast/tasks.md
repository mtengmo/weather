# Tasks: Add Weather Forecast

**Input**: Design documents from `c:\GitRepos\weather\specs\005-add-weather-forecast\`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested in spec.md, but every prior feature in this repo (001–004) paired implementation with tests under `tests/unit/` and `tests/integration/` (see plan.md Technical Context) — this plan continues that established convention rather than treating it as optional.

**Organization**: Tasks are grouped by user story (spec.md priorities: US1=P1, US2=P2, US3=P3) so each can be implemented, tested, and demoed independently.

## Path Conventions

Single-project web frontend (no backend). Source under `src/`; tests under the top-level `tests/unit/` and `tests/integration/` (per `vite.config.ts`'s `test.include`, **not** `src/`).

---

## Phase 1: Setup

**Purpose**: Resolve the one open unknown (research.md §1's flagged risk) before any code depends on it.

- [X] T001 Make one live `GET` request to `https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/{lon}/lat/{lat}/data.json` for a real Swedish coordinate (e.g. Stockholm, 18.06/59.33) and record the actual field names for temperature, precipitation, wind speed, and total cloud cover, plus the `timeSeries`/`validTime` structure. Append findings as a short addendum to `specs/005-add-weather-forecast/research.md` §1–2 (correct the field names there if they differ from what's currently documented). This determines the exact parameter-mapping code in T003.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared data-model and provider-level changes both user stories 1 and 2 depend on (US3 does not depend on this phase).

**⚠️ CRITICAL**: T007+ (US1) and T013+ (US2) cannot start until this phase is complete.

- [X] T002 [P] Add `isForecast: boolean` to `WeatherObservation` and to `DailyAggregate` in `src/models/types.ts`, per data-model.md's extended entities (both default to absent/`false` for existing measured data — no behavior change for callers that don't read the new field yet).
- [X] T003 Add SMHI forecast fetching and merging in `src/services/smhiProvider.ts`: a new internal function (parallel to `fetchStationValues`) that calls the `snow1g` v1 endpoint from T001 for the four tracked parameters (temperature, precipitation, wind speed, cloud cover), and extend `buildHourlySeries`/`getObservations` so that for `window === "last-24-hours"` it appends up to 24 forecast hours after the most recent observed hour, and for `window === "last-7-days"` it appends up to 168 forecast hours (7×24), each tagged `isForecast: true`; `window === "last-30-days"` is unaffected (no forecast, per spec Assumptions). Reuse the existing per-parameter null-on-failure degradation pattern (`fetchParameterValues`'s catch) so a forecast-only failure doesn't fail the whole call. (Depends on T001, T002.)
- [X] T004 [P] Add Open-Meteo forecast merging in `src/services/openMeteoProvider.ts`: change `forecast_days` from its current fixed `"1"` to a window-dependent value (2 for `"last-24-hours"`, 8 for `"last-7-days"`, unchanged/`1` for `"last-30-days"`), remove the `elapsed = all.filter((o) => Date.parse(o.timestamp) <= now)` trim that currently discards every future row, and instead keep points within `[now - windowHours, now + forecastHoursFor(window)]`, tagging each point `isForecast: Date.parse(o.timestamp) > now`. (Depends on T002; independent of T003 — different file.)
- [X] T005 Extend `tests/unit/smhiProvider.test.ts` with cases for the new forecast behavior: forecast hours appended past the most recent observed hour for `last-24-hours`/`last-7-days`, tagged `isForecast: true`; no forecast rows appended for `last-30-days`; a forecast-fetch failure degrades that field to nulls/absence without throwing (mirroring the existing `fetchParameterValues` failure test). Follow the existing `mockFetchRouter`/`freshProvider` conventions in that file. (Depends on T003.)
- [X] T006 [P] Extend `tests/unit/openMeteoProvider.test.ts` with cases for the new forecast behavior: response rows at/after "now" are now retained and tagged `isForecast: true` instead of being trimmed, for both `last-24-hours` and `last-7-days`; `last-30-days` behavior is unchanged. Follow the existing `mockFetchOnce` convention in that file. (Depends on T004.)

**Checkpoint**: Both providers return `ObservationSeries.observations` that extend past "now" with `isForecast: true` points, for the 24h and 7d windows. US1 and US2 can now build on this independently.

---

## Phase 3: User Story 1 - See tomorrow's forecast alongside today's observations (Priority: P1) 🎯 MVP

**Goal**: The 24-hour chart (all four metrics) shows a continuous line/bar per series that turns dotted for the forecast portion, is clearly identifiable as prediction (not just via hover), and the details table marks each row observed vs. forecast.

**Independent Test**: With Phase 2 complete, open the 24-hour view for a supported location; the chart should extend past the current hour with a dotted continuation for each metric, and "View details" rows for upcoming hours should be labeled as forecast — all without any Phase 4/5 work being present.

### Implementation for User Story 1

- [X] T007 [US1] In `src/components/chartData.ts`, extend `buildHourlyRows` (temperature+precipitation) so each row also carries a `primaryForecast`/`primaryPrecipitationForecast`-style sibling key (null before the observed/forecast boundary, populated from the boundary point onward — duplicate the boundary point's value into both the base and `...Forecast` keys so the rendered segments connect without a gap), sourced from `WeatherObservation.isForecast`.
- [X] T008 [US1] In `src/components/chartData.ts`, extend `buildMetricHourlyRows` (rain/wind/cloud) the same way — each row gains a `seriesKey(0) + "Forecast"`-style sibling key for the primary series only (nearby-station keys are unaffected — forecast is primary-only per spec FR-006).
- [X] T009 [US1] In `src/components/ObservationChart.tsx`, for the `window === "last-24-hours"` branches of all four metrics (temperature/precip combo, rain, wind, cloud), add a second `<Line>`/`<Bar>` per primary series bound to the new `...Forecast` data key(s) from T007/T008, same `stroke`/`fill` color as the primary series (`seriesColor(0)`), rendered with `strokeDasharray` (reuse the existing dash convention, e.g. `"4 2"` already used for high/low lines) so it reads as "the same series, dotted ahead." Also adjust the `Tooltip`/`Legend` labeling (e.g. an appended " (forecast)" in the tooltip formatter or series `name` for forecast points) so forecast values are identifiable as predictions without hovering being the only cue (FR-010) — confirm this doesn't regress the plain hover-tooltip case for historical points.
- [X] T010 [US1] In `src/components/ObservationDetails.tsx`, for the `window === "last-24-hours"` table, add a per-row indicator of observed vs. forecast (e.g. a leading "Status" column, or a `forecast-row` CSS class analogous to the existing `gap-point` class) so FR-011 is satisfied; add the corresponding rule to `src/index.css` if a new class is introduced.
- [X] T011 [P] [US1] Extend `tests/unit/chartData.test.ts` with cases for T007/T008: the `...Forecast` key is null before the boundary and populated from the boundary point onward; the boundary point appears in both keys; nearby-station rows are unaffected.
- [X] T012 [US1] Extend `tests/integration/chartAndDetails.test.tsx` (a new `describe("US1 (005): 24h forecast continuation", ...)` block) covering: a series with `isForecast: true` trailing points renders without error/alert on all four metric tabs; the details table shows a forecast indicator for those rows; a series with observed data but zero forecast points (forecast-fetch-failed case) still renders normally with no forecast segment and no error banner (contracts/weather-api-facade.md "New failure mode"). (Depends on T007–T010.)

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable.

---

## Phase 4: User Story 2 - See the week ahead alongside the week just passed (Priority: P2)

**Goal**: The 7-day chart (temperature high/low/average, wind high/low/average, rain totals, cloud average) shows the same solid-then-dotted continuation at daily granularity, using only the forecast days the provider actually returned.

**Independent Test**: With Phase 2 complete (and independent of Phase 3's chart-rendering changes, though it reuses the same `chartData.ts`/`ObservationChart.tsx` files), open the 7-day view for a supported location; daily bars/lines should extend into the coming week with the same dotted treatment, and no fabricated days should appear beyond what the provider returned.

### Implementation for User Story 2

- [X] T013 [US2] In `src/services/dailyAggregation.ts`, add `isForecast` classification per bucket in `toDailyAggregates`: a bucket is forecast when its `bucketEnd` timestamp is after `Date.now()` (data-model.md's deferred bucket-classification question, resolved here — simplest rule, consistent with buckets already being computed relative to `now`).
- [X] T014 [P] [US2] Extend `tests/unit/dailyAggregation.test.ts` with cases for T013: a bucket entirely in the future is `isForecast: true`; a bucket entirely in the past is `isForecast: false`/absent; verify the boundary bucket's classification matches the documented rule.
- [X] T015 [US2] In `src/components/chartData.ts`, extend `buildHighLowAverageDailyRows` (and therefore `buildDailyRows`/`buildWindDailyRows`) and `buildMetricDailyRows` to emit `...Forecast`-style sibling keys per bucket (e.g. `primaryHighForecast`/`primaryLowForecast`/`primaryAverageForecast`, and `seriesKey(0) + "Forecast"` for rain/cloud), using `DailyAggregate.isForecast` from T013, with the same boundary-bucket-duplication approach as T007 so the daily line connects. (Depends on T013.)
- [X] T016 [P] [US2] Extend `tests/unit/chartData.test.ts` with cases for T015 covering the daily row builders' forecast keys, mirroring T011's boundary/duplication assertions at daily granularity. (Depends on T015.)
- [X] T017 [US2] In `src/components/ObservationChart.tsx`, for the `window !== "last-24-hours"` (i.e., 7-day) branches of temperature, wind, rain, and cloud, add the forecast-continuation `<Line>`/`<Bar>` elements analogous to T009, bound to the new daily `...Forecast` keys, respecting `highLowVisible` for the high/low lines exactly as the existing solid high/low lines do. Exclude `last-30-days` from any forecast rendering (out of scope — Assumptions). (Depends on T015.)
- [X] T018 [US2] In `src/components/ObservationDetails.tsx`, add the same observed/forecast row indicator from T010 to the 7-day table (the `window !== "last-24-hours"` branch), scoped so it only applies when `window === "last-7-days"` (not `last-30-days`, which has no forecast rows). (Depends on T013.)
- [X] T019 [US2] Verify (via a targeted case in T020's integration test, adjusting `chartData.ts`/`dailyAggregation.ts` if it fails) that when SMHI/Open-Meteo return fewer than 7 forecast days for a location, the chart and details table show only the returned forecast buckets rather than fabricating placeholder days — `toDailyAggregates` already nulls buckets with zero observations, so confirm a genuinely absent bucket (no forecast points at all past a certain day) renders as an unavailable/absent bucket rather than a misleading zero/flat value.
- [X] T020 [US2] Extend `tests/integration/chartAndDetails.test.tsx` (a new `describe("US2 (005): 7-day forecast continuation", ...)` block) covering: a 7-day series with trailing forecast buckets renders the forecast continuation on the temperature and wind tabs with `highLowVisible` on and off; a series with only 3 forecast days shows no fabricated days for days 4–7; the 30-day view is unaffected (no forecast rendering) even when the underlying observations happen to include `isForecast` points. (Depends on T017, T018, T019.)

**Checkpoint**: User Stories 1 and 2 both work independently and together.

---

## Phase 5: User Story 3 - Know where "current location" weather is actually coming from (Priority: P3)

**Goal**: Granting geolocation shows the real resolved weather-station name instead of the literal "Current Location" label, with the existing "Unnamed station" fallback when the station has no usable name; favorite/searched-location naming is unchanged.

**Independent Test**: Independent of Phases 2–4 — grant location access and confirm the chart heading/legend show a real station name; this does not require any forecast data to be present.

### Implementation for User Story 3

- [X] T021 [US3] In `src/hooks/useGeolocation.ts`, after `navigator.geolocation.getCurrentPosition` succeeds, resolve `displayName` from `smhiProvider`'s nearest-station lookup (reuse `getNearestStations(location, 1)`, the same lookup already powering nearby-comparison-station names) instead of the literal `"Current Location"` string; fall back to `"Unnamed station"` (matching `004-chart-styling-fixes`'s existing convention) when the lookup resolves with no usable name, and also when the lookup itself fails or returns no stations (wrap in try/catch, mirroring `weatherApi.ts`'s `isSmhiCovered` failure handling) — do not let a naming-lookup failure block the location from becoming usable. This lookup runs regardless of the SMHI 50km coverage gate, per research.md §6 (naming and data-source coverage are independent). Favorite (`favoriteToLocation` in `LocationSwitcher.tsx`) and searched (`PlaceSearch`/`useFavorites`'s `add`) locations already set their own `displayName` and are untouched by this change.
- [X] T022 [P] [US3] Add `tests/unit/useGeolocation.test.ts` (new file — no prior test exists for this hook) covering: `displayName` resolves to the nearest station's name after `request()` succeeds; falls back to `"Unnamed station"` when the resolved station has a blank name or the lookup fails; `status` still transitions `idle → loading → granted` unaffected by the naming resolution. Mock `src/services/smhiProvider`'s `getNearestStations` the way `tests/unit/weatherApi.test.ts` mocks provider modules (`vi.mock(...)` + `vi.mocked(...)`), and mock `navigator.geolocation.getCurrentPosition` directly (no existing convention for this in the repo — introduce one consistent with the file's other mocks). (Depends on T021.)

**Checkpoint**: All three user stories are independently functional; Phases 3–5 can be delivered in any order after Phase 2 (US3 doesn't even require Phase 2).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Whole-feature verification once the desired user stories are complete.

- [X] T023 [P] Run `npm run lint` and fix any issues in the touched files.
- [X] T024 Run `npm test` and `npm run build`; fix any failures across the extended test suite and the TypeScript build.
- [X] T025 Manually execute `specs/005-add-weather-forecast/quickstart.md` scenarios 1–4 against the running dev server (`npm run dev`) for a real SMHI-covered location, and note in the PR/commit description any deviation found (e.g. if a tested location's provider doesn't actually return the expected forecast horizon). **Partial**: no browser-automation tool was available in this environment (no project `run` skill, no `chromium-cli`) to visually drive the app — confirmed the dev server boots and serves the page (`curl` 200), and relied on the RTL-based integration tests (T012/T020), which mount the real `ObservationChart`+`ObservationDetails` components against the same data shapes quickstart.md's scenarios describe, as the functional stand-in. A real click-through against a live location is still recommended before shipping.
- [X] T026 [P] Confirm the existing unit toggle and theme settings apply to forecast values exactly as they do to observed values (spec FR-012) — spot-check by toggling metric/imperial units and switching themes while a forecast segment is visible; no code change expected since forecast points reuse the existing `WeatherObservation` shape and `convert*`/theme CSS-variable mechanisms, but confirm rather than assume. **Confirmed by code inspection**: every forecast row-builder path (T007/T008/T015) calls the same `convertTemperature`/`convertPrecipitation`/`convertWindSpeed` functions used for observed values, with no `isForecast`-conditional branching on unit; forecast `<Line>`/`<Bar>` elements use the same `seriesColor(0)`/CSS-variable-driven styling as the primary series, with no theme-specific code path. No visual browser check performed (see T025's caveat).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 (T003 needs T001's findings) — BLOCKS User Stories 1 and 2 (Phases 3–4).
- **User Story 1 (Phase 3)**: Depends on Phase 2. Independent of Phase 4/5.
- **User Story 2 (Phase 4)**: Depends on Phase 2. Independent of Phase 3, though it touches the same two files (`chartData.ts`, `ObservationChart.tsx`) — sequence T007–T010 before T015–T018 if one person/agent is doing both, to avoid merge conflicts within those files; they are not logically dependent on each other.
- **User Story 3 (Phase 5)**: No dependency on Phase 2 at all — can start immediately after Phase 1 (or even in parallel with it, since T021 doesn't depend on T001's forecast-endpoint research).
- **Polish (Phase 6)**: Depends on whichever of Phases 3–5 are in scope for this delivery.

### Within Each Phase

- T003/T004 (providers) before T005/T006 (their tests) before Phase 3/4 chart work that consumes their output.
- T007/T008 (row builders) before T009 (chart rendering) before T012 (integration test) — same pattern in Phase 4: T013 before T015 before T017 before T020.

### Parallel Opportunities

- T002 has no dependents that also need to run first — but T003/T004 both depend on it, so it should land before either.
- T003 and T004 are [P] (different files: `smhiProvider.ts` vs. `openMeteoProvider.ts`).
- T005 and T006 are [P] once their respective implementation task lands.
- T011 can run alongside T009/T010 (test file vs. component files) once T007/T008 land.
- Phase 5 (US3) is entirely independent of Phases 2–4 and can be staffed in parallel from the start.

---

## Parallel Example: Foundational Phase

```bash
# After T002 (types) lands, run providers in parallel:
Task: "Add SMHI forecast fetching and merging in src/services/smhiProvider.ts"
Task: "Add Open-Meteo forecast merging in src/services/openMeteoProvider.ts"

# Then their tests, also in parallel:
Task: "Extend tests/unit/smhiProvider.test.ts with forecast cases"
Task: "Extend tests/unit/openMeteoProvider.test.ts with forecast cases"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (User Story 1) — the 24-hour merged forecast.
3. **STOP and VALIDATE**: run quickstart.md scenario 1 against a real location.
4. Demo/ship if ready — this alone delivers the feature's core value (spec.md: "only P1... delivers no value" implies P1 alone already does).

### Incremental Delivery

1. Setup + Foundational → both providers return forecast-tagged data.
2. Add User Story 1 → validate independently → ship (MVP).
3. Add User Story 2 → validate independently → ship.
4. Add User Story 3 → validate independently → ship (can also ship first/standalone, since it has no Phase 2 dependency).

### Suggested Team Split

- One track: Phase 2 → Phase 3 → Phase 4 (forecast data + both chart horizons).
- Second track: Phase 5 (US3 naming fix) in parallel from the start, since it shares no files with the forecast work until both touch `ObservationChart.tsx`'s heading, which only reads `location.displayName` and needs no coordination.
