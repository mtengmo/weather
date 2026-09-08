# Implementation Plan: Restore Rain Percentage and Remove Sticky Row-Title Column

**Branch**: `039-rain-percent-sticky-fix` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/039-rain-percent-sticky-fix/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Two independent, small UI fixes to the dashboard timeline (`WeatherIconOverview.tsx` / `src/index.css`): (1) confirm/restore the chance-of-rain percentage shown next to the mm amount on the Rain row for any period where it's available (>0%), decoupled from the unrelated low-confidence rain-icon guard which stays as-is; and (2) stop the per-row title column ("Rain", "Wind", "Temp", "Weather") from staying visually pinned (`position: sticky`) at the left edge while a row's data scrolls horizontally on mobile. Per `research.md`, a code audit found the rain-percentage rendering path itself intact, so the implementation phase must also confirm live data availability (which providers populate `chanceOfRain`) rather than assume a pure display bug.

## Technical Context

**Language/Version**: TypeScript 5.5 (React 18.3, Vite 5.4)

**Primary Dependencies**: React, Recharts (unrelated to this feature), existing internal services (`timelineData.ts`, `weatherCondition.ts`, provider modules)

**Storage**: N/A (client-side rendering of already-fetched forecast/observation data)

**Testing**: Vitest + @testing-library/react (`npm test`); no new tooling required

**Target Platform**: Browser (responsive web app), mobile and desktop widths

**Project Type**: Single-page web application (Vite + React), no separate backend in this repo

**Performance Goals**: N/A — purely presentational change, no measurable performance target

**Constraints**: Must not change the low-confidence rain/snow icon-suppression guard (FR-002); must not regress desktop layout (FR-006); accessibility of row titles must be preserved (FR-005)

**Scale/Scope**: Two components (`WeatherIconOverview.tsx`, `src/index.css`) plus their existing integration test file; no data-model or API changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no project-specific principles have been ratified), so there are no project-specific gates to evaluate. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/039-rain-percent-sticky-fix/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory: this feature has no external interface (API, CLI, schema) — it's a purely internal UI presentation/CSS fix within an existing component.

### Source Code (repository root)

```text
src/
├── components/
│   ├── WeatherIconOverview.tsx   # BarRow (Rain row's mm/% cell), row-title markup
│   └── timelineData.ts           # TimelinePoint.chanceOfRain plumbing (read-only for this feature)
├── services/
│   ├── weatherCondition.ts       # low-confidence guard — unchanged (FR-002)
│   ├── smhiProvider.ts           # chanceOfRain population — audit only, per research.md §1
│   ├── metNoProvider.ts          # chanceOfRain population — audit only, per research.md §1
│   └── openMeteoProvider.ts      # chanceOfRain population — audit only, per research.md §1
└── index.css                     # .weather-timeline-row-title (remove position: sticky)

tests/
└── integration/
    └── weatherIconOverview.test.tsx   # existing sticky-title + rain-chance tests to update
```

**Structure Decision**: Single Vite/React project (no frontend/backend split). All work happens inside the existing `WeatherIconOverview.tsx` component, its stylesheet rule, and its existing integration test file — no new files, modules, or directories are introduced.

## Complexity Tracking

*No constitution violations to justify — table intentionally omitted.*
