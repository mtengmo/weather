# Implementation Plan: Chance of Rain Alongside Precipitation Amount

**Branch**: `011-precipitation-chance` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-precipitation-chance/spec.md`

## Summary

Add an optional chance-of-rain percentage beneath the millimeter amount in the timeline's
precipitation row, sourced from whichever forecast provider supplies it (currently Open-Meteo's
`precipitation_probability`; SMHI's point-forecast API does not expose an equivalent field, so
SMHI-sourced forecast columns will simply show amounts only, per the spec's opportunistic-display
requirement). Observed/historical columns never show a percentage, since a measurement is not a
probability. The 7-day view's daily column derives its percentage as the maximum of that day's
underlying hourly percentages (Clarifications, 2026-09-02).

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3, Vite 5

**Primary Dependencies**: Existing `openMeteoProvider.ts`/`smhiProvider.ts` fetch layer, existing
`timelineData.ts` row-shaping layer, existing `WeatherIconOverview.tsx` rendering shell (008).

**Storage**: N/A (no persistence — this is a per-render derived display value)

**Testing**: Vitest 2 + `@testing-library/react`, matching this repo's existing unit/integration split

**Target Platform**: Browser (GitHub Pages static SPA), same as the rest of the app

**Project Type**: Single-project web frontend (unchanged)

**Performance Goals**: N/A beyond the app's existing performance profile — this adds one optional
field to an already-fetched response, no new network calls

**Constraints**: No new upstream API calls; degrade gracefully wherever a provider doesn't supply
the field (spec Assumptions)

**Scale/Scope**: One field addition threaded through the existing provider → aggregation →
row-building → rendering pipeline; touches the precipitation row only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no ratified project-specific
principles) — no gates apply. Proceeding using this repo's established conventions from prior
features (005-010) as the de facto quality bar: graceful degradation when optional provider data
is absent, no fabricated values, and no new upstream dependencies.

## Project Structure

### Documentation (this feature)

```text
specs/011-precipitation-chance/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── provider-fields.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── models/
│   └── types.ts                    # + chanceOfRain on WeatherObservation, chanceOfRainMax on DailyAggregate
├── services/
│   ├── openMeteoProvider.ts        # + precipitation_probability parsing
│   ├── smhiProvider.ts             # no change (no equivalent field available)
│   └── dailyAggregation.ts         # + chanceOfRainMax (max of bucket's forecast chanceOfRain values)
└── components/
    ├── timelineData.ts             # + chanceOfRain on precipitation row's TimelineRowPoint
    └── WeatherIconOverview.tsx     # BarRow renders the secondary percentage when present

tests/
├── unit/
│   ├── openMeteoProvider.test.ts   # + parses/omits precipitation_probability
│   ├── dailyAggregation.test.ts    # + chanceOfRainMax bucket behavior
│   └── timelineData.test.ts        # + precipitation row's chanceOfRain gating (forecast-only, opportunistic)
└── integration/
    └── weatherIconOverview.test.tsx # + renders "70%" under a forecast column's mm value; observed columns show no %
```

**Structure Decision**: Single-project web frontend (unchanged from 001-010). This feature is a
narrow vertical slice through the existing provider → daily-aggregation → timeline-row-building →
rendering pipeline established in 005/008 — no new modules, no new project structure.

## Complexity Tracking

*No constitution violations — table omitted.*
