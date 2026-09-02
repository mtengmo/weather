# Tasks: Overview Default, Location Panel, and Graph Readability

**Input**: Design documents from `C:\GitRepos\weather\specs\013-overview-default-and-layout\`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested in spec.md, but this repo has paired implementation with tests under `tests/unit/`/`tests/integration/` for every prior feature (005–012) — this plan continues that convention.

**Organization**: Tasks are grouped by user story (spec.md priorities: US1=P1 overview default, US2=P1 location panel, US3=P2 center-on-now, US4=P2 data source note, US5=P2 mirrored axis + dots, US6=P3 observed high/low note).

## Path Conventions

Single-project web frontend (unchanged). Source under `src/`; tests under the top-level `tests/unit/` and `tests/integration/`.

---

## Phase 1: Setup

- [X] T001 Verify the pre-013 baseline is clean: run `npm test`, `npx tsc -b --noEmit`, and `npm run build` against the current codebase before starting, so any failure surfaced later is known to be from this feature's changes.

---

## Phase 2: Foundational

No blocking prerequisites shared by all six stories — each touches a distinct slice. US4's
`primarySource` field is foundational only to US4 itself, so it lives as the first task in that
story's own phase rather than here.

**Checkpoint**: Skip directly to Phase 3 — no foundational tasks to complete first.

---

## Phase 3: User Story 1 - Land on the overview, not the raw graph (Priority: P1) 🎯 MVP

**Goal**: The app opens on the Overview timeline whenever a location resolves, instead of the line-graph view; "Back to graph" still works.

**Independent Test**: Load the app fresh with a resolvable location; confirm the Overview timeline is the first view shown.

### Implementation for User Story 1

- [X] T002 [US1] Edit `src/App.tsx` (research.md §1): change `useState<View>("graph")` to `useState<View>("overview")`; change `selectLocation`'s `setView("graph")` to `setView("overview")` so a newly-selected location also lands on the Overview, consistent with the new default.
- [X] T003 [US1] Integration test in `tests/integration/appHeader.test.tsx`: a fresh render with a resolvable (cached or geolocated) location shows the Overview timeline, not the graph; clicking "Back to graph" from the Overview still switches to the graph view.

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable — this alone is a shippable default-view change.

---

## Phase 4: User Story 2 - Location switching moves into its own panel (Priority: P1)

**Goal**: The header shows a single "Change location" control; activating it opens a panel with current-location, favorites, and search together, usable at every viewport width.

**Independent Test**: Open the app on a wide viewport; confirm the header shows one compact control instead of three separate sections, and that it opens a panel containing all three.

### Implementation for User Story 2

- [X] T004 [US2] Create `src/components/LocationPanel.tsx` (contracts/location-panel.md): a toggle button (`aria-expanded`, `aria-controls`) plus a conditionally-rendered panel wrapping the existing `LocationSwitcher`, `PlaceSearch`, and `FavoritesList` components unchanged; a `selectAndClose` wrapper around the `onSelect` prop that also closes the panel; outside-click (`document` `mousedown`, active only while open) and `Escape` (`keydown`, active only while open) both close the panel without invoking `onSelect`; an explicit in-panel close button.
- [X] T005 [P] [US2] Add `LocationPanel` styles to `src/index.css`: an anchored panel positioned relative to the toggle button, usable at both mobile and laptop widths (FR-009) — reuse the app's existing theme CSS variables and responsive `@media` conventions rather than introducing new breakpoints.
- [X] T006 [US2] Edit `src/App.tsx` (contracts/location-panel.md): replace the header's inline `<PlaceSearch>`/`<FavoritesList>` and the always-visible `<LocationSwitcher>` below the header with a single `<LocationPanel currentLocation favorites favoritesError selected onSelect={selectLocation} onAddFavorite={(candidate) => add(candidate)} onRemoveFavorite={remove} onDismissFavoritesError={clearError} />`. Depends on T004.
- [X] T007 [US2] Integration tests in `tests/integration/appHeader.test.tsx`: the header contains a single "Change location" control and no longer contains always-visible search/favorites sections; opening it reveals current-location, favorites, and search together; selecting a location (current position, favorite, or a freshly-searched-and-added favorite) switches the app to it and closes the panel; adding a favorite via search and removing a favorite both leave the panel open; pressing Escape or clicking outside the panel closes it without changing the selected location; the panel marks the currently-selected location (e.g. via `aria-pressed`).

**Checkpoint**: User Stories 1 and 2 both work independently and together — the MVP layout change is complete.

---

## Phase 5: User Story 3 - The timeline opens centered on "now" (Priority: P2)

**Goal**: Whenever the 24-hour timeline's columns overflow its visible width and a "now" boundary exists, it opens already scrolled so "now" is centered.

**Independent Test**: On a narrow viewport with an overflowing timeline and a forecast boundary, confirm the "now" column is visible without scrolling.

### Implementation for User Story 3

- [X] T008 [US3] Edit `src/components/WeatherIconOverview.tsx` (research.md §5): add a `useEffect` (keyed on the timeline's underlying data so it reruns on window/location changes, per FR-012) that, when `timelineWrapRef.current.scrollWidth > timelineWrapRef.current.clientWidth` and `nowLeftPercent !== null`, sets `scrollLeft = clamp((scrollWidth * nowLeftPercent / 100) - clientWidth / 2, 0, scrollWidth - clientWidth)`. No-op (leave default scroll position) when the content fits or there's no "now" column.
- [X] T009 [P] [US3] Integration tests in `tests/integration/weatherIconOverview.test.tsx`: a series with an overflowing 24-hour timeline and a forecast boundary ends up with a non-zero, roughly-centered `scrollLeft` after render; a series that fits within the container, or has no forecast boundary, leaves `scrollLeft` at its default; switching windows and back re-applies the centering for the new content.

**Checkpoint**: User Stories 1, 2, and 3 all work independently and together.

---

## Phase 6: User Story 4 - Know where the data comes from (Priority: P2)

**Goal**: A visible note on both the graph and Overview views states which provider(s) supplied the currently displayed data.

**Independent Test**: Open a Swedish (SMHI) and a non-Swedish (Open-Meteo) location in turn; confirm the note correctly names the source in each case, without hovering.

### Implementation for User Story 4

- [X] T010 [US4] Edit `src/models/types.ts` (data-model.md): add `primarySource: "smhi" | "open-meteo";` to `ObservationSeries`.
- [X] T011 [US4] Edit `src/services/weatherApi.ts`'s `getObservations` (contracts/chart-readability.md): set `primarySource: "smhi"` on both the plain-SMHI-success return and the SMHI-success-with-forecast-fallback return; set `primarySource: "open-meteo"` on the not-covered/SMHI-failed return that delegates to `openMeteoProvider.getObservations`. Depends on T010.
- [X] T012 [P] [US4] Unit tests in `tests/unit/weatherApi.test.ts`: `primarySource` is `"smhi"` when SMHI serves the location (with and without a forecast-fallback); `primarySource` is `"open-meteo"` when SMHI isn't covered or fails.
- [X] T013 [US4] Edit `src/components/ObservationChart.tsx` (contracts/chart-readability.md): render a data-source note reading `series.primarySource`/`series.forecastFromFallbackSource` — "Data: SMHI", "Data: SMHI (forecast: Open-Meteo)", or "Data: Open-Meteo" — visible without hovering. Depends on T011.
- [X] T014 [US4] Edit `src/components/WeatherIconOverview.tsx`: render the same data-source note as T013. Depends on T011.
- [X] T015 [P] [US4] Add data-source note styling to `src/index.css`, consistent with the app's existing muted-caption conventions (e.g. `var(--text-muted)`).
- [X] T016 [US4] Integration tests in `tests/integration/chartAndDetails.test.tsx` and `tests/integration/weatherIconOverview.test.tsx`: the note renders the correct text for each of the three `primarySource`/`forecastFromFallbackSource` combinations, on both views, without requiring a hover/click query.

**Checkpoint**: User Stories 1-4 all work independently and together.

---

## Phase 7: User Story 5 - Read chart values without hunting, and see each point (Priority: P2)

**Goal**: Every single-scale chart mirrors its Y-axis on the right edge; every plotted line shows a visible marker at each data point, with observed/forecast markers staying distinguishable.

**Independent Test**: Open the wind or cloud-coverage chart; confirm the scale now appears on both edges and every point has a visible dot.

### Implementation for User Story 5

- [X] T017 [US5] Edit `src/components/ObservationChart.tsx` (research.md §6): add a sibling `<YAxis orientation="right" .../>` (same `dataKey`/domain as the existing left axis) to each chart that currently shows only one `<YAxis>` — the rain chart, the wind chart (both hourly-line and daily-high/low/average variants), and the cloud-coverage chart. Leave the temperature chart's existing `yAxisId="temp"` (left) / `yAxisId="precip"` (right) two-metric layout untouched.
- [X] T018 [US5] Edit `src/components/ObservationChart.tsx` (research.md §7): change every `<Line dot={false} .../>` to `<Line dot={{ r: 3 }} .../>` across all chart blocks in this file; leave each line's existing `activeDot={{ r: 5 }}` (where present) unchanged.
- [X] T019 [US5] Integration tests in `tests/integration/chartAndDetails.test.tsx`: the rain/wind/cloud charts each render two `YAxis`-equivalent tick groups (structural assertion via Recharts' rendered `.recharts-yAxis` elements, matching this repo's existing smoke-test-only precedent for Recharts internals); the temperature chart still renders exactly two distinct-scale axes; every rendered `<Line>` produces visible dot elements (`.recharts-line-dot` or equivalent) for a series with a small, known number of points.

**Checkpoint**: User Stories 1-5 all work independently and together.

---

## Phase 8: User Story 6 - See the highest and lowest observed temperature at a glance (Priority: P3)

**Goal**: The temperature chart shows a note identifying the single highest and lowest observed (non-forecast) temperature in the currently displayed window.

**Independent Test**: Open the temperature chart for a window with observed data; confirm the note names the correct high/low values and times, and is absent for an all-forecast window.

### Implementation for User Story 6

- [X] T020 [US6] Add `ObservedExtreme`, `ObservedExtremes`, and `findObservedExtremes` to `src/components/chartData.ts` (data-model.md): filters `observations` to `!o.isForecast && o.temperature !== null`, returns `{ high, low }` (each `{ value, timestamp }`) or `null` when no qualifying observation exists; ties resolve to the first (oldest) occurrence.
- [X] T021 [P] [US6] Unit tests in `tests/unit/chartData.test.ts`: correct high/low value and timestamp for a mixed series; forecast points are excluded even when more extreme than any observed point; returns `null` for an empty or all-forecast/all-null-temperature series; a tie resolves to the earliest occurrence.
- [X] T022 [US6] Edit `src/components/ObservationChart.tsx` (contracts/chart-readability.md): when `metric === "temperature"`, render a note using `findObservedExtremes(series.observations)` — e.g. "High: 24°C at 15:00 · Low: 9°C at 04:00" — using this file's existing `formatValue`/unit-conversion helpers; render nothing when the result is `null`. Depends on T020.
- [X] T023 [P] [US6] Add high/low note styling to `src/index.css`.
- [X] T024 [US6] Integration tests in `tests/integration/chartAndDetails.test.tsx`: the note shows the correct high/low values and approximate times for a window with observed data; the note is absent for an all-forecast window; the note updates correctly when switching between the 24-hour, 7-day, and 30-day windows.

**Checkpoint**: All six user stories are independently functional and work together.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T025 [P] Run `npm run lint` and fix any issues in the touched files.
- [X] T026 Run `npm test`, `npx tsc -b --noEmit`, and `npm run build`; fix any failures across the extended/new test suite and the TypeScript build.
- [X] T027 Manually execute `specs/013-overview-default-and-layout/quickstart.md` scenarios 1-6 against the running dev server, using the Playwright setup already proven working in this repo's prior polish phases — cover both an SMHI-covered and an Open-Meteo-only location, and both mobile and laptop viewport widths for the LocationPanel and center-on-now scenarios.
- [X] T028 [P] Confirm the new LocationPanel, data-source note, and high/low note all follow the active theme (spot-check Midnight/Bright/Glass) and remain legible/usable at both mobile and laptop widths.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: None — skipped.
- **User Story 1 (Phase 3)**: Independent of every other story — `App.tsx` only, but see the note below about sharing that file with US2.
- **User Story 2 (Phase 4)**: Independent of US1/US3/US4/US5/US6 in logic, but shares `App.tsx` with US1 — sequence US1's T002 before US2's T006 if one person/agent is doing both, to avoid merge conflicts in that file.
- **User Story 3 (Phase 5)**: Independent of every other story — `WeatherIconOverview.tsx` only, but see the note below about sharing that file with US4.
- **User Story 4 (Phase 6)**: Independent in logic, but touches both `ObservationChart.tsx` (shared with US5/US6) and `WeatherIconOverview.tsx` (shared with US3) — sequence US4 after US3 for the shared file, and before US5/US6 for the other.
- **User Story 5 (Phase 7)**: Shares `ObservationChart.tsx` with US4 and US6 — sequence after US4, before US6, if one person/agent is doing all three.
- **User Story 6 (Phase 8)**: Shares `ObservationChart.tsx` with US4 and US5 — sequence last among the three for that file.
- **Polish (Phase 9)**: Depends on whichever of Phases 3-8 are in scope for this delivery.

### Within Each Story

- T002 before T003 (test).
- T004 before T005 (styles target T004's classes) before T006 (wiring) before T007 (tests).
- T008 before T009 (test).
- T010 before T011 (test needs the field to exist) before T012 (test); T011 before T013/T014 (rendering reads the field) before T015 (styles) and T016 (tests).
- T017 and T018 can be done in either order within US5, both before T019 (tests).
- T020 before T021 (test) before T022 (rendering) before T023 (styles) and T024 (tests).

### Parallel Opportunities

- T005 is `[P]` relative to T006 (styles vs. wiring, though both depend on T004).
- T009 is `[P]` relative to nothing else in US3 (single implementation task).
- T012 is `[P]` relative to T013/T014 (test file vs. source files, once T011 lands).
- T015 is `[P]` relative to T013/T014.
- T021 is `[P]` relative to T022.
- T023 is `[P]` relative to T022's sibling tasks.
- T025 and T028 are `[P]` within Polish.

---

## Parallel Example: Independent Story Kickoff

```bash
# US1 and US3 touch entirely different files from each other and can start immediately in parallel:
Task: "US1 — default view to overview (T002)"
Task: "US3 — center timeline on now (T008)"
# US2 should sequence after US1 (shared App.tsx); US4 after US3 (shared WeatherIconOverview.tsx).
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1 (Setup).
2. Complete Phase 3 (User Story 1) and Phase 4 (User Story 2) — both P1, together reshaping the
   app's primary landing experience.
3. **STOP and VALIDATE**: run quickstart.md Scenarios 1-2 on both mobile and laptop viewports.
4. Demo/ship if ready.

### Incremental Delivery

1. Setup → User Story 1 → validate → ship (Overview default).
2. Add User Story 2 → validate → ship (location panel) — MVP layout change complete.
3. Add User Story 3 → validate → ship (center-on-now).
4. Add User Story 4 → validate → ship (data source note).
5. Add User Story 5 → validate → ship (mirrored axis + dots).
6. Add User Story 6 → validate → ship (observed high/low note).
