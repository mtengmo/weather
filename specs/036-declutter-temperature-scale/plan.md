# Implementation Plan: Coarser Temperature Timeline Scale

**Branch**: `036-declutter-temperature-scale` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/036-declutter-temperature-scale/spec.md`

## Summary

The temperature row of the dashboard's weather timeline overview (`WeatherIconOverview.tsx`) currently generates degree-scale labels and horizontal reference lines at a 5-degree step, rounded outward from each period's own min/max. This feature widens that step to 10 degrees and anchors the step sequence at a fixed 0° origin (rather than rounding outward from the data's own range), always showing a labeled 0° line even when the period's data never reaches zero. No other row (wind/rain/cloud) or chart is affected.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: None new — change is confined to existing inline SVG rendering in `WeatherIconOverview.tsx` (no charting library involved for this row's gridlines/labels)

**Storage**: N/A

**Testing**: Vitest + React Testing Library (existing `tests/unit` suite)

**Target Platform**: Web (Vite-built SPA), existing dashboard

**Project Type**: Single-project web app (`src/`)

**Performance Goals**: N/A — pure rendering logic change, no measurable performance impact

**Constraints**: Must not change the wind/rain/cloud rows or the temperature line/fill/high-low indicators; must preserve existing label-overlap safeguards

**Scale/Scope**: Single component (`WeatherIconOverview.tsx`), its tick-generation helper functions, and their unit tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Project constitution (`.specify/memory/constitution.md`) is an unfilled template with no concrete principles defined — no gates to evaluate against. No violations possible; nothing to justify.

## Project Structure

### Documentation (this feature)

```text
specs/036-declutter-temperature-scale/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory: this feature has no external interface (API, CLI, schema) — it is a pure client-side rendering change to one existing component.

### Source Code (repository root)

```text
src/
├── components/
│   ├── WeatherIconOverview.tsx   # buildTicks(), TEMPERATURE_TICK_STEP, LineRow — changed here
│   └── ...
└── ...

tests/
└── integration/
    └── weatherIconOverview.test.tsx   # existing test file covering this component — updated here
```

**Structure Decision**: Single existing project structure (`src/`, `tests/integration/`). No new directories or modules — this is a targeted edit to `WeatherIconOverview.tsx`'s tick-generation logic (`TEMPERATURE_TICK_STEP`, `buildTicks`) and its existing test file.

## Complexity Tracking

*No constitution violations — section not applicable.*
