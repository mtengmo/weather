# Implementation Plan: Timeline Weather Dashboard Redesign

**Branch**: `008-timeline-dashboard-redesign` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-timeline-dashboard-redesign/spec.md`

## Summary

Rebuild the existing combined weather overview (007) from a one-card-per-hour grid into a single synchronized timeline: one shared time axis, one row per metric (condition, temperature, precipitation, wind, cloud cover) all pixel-aligned to that axis, one "now" line spanning every row, and the existing solid/dashed observed-vs-forecast convention applied uniformly. Adds a best-effort "Sun & Moon" summary (computed locally, no new dependency) and, where the data supports it, feels-like temperature, snow, and wind-gust rows using the same shared-axis pattern.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3 (unchanged)

**Primary Dependencies**: `lucide-react` (unchanged, reused for condition icons). **No new dependency** — sunrise/sunset and moon phase are computed locally via standard public-domain astronomical formulas (research.md §4) rather than a new API, keeping this consistent with the app's existing "plain fetch, minimal dependencies" pattern. Recharts is **not** used for the new timeline rows (research.md §1) — a single shared CSS Grid plus one overlaid inline SVG per line-shaped row replaces per-row chart instances, since independent `<ComposedChart>` instances stacked vertically cannot guarantee the pixel-perfect cross-row alignment FR-002/FR-003 require, and (as a secondary benefit) sidesteps the jsdom `<ResponsiveContainer>` zero-size limitation that has made 005/006's chart tests smoke-tests-only.

**Storage**: N/A (unchanged)

**Testing**: Vitest 2 + `@testing-library/react`, under `tests/unit/`/`tests/integration/` (unchanged convention). Because this feature's rendering is CSS Grid + plain SVG (not Recharts), its integration tests can make real DOM assertions the way 007's already do, not smoke tests.

**Target Platform**: Browser SPA (unchanged)

**Project Type**: Single-project web frontend (unchanged)

**Performance Goals**: No new goal — condition/feels-like/snow derivation and the sun/moon calculation are all cheap, pure, synchronous computations over already-loaded, small arrays (≤24 hourly or ≤7 daily points); no new network calls beyond two additional fields on the existing provider requests (research.md §2).

**Constraints**: Must reuse 007's `deriveWeatherCondition` (unchanged) and 006's `isForecast`/now-marker concepts rather than re-deriving them. Must replace `WeatherIconOverview.tsx`'s internal rendering (FR-013) while keeping the same `WeatherIconOverview` component/props contract and "Overview" navigation entry point (App.tsx/`ObservationChart.tsx`/`ObservationDetails.tsx` are unaffected). Must degrade per-row: a row whose data isn't available (feels-like/snow/gusts) is omitted entirely, never rendered empty (FR-011).

**Scale/Scope**: Extends `WeatherObservation`/`DailyAggregate` with three new optional fields (wind direction, wind gust, feels-like — snow is derived, not fetched); extends both providers to parse two already-present-but-unused response fields each (SMHI: `wind_from_direction`, `wind_speed_of_gust`; Open-Meteo: `wind_direction_10m`, `wind_gusts_10m`) plus computes feels-like locally from temperature+wind (one shared formula, not provider-native, to avoid a second, inconsistent "feels like" definition between SMHI- and Open-Meteo-sourced data — research.md §3); adds one new pure `sunMoon.ts` computation module; replaces `WeatherIconOverview.tsx`'s internals.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no project-specific gates to evaluate. No-op, as in every prior feature's plan in this repo.

**Post-design re-check**: No new external dependency is introduced (sun/moon math is computed, not fetched); the two new provider fields per source are parsed from responses the app already receives, not new endpoints. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/008-timeline-dashboard-redesign/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── models/
│   └── types.ts                 # Extend WeatherObservation with windDirection/windGust/
│                                 # feelsLike (all optional; DailyAggregate gets daily
│                                 # equivalents used by the 7-day timeline)
├── services/
│   ├── smhiProvider.ts          # Extend: parse wind_from_direction/wind_speed_of_gust
│   │                             # from the forecast response (already fetched, unused fields)
│   ├── openMeteoProvider.ts     # Extend: request + parse wind_direction_10m/wind_gusts_10m
│   ├── feelsLike.ts             # New: one shared feels-like formula (wind chill / heat
│   │                             # index) applied to temperature+wind(+humidity) regardless
│   │                             # of provider (research.md §3)
│   └── sunMoon.ts               # New: pure sunrise/sunset + moon-phase calculation from
│                                 # lat/lon/date — no network call (research.md §4)
├── components/
│   ├── weatherIcons.tsx         # Unchanged (007)
│   └── WeatherIconOverview.tsx  # Rewritten internals: shared CSS-grid timeline with
│                                 # overlaid SVG line rows, replacing the per-hour card grid
└── (tests)
    tests/unit/feelsLike.test.ts        # New
    tests/unit/sunMoon.test.ts          # New
    tests/unit/weatherCondition.test.ts # Unchanged (007, reused as-is)
    tests/integration/weatherIconOverview.test.tsx  # Rewritten for the new DOM structure
```

**Structure Decision**: Same single-project frontend, same module boundaries as every prior feature — new pure computations in `services/`, the rewritten timeline rendering in the existing `WeatherIconOverview.tsx` (no new component file, since FR-013 keeps this a redesign of the existing entry point, not a new one).

## Complexity Tracking

*No Constitution Check violations — this section is not applicable.*
