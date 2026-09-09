# Tasks: Humidity Level Indicator

**Input**: Design documents from `/specs/050-show-humidity-level/`

**Tests**: Included.

## Phase 1: Setup

- [X] T001 Confirm `npm test`/`npm run lint`/`npm run build` pass on current `main` as a clean baseline.

## Phase 2: Foundational

- [X] T002 In `src/services/smhiProvider.ts`, add `const HUMIDITY_PARAM = 6;` near the other `*_PARAM` constants, with a comment noting it's SMHI's "Relativ Luftfuktighet," confirmed hourly.
- [X] T003 In `src/services/smhiProvider.ts`, add `relative_humidity?: number;` to the `SmhiForecastData` interface.

**Checkpoint**: Types/constants exist; nothing wired yet.

---

## Phase 3: User Story 2 - SMHI locations get humidity too (Priority: P1)

*(Implemented before US1 since US1 needs this data to exist to be testable end-to-end.)*

### Tests for User Story 2

- [X] T004 [P] [US2] In `tests/unit/smhiProvider.test.ts` (or the relevant existing forecast-mapping test), add a test: a forecast entry with `relative_humidity: 56` maps to `WeatherObservation.relativeHumidity: 56`.
- [X] T005 [P] [US2] In the same/relevant test file, add a test: an observed-station reading for parameter 6 maps to `WeatherObservation.relativeHumidity` the same way `cloudCoverPercent` already does for parameter 16.

### Implementation for User Story 2

- [X] T006 [US2] In `src/services/smhiProvider.ts`'s `forecastObservationForHour`, add `relativeHumidity: data?.relative_humidity ?? null` to the returned `WeatherObservation`.
- [X] T007 [US2] In `src/services/smhiProvider.ts`'s `getObservations`, add a `fetchParameterValues(HUMIDITY_PARAM, location, window)` call alongside the existing `cloudValues`/`windDirectionValues`/`windGustValues` fetches (same `Promise.all`), and pass the result into `buildHourlySeries`.
- [X] T008 [US2] In `src/services/smhiProvider.ts`'s `buildHourlySeries`, accept the new `humidityValues: SmhiValue[]` parameter, build a `humidityByHour` map the same way `cloudByHour` already is, and set `relativeHumidity: humidityByHour.has(hourKey) ? humidityByHour.get(hourKey)! : null` on each pushed observation.

**Checkpoint**: SMHI-sourced `WeatherObservation`s now carry `relativeHumidity`, for both forecast and observed periods, matching MET Norway/Open-Meteo.

---

## Phase 4: User Story 1 - See today's humidity at a glance (Priority: P1)

### Tests for User Story 1

- [X] T009 [P] [US1] In `tests/integration/weatherIconOverview.test.tsx`'s "Today summary card" describe block, add tests: a current reading of 20% shows "Humidity Dry"; 50% shows "Humidity Normal"; 85% shows "Humidity High"; no reading (`relativeHumidity: null`/absent) shows no humidity line at all.

### Implementation for User Story 1

- [X] T010 [US1] In `src/components/TodaySummaryCard.tsx`, add a local `humidityLevel(percent: number): "Dry" | "Normal" | "High"` function (`< 30` Dry, `30-70` inclusive Normal, `> 70` High) and a `currentHumidity?: number | null` prop; render `<span>Humidity {humidityLevel(currentHumidity)}</span>` in the existing Sunrise/Sunset/Moon detail row only when `currentHumidity` is a number.
- [X] T011 [US1] In `src/components/WeatherIconOverview.tsx`, compute `const currentHumidity = nearestObservation?.relativeHumidity ?? null;` alongside the existing `currentTemperature`/`currentFeelsLike`, and pass `currentHumidity={currentHumidity}` to `<TodaySummaryCard>`.

**Checkpoint**: The Today card shows a humidity level whenever a reading is available, for any of the three data sources.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T012 [P] Run `npm run lint`.
- [X] T013 [P] Run `npx tsc -b`.
- [X] T014 Run `npm test` (full suite).
- [X] T015 Run `npm run build`.
- [X] T016 Bump `package.json` version (patch).
- [X] T017 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).

## Dependencies

- Phase 2 blocks Phase 3.
- Phase 3 (US2, data wiring) blocks Phase 4 (US1, display) being end-to-end testable, though T010's component change is independently correct without it.
- Phase 5 depends on Phases 3-4 complete.
