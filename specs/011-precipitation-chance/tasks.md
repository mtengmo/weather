# Tasks: Chance of Rain Alongside Precipitation Amount

**Input**: Design documents from `C:\GitRepos\weather\specs\011-precipitation-chance\`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/provider-fields.md](./contracts/provider-fields.md), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested in spec.md, but this repo has paired implementation with tests under `tests/unit/`/`tests/integration/` for every prior feature (005–010) — this plan continues that convention.

**Organization**: The spec has a single user story (US1, P1) — every implementation task below belongs to it. Setup/Foundational hold the shared data-model field additions that US1's provider, aggregation, and rendering tasks all build on.

## Path Conventions

Single-project web frontend (unchanged). Source under `src/`; tests under the top-level `tests/unit/` and `tests/integration/`.

---

## Phase 1: Setup

- [X] T001 Verify the pre-011 baseline is clean: run `npm test`, `npx tsc -b --noEmit`, and `npm run build` against the current codebase before starting, so any failure surfaced later is known to be from this feature's changes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The `chanceOfRain`/`chanceOfRainMax` fields added here are read and written by every downstream task in US1.

- [X] T002 Extend `src/models/types.ts` (data-model.md): add `chanceOfRain?: number | null;` to `WeatherObservation` and `chanceOfRainMax?: number | null;` to `DailyAggregate`, each with a doc comment matching the style of the existing 008-added optional fields (`windDirection`, `windGustHigh`).

**Checkpoint**: The new optional fields exist on both types; every task below can now read/write them.

---

## Phase 3: User Story 1 - See how likely rain is, not just how much (Priority: P1) 🎯 MVP

**Goal**: The timeline's precipitation row shows a chance-of-rain percentage beneath the millimeter amount for any column where the underlying forecast data supplies it, in both the 24-hour and 7-day views, while observed columns and columns without probability data behave exactly as they do today.

**Independent Test**: Open the timeline for a location/window with Open-Meteo-sourced forecast data; confirm forecast columns in the precipitation row show a percentage beneath the mm value, observed columns show no percentage, and (per quickstart.md Scenario 3) the 7-day view's daily column shows the day's maximum hourly percentage.

### Implementation for User Story 1

- [X] T003 [P] [US1] Extend `src/services/openMeteoProvider.ts` (contracts/provider-fields.md): add `precipitation_probability` to the `hourly` query parameter string in `fetchHourlyPoints`; add `precipitation_probability?: (number | null)[];` to `OpenMeteoHourlyResponse.hourly`; map `chanceOfRain: precipitation_probability?.[i] ?? null` in the per-point mapping used by both `getObservations` and `getForecastOnly`.
- [X] T004 [US1] Extend `src/services/dailyAggregation.ts`'s `toDailyAggregates` (data-model.md, research.md §3): compute `chanceOfRainMax` per bucket as the maximum `chanceOfRain` value among that bucket's observations where `isForecast === true` and `chanceOfRain` is non-null, or `null` if none qualify — mirroring the existing `windGustHigh` max-of-bucket pattern. Depends on T002.
- [X] T005 [US1] Extend `src/components/timelineData.ts`'s `RowSource` interface and both `buildHourlyTimelineData` and `buildDailyTimelineData`: add `chanceOfRain: number | null` to `RowSource` (hourly: `obs.chanceOfRain ?? null`; daily: `day.chanceOfRainMax ?? null`); add `chanceOfRain?: number | null` to `TimelineRowPoint`; in `buildRows`'s precipitation row point-mapping, set `chanceOfRain: s.isForecast ? (s.chanceOfRain ?? null) : null` so observed points never carry a percentage regardless of the raw source value (data-model.md, research.md §2, FR-004). Depends on T002.
- [X] T006 [US1] In `src/components/WeatherIconOverview.tsx`'s `BarRow`, render a secondary line beneath each column's existing `weather-timeline-bar-value` span whenever `point.chanceOfRain !== null && point.chanceOfRain !== undefined`, formatted as `${Math.round(point.chanceOfRain)}%`, using a new `weather-timeline-bar-chance` class. Depends on T005.
- [X] T007 [US1] [P] Add `.weather-timeline-bar-chance` styling to `src/index.css`: smaller font size and `var(--text-muted)` color relative to `.weather-timeline-bar-value`, so the percentage reads as clearly secondary to the mm amount (FR-005).
- [X] T008 [P] [US1] Unit tests for `openMeteoProvider.ts` in `tests/unit/openMeteoProvider.test.ts`: `chanceOfRain` is parsed from `precipitation_probability` when present; is `null` when the field is absent from the response.
- [X] T009 [P] [US1] Unit tests for `dailyAggregation.ts` in `tests/unit/dailyAggregation.test.ts`: `chanceOfRainMax` takes the bucket's forecast-only maximum; ignores non-forecast readings; is `null` when the bucket has no qualifying readings; a `0` reading is preserved (not treated as absent).
- [X] T010 [P] [US1] Unit tests for `timelineData.ts` in `tests/unit/timelineData.test.ts`: the precipitation row's `chanceOfRain` passes through for a forecast point with data; is `null` for a forecast point without data; is `null` for an observed point even when the underlying source value is non-null (isForecast gating, FR-004); the daily builder's precipitation row reflects `chanceOfRainMax`.
- [X] T011 [US1] Integration tests in `tests/integration/weatherIconOverview.test.tsx`: a forecast column with both amount and chance-of-rain data renders both values in the precipitation row (percentage beneath the amount); an observed column renders only the amount; a forecast column with amount but no chance-of-rain data renders only the amount, with no empty placeholder. Depends on T006, T007.

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable — this is the whole feature (single-story spec).

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T012 [P] Run `npm run lint` and fix any issues in the touched files.
- [X] T013 Run `npm test`, `npx tsc -b --noEmit`, and `npm run build`; fix any failures across the extended test suite and the TypeScript build.
- [X] T014 Manually execute `specs/011-precipitation-chance/quickstart.md` scenarios 1, 2, and 4 against the running dev server (scenario 3's raw hourly inputs aren't visible live, per quickstart.md — rely on T009/T010's unit coverage for that scenario). Use the Playwright setup proven working in prior features' polish passes if a live SMHI/Open-Meteo location with forecast data is reachable.
- [X] T015 [P] Confirm the new percentage display follows the active theme (spot-check `.weather-timeline-bar-chance` against all three themes: Midnight, Bright, Glass) and both unit systems (percentage itself is unit-independent, but confirm it doesn't visually collide with the mm/in amount in either system).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS User Story 1 — none of its tasks can add data to fields that don't exist yet.
- **User Story 1 (Phase 3)**: Depends on Foundational. This is the feature's only story.
- **Polish (Phase 4)**: Depends on User Story 1 being complete.

### Within Phase 3

- T002 (types) before T003/T004/T005 (all read/write the new fields).
- T003 (provider) before T004 (aggregation reads `chanceOfRain` off observations) and before T005 (timelineData reads it too), though T003/T004/T005 can each start once T002 lands since they touch different files — sequence only matters for T004/T005 reading data T003 populates at runtime, not for writing the code itself.
- T005 (timelineData) before T006 (rendering reads `TimelineRowPoint.chanceOfRain`).
- T006 before T007 is not a strict dependency (different files) but T007's CSS targets the class T006 introduces — land together.
- T008/T009/T010 (unit tests) can be written in parallel with their corresponding implementation tasks (T003/T004/T005 respectively) once each lands.
- T011 (integration tests) depends on T006 and T007 (needs the actual rendering + styling to assert against).

### Parallel Opportunities

- T003 is `[P]` relative to T004/T005 at the code-writing level (different files), though see the sequencing note above for runtime data dependencies.
- T007 is `[P]` relative to T006's sibling tasks once T006's class name is decided.
- T008, T009, T010 are each `[P]` relative to one another (different test files).
- T012 and T015 are `[P]` within Polish.

---

## Parallel Example: User Story 1

```bash
# After T002 (types) lands:
Task: "Extend openMeteoProvider.ts to parse precipitation_probability"
Task: "Extend dailyAggregation.ts to compute chanceOfRainMax"
Task: "Extend timelineData.ts's precipitation row with chanceOfRain"
# ...then T006 (render), T007 (style), then T008/T009/T010 (unit tests), then T011 (integration tests).
```

---

## Implementation Strategy

### MVP First (and Only) Scope

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (User Story 1) — the entire feature.
3. **STOP and VALIDATE**: run quickstart.md scenarios 1, 2, and 4 against a real location with Open-Meteo forecast data.
4. Complete Phase 4 (Polish), then ship — spec.md has only one user story, so this is the whole feature end to end.
