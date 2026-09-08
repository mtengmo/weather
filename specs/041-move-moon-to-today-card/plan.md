# Implementation Plan: Declutter Timeline Header and Move Moon Phase to the Today Card

**Branch**: `041-move-moon-to-today-card` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/041-move-moon-to-today-card/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Remove the "Data: SMHI" note and the Sunrise/Sunset line that sit directly above the Overview timeline (`WeatherIconOverview.tsx`'s `dataSourceNote` paragraph and `SunMoonSummary` component), and add the moon phase to the Today card (`TodaySummaryCard.tsx`), which already shows Sunrise/Sunset independently. Purely a presentation change over already-computed values (`getSunTimes`/`getMoonPhase` in `sunMoon.ts`); no new data, no external interfaces, no other view affected (the Details/graph view's own separate data-source note and the footer's own disclosure are untouched).

## Technical Context

**Language/Version**: TypeScript 5.5 (React 18.3, Vite 5.4)

**Primary Dependencies**: None new — reuses existing `src/services/sunMoon.ts` functions and existing component structure

**Storage**: N/A

**Testing**: Vitest + @testing-library/react (`npm test`); updates existing tests in `tests/integration/weatherIconOverview.test.tsx`

**Target Platform**: Browser (responsive web app)

**Project Type**: Single-page web application (Vite + React)

**Performance Goals**: N/A — presentation-only change, no measurable performance target

**Constraints**: Must not affect the Details/graph view's own data-source note or the footer's disclosure (FR-005/FR-003)

**Scale/Scope**: Two components (`WeatherIconOverview.tsx`, `TodaySummaryCard.tsx`) plus their existing integration tests; no data-model, service-logic, or API changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no project-specific principles have been ratified), so there are no project-specific gates to evaluate. No violations to justify.

**Post-design re-check**: Unchanged — still no ratified gates.

## Project Structure

### Documentation (this feature)

```text
specs/041-move-moon-to-today-card/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory: this feature has no external interface — it's an internal UI
relocation within existing components.

### Source Code (repository root)

```text
src/
├── components/
│   ├── WeatherIconOverview.tsx   # Remove dataSourceNote paragraph + SunMoonSummary above the timeline
│   └── TodaySummaryCard.tsx      # Add Moon phase to the existing Sunrise/Sunset detail row
└── services/
    └── sunMoon.ts                 # getMoonPhase/getSunTimes — read-only for this feature

tests/
└── integration/
    └── weatherIconOverview.test.tsx   # Existing sun/moon and data-source-note tests to update
```

**Structure Decision**: Single Vite/React project. All work happens inside two existing components
and their existing integration test file — no new files, modules, or directories.

## Complexity Tracking

*No constitution violations to justify — table intentionally omitted.*
