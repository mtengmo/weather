# Implementation Plan: Add Weather Forecast

**Branch**: `005-add-weather-forecast` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-add-weather-forecast/spec.md`

## Summary

Extend the existing observation pipeline so each station's chart series continues past "now" with provider-sourced forecast points (hourly for the 24h view, daily high/low/average for the 7d view), rendered as the same series with a dotted forecast segment, and replace the hardcoded "Current Location" label with the resolved station's real name. No new screens, no new data source category beyond what the app already talks to (SMHI primary, Open-Meteo fallback) — both already expose forecast data through APIs the app already calls or a close sibling of them.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3 (function components + hooks, no class components)

**Primary Dependencies**: Recharts 3.10 (`ComposedChart`/`Line`/`Bar`) for charting; no state-management library — local hooks + prop drilling; no HTTP client library — native `fetch`

**Storage**: N/A (no backend/database). Small user preferences (favorites, unit, theme, nearby-station count, high/low visibility) persist client-side via existing `use*Preference`/`useFavorites` hooks (browser storage) — forecast introduces no new persisted state.

**Testing**: Vitest 2 + `@testing-library/react` + `jsdom` (`npm test`), configured via `vite.config.ts` to discover `tests/**/*.test.{ts,tsx}` — note this is a **top-level `tests/` directory, not `src/`**. Every prior feature (001–004) added coverage here: `tests/unit/*.test.ts` for pure service/data functions (e.g. `smhiProvider.test.ts`, `dailyAggregation.test.ts`, `chartData.test.ts`, `weatherApi.test.ts`, using `vi.stubGlobal("fetch", ...)` for HTTP mocking and `vi.mock(...)` for provider-façade mocking) and `tests/integration/*.test.tsx` for component behavior (React Testing Library, rendering `ObservationChart`/`ObservationDetails` together via a small harness). This feature follows that established convention rather than introducing testing to the project.

**Target Platform**: Browser SPA, static-hosted (Vite build, deployed to a custom domain per prior commit history)

**Project Type**: Single-project web frontend (no separate backend — the app talks directly to SMHI and Open-Meteo from the browser)

**Performance Goals**: No hard SLA defined by the product; match the responsiveness of the existing observation charts (data fetch + render perceived as immediate on a normal broadband connection, consistent with today's `useObservationData` fetch-on-mount-or-change pattern)

**Constraints**: Must reuse the existing hourly/daily row-building (`src/components/chartData.ts`) and rendering (`src/components/ObservationChart.tsx`) pipeline rather than building a parallel one for forecast, per spec Assumptions ("same logic as before"); must not alter behavior for nearby comparison stations (forecast is primary-location-only per spec FR-006); must degrade gracefully (existing "data unavailable" pattern) rather than fail the whole chart when forecast is missing.

**Scale/Scope**: One feature touching the existing single-page app: two provider modules (SMHI, Open-Meteo forecast fetch), the shared observation model/types, the daily-aggregation helper, the primary-series row-builders, the chart component's series definitions, and the geolocation hook's naming. No new routes/pages/services beyond that.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no ratified principles for this project) — there are no project-specific gates to evaluate against. This check is a no-op until a real constitution is authored; no violations to record.

## Project Structure

### Documentation (this feature)

```text
specs/005-add-weather-forecast/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── models/
│   └── types.ts                 # Extend WeatherObservation/ObservationSeries with forecast markers (see data-model.md)
├── services/
│   ├── smhiProvider.ts          # Extend: fetch + merge SMHI forecast alongside existing observation fetch
│   ├── openMeteoProvider.ts     # Extend: request forecast_days beyond today, stop trimming future rows
│   ├── weatherApi.ts            # Unchanged shape — still the single façade used by the hook layer
│   └── dailyAggregation.ts      # Extend: aggregate forecast points into the same DailyAggregate shape, tagged
├── hooks/
│   ├── useObservationData.ts    # Unchanged shape — already returns whatever the provider gives it
│   └── useGeolocation.ts        # Change: displayName sourced from resolved station instead of literal "Current Location"
├── components/
│   ├── chartData.ts             # Extend: row-builders emit a second ("...Forecast") key per series for the dotted segment
│   └── ObservationChart.tsx     # Extend: add a second <Line>/<Bar> per metric for the forecast continuation, dashed

tests/
├── unit/                        # Extend existing: smhiProvider, openMeteoProvider, dailyAggregation, chartData, weatherApi
└── integration/                 # Extend existing: chartAndDetails.test.tsx (or a new forecast-focused integration test)
```

**Structure Decision**: Single existing frontend project — no new top-level directories. The feature is implemented entirely as extensions to the existing `services` (data fetch + shaping), `models` (shared types), and `components`/`hooks` (rendering + station naming) layers already in place, following the same module boundaries used by `003-extended-history-metrics` and `004-chart-styling-fixes`.

## Complexity Tracking

*No Constitution Check violations — this section is not applicable.*
