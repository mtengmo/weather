# Implementation Plan: Combined Weather Icon Overview

**Branch**: `007-weather-icon-overview` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-weather-icon-overview/spec.md`

## Summary

Add a third, separately-navigable view (alongside the existing chart and details views) that shows one recognizable weather icon per time period — per hour for the 24h window, per day for the 7-day window — derived from that period's temperature, precipitation, wind speed, and cloud cover together, using a fixed priority order so exactly one icon is chosen per period. The icon is distinguished for forecast periods and replaced with a "no data" indicator for gaps, and the view's layout uses a responsive grid that scales with the browser window instead of the existing charts' fixed 320px height.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3 (unchanged)

**Primary Dependencies**: Recharts 3.10 (unchanged, unused by this feature). **New**: `lucide-react` — verified as a real, current npm package (checked `npm view`, currently at 1.39.0) providing tree-shakeable SVG icon **components** (not a sprite/font), MIT-licensed. Confirmed by downloading its type declarations that it exports exactly the icons this feature needs under their literal names: `Sun`, `Moon`, `Cloud`, `CloudRain`, `CloudSnow`, `Wind` (plus optional nuance icons `CloudSun`/`CloudMoon` if a later iteration wants a "partly cloudy" state — not required for this feature's 6-condition set). This is the first icon-library dependency in the app; picked over hand-drawn SVGs specifically because spec FR-006 requires *conventional, immediately recognizable* symbols, which a widely-used icon set satisfies by construction (research.md §1).

**Storage**: N/A (unchanged)

**Testing**: Vitest 2 + `@testing-library/react`, under `tests/unit/` and `tests/integration/` (unchanged convention).

**Target Platform**: Browser SPA (unchanged)

**Project Type**: Single-project web frontend (unchanged)

**Performance Goals**: Condition derivation is a cheap, pure per-period computation over at most 24 hourly or 7 daily already-in-memory items — no new network calls, no measurable perf concern.

**Constraints**: Must reuse the existing `isForecast` flag and gap-detection convention (`temperature === null && precipitation === null`, already used in `ObservationDetails.tsx`) rather than inventing new ones, per spec Assumptions and FR-008. Must not alter the existing chart/details views' behavior — this is a strictly additive third view.

**Scale/Scope**: One new service module (condition derivation), one new icon-mapping module, one new view component, and a small `App.tsx` extension to add the third view mode and its navigation entry point.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no project-specific gates to evaluate. No-op, as in every prior feature's plan in this repo.

**Post-design re-check**: The one new dependency (`lucide-react`) is justified directly by a functional requirement (FR-006, conventional recognizable icons) rather than convenience, and is scoped to icon rendering only — no new architectural pattern, state-management approach, or build tooling is introduced.

## Project Structure

### Documentation (this feature)

```text
specs/007-weather-icon-overview/
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
├── services/
│   └── weatherCondition.ts      # New: derives a WeatherCondition (data-model.md) for one
│                                 # period from its temperature/precipitation/windSpeed/
│                                 # cloudCoverPercent, applying the FR-005 priority order and
│                                 # the FR-003 day/night rule
├── components/
│   ├── weatherIcons.tsx         # New: maps a WeatherCondition to its lucide-react icon
│   │                             # component + accessible label (FR-006)
│   └── WeatherIconOverview.tsx  # New: the new view (FR-001/FR-004) — renders the 24h/7d
│                                 # icon grid, the forecast/no-data distinctions (FR-007/FR-008),
│                                 # and the responsive layout (FR-011)
└── App.tsx                       # Extend: add a third view mode alongside "graph"/"details",
                                   # with a navigation entry point (FR-009)

tests/
├── unit/weatherCondition.test.ts          # New
└── integration/weatherIconOverview.test.tsx  # New
```

**Structure Decision**: Same single-project frontend, same module boundaries every prior feature in this repo has used — condition-derivation logic lives in `services/` (pure, testable, no React), rendering lives in `components/`. No new top-level directories; the new view slots in next to `ObservationChart.tsx`/`ObservationDetails.tsx` as a third sibling.

## Complexity Tracking

*No Constitution Check violations — this section is not applicable.*
