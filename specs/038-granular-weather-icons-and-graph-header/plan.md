# Implementation Plan: More Granular Weather Icons and a Slimmer Graph Header

**Branch**: `038-granular-weather-icons-and-graph-header` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/038-granular-weather-icons-and-graph-header/spec.md`

## Summary

Two independent changes: (1) `deriveWeatherCondition` gains a low-confidence guard so a forecast period with a small precipitation amount but a low stated chance-of-rain no longer shows a rain/snow icon, and the existing single "cloudy" condition splits into "partly-cloudy" (lighter cover) and "cloudy" (heavier/overcast), sourced from data every provider already supplies; (2) the Details/graph view's top area is made visibly shorter on mobile by showing the location title inline with the window-toggle row and letting the window-toggle/metric-tabs scroll horizontally instead of wrapping onto extra lines at narrow widths.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: `lucide-react` (icon set) — a new icon for "partly-cloudy" comes from the existing dependency, no new package

**Storage**: N/A — no persisted preference changes

**Testing**: Vitest + React Testing Library (`tests/integration`, `tests/unit`)

**Target Platform**: Web (Vite-built SPA)

**Project Type**: Single-project web app (`src/`)

**Performance Goals**: N/A

**Constraints**: Must not change behavior for periods with no chance-of-rain data (FR-003); must not regress desktop graph-view layout (FR-008); must not need new data-source calls — `chanceOfRain`/`chanceOfRainMax` are already fetched and present on `WeatherObservation`/`DailyAggregate`

**Scale/Scope**: `services/weatherCondition.ts` (core logic), its three provider symbol-mapping call sites (`smhiProvider.ts`, `metNoProvider.ts`, plain cloud-cover fallback), every call site that builds a displayed icon (`components/weatherIcons.tsx`, `timelineData.ts`, `TodaySummaryCard.tsx`, `WeeklyForecastStrip.tsx`, `WeatherIconOverview.tsx`, `ObservationDetails.tsx`), and `ObservationChart.tsx` + `index.css` for the graph header layout

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Project constitution (`.specify/memory/constitution.md`) is an unfilled template — no concrete principles to gate against. No violations possible.

## Project Structure

### Documentation (this feature)

```text
specs/038-granular-weather-icons-and-graph-header/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

No `contracts/` — internal logic/UI work only, no external interface.

### Source Code (repository root)

```text
src/
├── services/
│   ├── weatherCondition.ts     # add "partly-cloudy", chanceOfRain low-confidence guard
│   ├── smhiProvider.ts         # split SMHI Wsymb2 codes 3-4 (partly-cloudy) from 5-6 (cloudy)
│   ├── metNoProvider.ts        # split "fair"/"partlycloudy" from "cloudy"
│   └── openMeteoProvider.ts    # no change — already supplies chanceOfRain; cloud_cover feeds
│                                #   the existing generic cloud-cover-percent branch
├── components/
│   ├── weatherIcons.tsx        # new "partly-cloudy" icon entry
│   ├── timelineData.ts         # pass chanceOfRain/chanceOfRainMax into the icon-affecting
│   │                            #   deriveWeatherCondition calls (not the isSnowyCondition ones)
│   ├── TodaySummaryCard.tsx    # pass today.chanceOfRainMax
│   ├── WeeklyForecastStrip.tsx # pass day.chanceOfRainMax
│   ├── WeatherIconOverview.tsx # pass nearestObservation.chanceOfRain
│   ├── ObservationDetails.tsx  # pass obs.chanceOfRain
│   └── ObservationChart.tsx    # visible title inline with window-toggle row
└── index.css                    # horizontal-scroll window-toggle/metric-tabs on mobile instead
                                  #   of wrapping; new inline-title layout

tests/
├── unit/
│   └── weatherCondition.test.ts     # low-confidence guard + partly-cloudy threshold tests
└── integration/
    ├── weatherIconOverview.test.tsx  # partly-cloudy / low-confidence icon assertions
    └── chartAndDetails.test.tsx      # graph-header title-inline assertion
```

**Structure Decision**: Existing single-project layout. No new files — every change is an edit to an existing module, following the pattern each already uses (symbol-code table entries, WEATHER_ICONS record entries, deriveWeatherCondition call-site objects).

## Complexity Tracking

*No constitution violations — section not applicable.*
