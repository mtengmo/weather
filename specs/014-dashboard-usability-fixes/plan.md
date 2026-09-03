# Implementation Plan: Dashboard Usability Fixes

**Branch**: `014-dashboard-usability-fixes` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-dashboard-usability-fixes/spec.md`

## Summary

Eight independent slices through the existing app: (1) `PlaceSearch` gains a "View" action
alongside its existing "Add to favorites" action; (2) `LocationSwitcher`/`LocationPanel` gain a
current-location retry path driven by `useGeolocation`'s existing `status`; (3) the 7-day
Overview's timeline width switches from `max-content` to `100%` (a pure CSS change) so its columns
stretch on wide screens while still falling back to scroll on narrow ones; (4) `highLowVisible` is
threaded into `WeatherIconOverview`/`timelineData.ts` so the 7-day temperature row can show each
day's high/low, reusing `DailyAggregate.high`/`.low`, which already exist; (5) `NearbyStationCountControl`
is conditionally rendered based on the active view; (6) `geocodingApi.ts` sorts results by
Nordic-country membership before returning them; (7) a new `combineForecastSources` preference and
a parallel SMHI+Open-Meteo forecast fetch power an averaged + per-source multi-series temperature
chart; (8) `buildDailyTimelineData` gains a sub-day bucketing path for the first two days of the
7-day view.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3, Vite 5

**Primary Dependencies**: Recharts 3.10 (`ObservationChart.tsx`, User Story 7), existing
`App.tsx`/`LocationPanel`/`LocationSwitcher`/`PlaceSearch` components (User Stories 1-2, 5),
existing `WeatherIconOverview.tsx`/`timelineData.ts`/`dailyAggregation.ts` (User Stories 3-4, 8),
existing `weatherApi.ts`/`smhiProvider.ts`/`openMeteoProvider.ts` (User Story 7),
`geocodingApi.ts` (User Story 6)

**Storage**: `localStorage`, one new preference key for `combineForecastSources` (User Story 7),
mirroring the existing `units.ts`/`highLowVisibility.ts` preference-persistence pattern

**Testing**: Vitest 2 + `@testing-library/react`, matching this repo's existing unit/integration split

**Target Platform**: Browser (GitHub Pages static SPA)

**Project Type**: Single-project web frontend (unchanged)

**Performance Goals**: User Story 7 is the only one adding a network call (an extra forecast
fetch from the non-primary provider, but only when the toggle is on) — every other story is
presentation-layer or a pure-function change with no new network activity

**Constraints**: No new dependencies; User Story 7's extra fetch must not happen when the toggle
is off (no wasted API calls by default); User Story 8's sub-day bucketing must not change the
existing daily bucketing for days 3-7; User Story 6's ranking must never exclude results, only
reorder them

**Scale/Scope**: Touches `PlaceSearch.tsx`, `LocationSwitcher.tsx`, `LocationPanel.tsx`, `App.tsx`,
`index.css`, `timelineData.ts`, `WeatherIconOverview.tsx`, `dailyAggregation.ts`,
`geocodingApi.ts`, `weatherApi.ts`, `ObservationChart.tsx`, `chartData.ts`, plus one new
`useCombineForecastSourcesPreference` hook and one new `CombineForecastToggle` component

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no ratified gates apply.
Proceeding per established conventions: no new dependencies, no fabricated data (User Story 8's
sub-day buckets follow the same "gap over fabrication" rule as every prior daily-bucket feature),
and new network activity (User Story 7) is opt-in, never automatic.

## Project Structure

### Documentation (this feature)

```text
specs/014-dashboard-usability-fixes/
├── plan.md               # This file (/speckit-plan command output)
├── research.md           # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   ├── location-actions.md
│   ├── overview-parity.md
│   ├── nordic-ranking.md
│   └── multi-source-forecast.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── PlaceSearch.tsx              # + "View" action alongside "Add to favorites" (US1)
│   ├── LocationSwitcher.tsx         # + current-location retry button when denied (US2)
│   ├── LocationPanel.tsx            # + threads geoStatus/onRequestCurrentLocation (US2)
│   ├── App.tsx                      # + hides NearbyStationCountControl on Overview (US5),
│   │                                 #   + threads highLowVisible to Overview (US4),
│   │                                 #   + threads combineForecastSources (US7)
│   ├── WeatherIconOverview.tsx      # + high/low temperature display (US4),
│   │                                 #   + fill-width class on 7-day timeline (US3)
│   ├── ObservationChart.tsx         # + averaged + per-source temperature lines (US7)
│   └── CombineForecastToggle.tsx    # NEW (US7)
├── components/
│   ├── timelineData.ts              # + high/low on daily temperature row (US4),
│   │                                 #   + sub-day bucketing for the first two days (US8)
│   └── chartData.ts                 # + averaged-series row builder (US7)
├── services/
│   ├── geocodingApi.ts              # + Nordic-first sort (US6)
│   ├── weatherApi.ts                # + parallel multi-source forecast fetch (US7)
│   ├── dailyAggregation.ts          # + sub-day bucket variant (US8)
│   └── combineForecastPreference.ts # NEW (US7), mirrors units.ts's pattern
├── hooks/
│   └── useCombineForecastSourcesPreference.ts  # NEW (US7)
└── index.css                        # .weather-timeline-fill (US3), location-action styles (US1),
                                       #   current-location retry button styles (US2)

tests/
├── unit/
│   ├── geocodingApi.test.ts          # NEW or extended — Nordic-first sort (US6)
│   ├── timelineData.test.ts          # + high/low temperature points, sub-day periods
│   ├── dailyAggregation.test.ts      # + sub-day bucket variant
│   ├── weatherApi.test.ts            # + multi-source forecast fetch
│   └── chartData.test.ts             # + averaged-series row builder
└── integration/
    ├── appHeader.test.tsx             # + View action, current-location retry,
    │                                   #   nearby-stations hidden on Overview
    ├── weatherIconOverview.test.tsx   # + high/low display, fill-width class, sub-day periods
    └── chartAndDetails.test.tsx       # + combine-forecast-sources toggle and rendering
```

**Structure Decision**: Single-project web frontend (unchanged from 001-013). Eight narrow
vertical slices through existing files, plus a small, self-contained new preference/hook/component
trio for User Story 7 (mirroring this app's existing preference-persistence pattern).

## Complexity Tracking

*No constitution violations — table omitted.*
