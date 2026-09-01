# Tasks: Forecast "Now" Marker & Availability Resilience

**Input**: Design documents from `C:\GitRepos\weather\specs\006-forecast-now-marker\`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested in spec.md, but this repo has paired implementation with tests under `tests/unit/`/`tests/integration/` for every prior feature (001–005) — this plan continues that convention.

**Organization**: Tasks are grouped by user story (spec.md priorities: US1=P1 "now" marker, US2=P2 forecast fallback/unavailable-message/source-indicator, US3=P3 unnamed-station identity) so each can be implemented, tested, and demoed independently.

## Path Conventions

Single-project web frontend (unchanged from 005). Source under `src/`; tests under the top-level `tests/unit/` and `tests/integration/`.

---

## Phase 1: Setup

- [X] T001 Verify the pre-006 baseline is clean: run `npm test` and `npm run build` against the current (005-complete) codebase before starting, so any failure surfaced later is known to be from this feature's changes, not pre-existing.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared prerequisites all user stories depend on.

None — unlike 005, this feature has no cross-story blocking work. 005's forecast infrastructure (`isForecast` flags on `WeatherObservation`/`DailyAggregate`, the dashed-line rendering, the SMHI/Open-Meteo provider fallback) already provides everything all three stories in this feature build on. Each story's phase below adds only the field/module/rendering it specifically needs — see data-model.md's per-story field ownership (e.g. `ObservationSeries.forecastFromFallbackSource` belongs to US2 alone, not a shared foundation).

**Checkpoint**: Proceed directly to any user story phase after Setup.

---

## Phase 3: User Story 1 - See exactly where "now" is on the chart (Priority: P1) 🎯 MVP

**Goal**: A distinct vertical marker appears on every 24h/7-day chart that has forecast data, at the exact point separating observed from forecast, recomputed live and absent when there's no forecast to divide.

**Independent Test**: Load a location with forecast data (mocked or real); confirm the marker appears on the 24h and 7-day temperature/wind/rain/cloud charts at the observed/forecast boundary, and is absent on the 30-day view or for a series with no forecast points.

### Implementation for User Story 1

- [X] T002 [US1] In `src/components/chartData.ts`, add a pure, exported boundary-lookup function (contracts/chart-rendering.md) — given an array of items each carrying an optional `isForecast` boolean plus a key-accessor for the X-axis field (`timestamp` for `WeatherObservation[]`, `bucketEnd` for `DailyAggregate[]`), return the key value of the item immediately before the first `isForecast: true` item, or `null` if there's no forecast in the array (or the very first item is already forecast, i.e. no preceding observed point to anchor to).
- [X] T003 [P] [US1] Unit tests for the new boundary-lookup function in `tests/unit/chartData.test.ts`: returns `null` for an array with no forecast points; returns `null` when the array's first item is already forecast; returns the correct preceding item's key value for both a `WeatherObservation[]`-shaped and a `DailyAggregate[]`-shaped input.
- [X] T004 [US1] In `src/components/ObservationChart.tsx`, import Recharts' `ReferenceLine`; near the top of the component body, compute an `hourlyNowMarker` value (via the T002 helper against `series.observations`, when `series` is non-null and ready) and a `dailyNowMarker` value (via the same helper against `toDailyAggregates(series.observations, bucketCount)` for whichever daily bucket count the current window uses).
- [X] T005 [US1] Render `<ReferenceLine x={hourlyNowMarker} .../>` (a neutral, visually distinct stroke — not reusing `HIGH_COLOR`/`LOW_COLOR`/`seriesColor(0)` — with a small "Now" label) inside the 24h temperature+precipitation, rain, and cloud/wind(24h) `<ComposedChart>` blocks, rendered only when `hourlyNowMarker !== null`.
- [X] T006 [US1] Render `<ReferenceLine x={dailyNowMarker} .../>` the same way inside the temperature-daily and wind-daily `<ComposedChart>` blocks (7-day and 30-day share these blocks today — `dailyNowMarker` naturally evaluates to `null` for `last-30-days` since 005/006 never tag forecast points for that window, so no separate window check is needed here to satisfy FR-003).
- [X] T007 [US1] Extend `tests/integration/chartAndDetails.test.tsx` with a new `describe("US1 (006): now marker", ...)` block. **Note**: querying the "Now" label text directly doesn't work — this repo's own existing tests already document that Recharts' `<ResponsiveContainer>` never gets a real size under jsdom, so the SVG (and thus the `ReferenceLine` label) never actually paints. Implemented as smoke tests instead (no `role="alert"` across all four metric tabs, both 24h and 7-day windows, a no-forecast series, and the 30-day view), with the marker's actual positioning logic covered directly by T003's unit tests.

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable.

---

## Phase 4: User Story 2 - Don't lose the forecast just because one data source couldn't provide it (Priority: P2)

**Goal**: When SMHI has observed data but no forecast for a location, Open-Meteo's forecast is used instead (all metrics together, SMHI's observed data/station identity untouched); when neither source has a forecast, a clear message says so; when the fallback was used, the chart visibly says the forecast came from elsewhere.

**Independent Test**: Mock `weatherApi.getObservations` to return a series with observed-only data for a forecast-expecting window; verify the "forecast unavailable" message appears. Mock the underlying providers so SMHI succeeds without a forecast and Open-Meteo's forecast-only fetch succeeds; verify the merged series carries `forecastFromFallbackSource: true` and the chart shows the source-mismatch cue.

### Implementation for User Story 2

- [X] T008 [US2] Add `forecastFromFallbackSource?: boolean` to `ObservationSeries` in `src/models/types.ts` (data-model.md) — `true` only when this series' forecast points came from the FR-004 fallback rather than directly from the primary source.
- [X] T009 [US2] Refactor `src/services/openMeteoProvider.ts`: extract its existing forecast-tagging logic (the `upcoming`/`forecastObservations` computation already inside `getObservations`, from 005) into a new exported `getForecastOnly(location, window): Promise<WeatherObservation[]>` that performs the same network call and returns just the forecast-tagged points, returning `[]` on any failure (network error, non-ok response, malformed body) — `getObservations` itself keeps working unchanged (contracts/weather-api-facade.md).
- [X] T010 [P] [US2] Unit tests for `getForecastOnly` in `tests/unit/openMeteoProvider.test.ts`: returns forecast-tagged points matching what `getObservations` would produce for the same mocked response; returns `[]` on a network failure, a non-ok response, and a response with no `hourly` data; respects the existing window-based forecast sizing (`last-30-days` → `[]`).
- [X] T011 [US2] In `src/services/weatherApi.ts`'s `getObservations`, after a successful SMHI fetch: if the window expects a forecast (`window !== "last-30-days"`) and the result's `observations` contain zero `isForecast: true` points, call `openMeteoProvider.getForecastOnly(location, window)`; if it returns any points, append them to the SMHI result's `observations` and set `forecastFromFallbackSource: true` on the returned series — the SMHI-sourced observed points, `location`, and `status` stay untouched (depends on T008, T009; contracts/weather-api-facade.md, spec Clarifications).
- [X] T012 [P] [US2] Unit tests for the new fallback branch in `tests/unit/weatherApi.test.ts`: SMHI result already has forecast points → Open-Meteo's forecast-only fetch is never called, flag absent; SMHI result has none + Open-Meteo forecast-only succeeds → merged `observations` include the Open-Meteo points, `forecastFromFallbackSource: true`, SMHI's observed points and `location.displayName` unchanged; SMHI result has none + Open-Meteo forecast-only also returns `[]` → flag absent, no forecast points added; `window === "last-30-days"` → the fallback path is never attempted at all (depends on T011).
- [X] T013 [US2] In `src/components/ObservationChart.tsx`, add a "forecast unavailable for this location" alert (reusing the existing `error-banner`/`role="alert"` pattern already used for other unavailable-data messages) shown for the 24h and 7-day views (not 30-day) when `series.status === "ready"` but `series.observations` contains zero `isForecast` points, distinct in wording from the existing per-metric unavailable message (FR-005).
- [X] T014 [US2] In `src/components/ObservationChart.tsx`, when `series.forecastFromFallbackSource` is `true`, append a distinguishing suffix (e.g. `" (forecast, alt. source)"`) to every forecast-series `name` prop across all four metrics' forecast `<Line>`/`<Bar>` elements (added in 005/US1's T005–T006 for the marker's neighboring series), so it's visible in the chart legend without hovering (FR-007, research.md §5).
- [X] T015 [US2] Extend `tests/integration/chartAndDetails.test.tsx` with a new `describe("US2 (006): forecast fallback, unavailable message, source indicator", ...)` block. **Note**: as with T007, the legend-text suffix itself isn't queryable under jsdom (same `<ResponsiveContainer>` zero-size limitation), so the source-indicator case is a smoke test (renders without error across all four metric tabs) rather than a text-content assertion. The unavailable-message case IS fully assertable (it's a plain `<p role="alert">`, not inside the SVG chart tree) and is tested directly. Also discovered and fixed: several pre-existing tests (001/003/004/005) whose mock series had no forecast data now legitimately trigger the new unavailable-message banner — updated their fixtures to include a trailing forecast point (preserving each test's original, unrelated intent) or, for the one 005 test whose entire point was "no forecast = no error," updated it to assert the new intended message instead (006 supersedes 005's silent-degrade behavior here, per spec Assumptions).

**Checkpoint**: User Stories 1 and 2 both work independently and together.

---

## Phase 5: User Story 3 - Give an unnamed station a real identity (Priority: P3)

**Goal**: When a current-position location's nearest station has no usable name, attempt to resolve a real place name from its coordinates via reverse geocoding, presented as approximate, falling back cleanly to "Unnamed station" on any failure.

**Independent Test**: Mock the nearest-station lookup to return no usable name and mock the geocoding call to succeed; verify `useGeolocation`'s `location.displayName` becomes the geocoded (approximate-labeled) name. Mock the geocoding call to fail; verify it stays "Unnamed station".

### Implementation for User Story 3

- [X] T016 [US3] Create `src/services/geocoding.ts` exporting `reverseGeocode(location: { latitude, longitude }): Promise<string | null>` — calls `GET https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=jsonv2` with a descriptive `User-Agent` header identifying this app; on success, builds a short name from the response's `address` object by preferring the most specific available populated-place field (`city` → `town` → `village` → `suburb` → `municipality` → `county`); returns `null` on any network error, non-ok response, or a response with none of those fields present (contracts/geocoding.md, research.md §6).
- [X] T017 [P] [US3] Unit tests for `reverseGeocode` in new `tests/unit/geocoding.test.ts`, following the `vi.stubGlobal("fetch", ...)` convention already used in `tests/unit/openMeteoProvider.test.ts`: returns the `city` field's value when present; falls through the field-preference order (e.g. `town`, then `county`) when more-specific fields are absent; returns `null` on a non-ok response, a network failure, and a response whose `address` object has none of the recognized fields.
- [X] T018 [US3] In `src/hooks/useGeolocation.ts`, after the existing 005 station-name lookup (`getNearestStations`) resolves to no usable name (i.e., `displayName` would stay `"Unnamed station"`), call `geocoding.reverseGeocode` with the same coordinates; on success, set `displayName` to the result presented as approximate (e.g. a `"near "` prefix, distinguishing it from a confirmed station name per FR-009); on failure, leave `displayName` as `"Unnamed station"` unchanged. This runs fire-and-forget after `status` is already `"granted"`, matching 005's existing non-blocking pattern for the station-name resolution — it must not delay `status` or block the rest of the page (contracts/station-naming.md, FR-008–FR-010).
- [X] T019 [P] [US3] Extend `tests/unit/useGeolocation.test.ts`: when the station-name lookup yields no usable name and `reverseGeocode` succeeds, `location.displayName` updates to the geocoded, approximate-prefixed name; when `reverseGeocode` also fails/returns `null`, `displayName` stays `"Unnamed station"`; when the station-name lookup already resolved a real name, `reverseGeocode` is never called.

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T020 [P] Run `npm run lint` and fix any issues in the touched files.
- [X] T021 Run `npm test` and `npm run build`; fix any failures across the extended test suite and the TypeScript build.
- [X] T022 Manually execute `specs/006-forecast-now-marker/quickstart.md` scenarios 1–6 against the running dev server (`npm run dev`) for a real SMHI-covered location; note in the PR/commit description any deviation found, and if no browser-automation tool is available in this environment (as was the case for 005), do best-effort network-level checks (e.g. confirming the dev server serves correctly, blocking specific hosts via proxy/dev-tools where feasible) and say so explicitly rather than claiming a full visual pass. **Partial**: as with 005, no browser-automation tool was available in this environment — confirmed the dev server boots and serves the page (`curl` 200). Live SMHI/Open-Meteo/Nominatim endpoint behavior and exact HTTP field shapes were separately verified during `/speckit-plan` (research.md §1/§6 — real requests, not assumptions). Full visual/interactive confirmation (marker position, legend suffix, geocoded name display) still needs a real click-through before shipping; the automated test suite (T003/T007/T010/T012/T015/T017/T019 — 165/165 passing) is the functional stand-in.
- [X] T023 [P] Confirm the "now" marker, unavailable message, and source-mismatch indicator all render/suppress correctly across the existing unit toggle and theme switches — no code change expected since none of them read `unit` or introduce new colors outside the existing CSS-variable/`seriesColor` conventions, but confirm rather than assume (spec FR-001–FR-010 apply uniformly regardless of `unit`/theme). **Confirmed by code inspection**: `hourlyNowMarker`/`dailyNowMarker`/`forecastUnavailable`/`forecastLabelSuffix` are all computed from `series`/`window`/`metric` only — none reference `unit`; the marker's `NOW_MARKER_STROKE` uses the existing `var(--text-muted)` CSS variable (already theme-aware across Midnight/Ivory/Glass, same token used by `.gap-point`/`.forecast-row`), and the unavailable-message banner reuses the existing `.error-banner` class unchanged. No new unit- or theme-specific code path was introduced.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Empty — no phase blocks any user story here (see rationale above).
- **User Story 1 (Phase 3)**: Depends only on Setup. Independent of Phase 4/5.
- **User Story 2 (Phase 4)**: Depends only on Setup. Independent of Phase 3, though T014 (source-indicator suffix) touches the same `<Line>`/`<Bar>` elements T005/T006 add the marker near — sequence Phase 3 before Phase 4 if one person/agent is doing both, to avoid merge conflicts within `ObservationChart.tsx`; they are not logically dependent on each other.
- **User Story 3 (Phase 5)**: Depends only on Setup. Fully independent of Phase 3/4 — touches entirely different files (`geocoding.ts`, `useGeolocation.ts`).
- **Polish (Phase 6)**: Depends on whichever of Phases 3–5 are in scope for this delivery.

### Within Each Phase

- T002 (helper) before T003 (its tests) before T004–T006 (rendering that consumes it) before T007 (integration test).
- T008/T009 before T010 (tests) before T011 (fallback orchestration, depends on both) before T012 (its tests) before T013/T014 (rendering) before T015 (integration test).
- T016 before T017 (tests) before T018 (hook integration) before T019 (tests).

### Parallel Opportunities

- T003 can run alongside T004–T006 once T002 lands (test file vs. component file).
- T010 and T012 are both [P] once their respective implementation tasks land (different test files).
- T017 and T019 are both [P] once T016/T018 land respectively.
- Phases 3, 4, and 5 are mutually independent (different files) and can be staffed in parallel from the start, once T001 (Setup) is done — see the `ObservationChart.tsx` sequencing note under Phase 4 if the same person/agent is doing both Phase 3 and Phase 4.
- T020 and T023 are [P] within Polish.

---

## Parallel Example: Starting all three stories together

```bash
# After T001 (baseline verification), if staffed separately:
Task: "US1 — now marker: chartData.ts boundary helper + ObservationChart.tsx rendering"
Task: "US2 — forecast fallback: weatherApi.ts + openMeteoProvider.ts + ObservationChart.tsx messaging"
Task: "US3 — unnamed station identity: geocoding.ts + useGeolocation.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 3 (User Story 1) — the "now" marker.
3. **STOP and VALIDATE**: run quickstart.md scenario 1 against a real/mocked location.
4. Demo/ship if ready — this alone delivers the feature's most-requested, lowest-risk piece.

### Incremental Delivery

1. Setup → Phase 3 (US1) → validate → ship.
2. Add Phase 4 (US2) → validate independently → ship.
3. Add Phase 5 (US3) → validate independently → ship (can also ship first/standalone, since it shares no files with Phase 3/4).

### Suggested Team Split

- One track: Phase 3 → Phase 4 (both touch `ObservationChart.tsx`, so sequencing avoids merge conflicts).
- Second track: Phase 5 (US3), entirely parallel from the start — no shared files with the other two.
