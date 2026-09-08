# Implementation Plan: Keep Scroll Position When Switching the Time Window

**Branch**: `042-preserve-scroll-on-window-change` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/042-preserve-scroll-on-window-change/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

The scroll jump traces to `useObservationData.ts`'s primary effect resetting `series`/`weeklySeries` to `null` on every `window` change — including a window-only change with the same location — which makes the Overview/Details/graph views briefly collapse to a one-line "Loading…" message, causing the browser to clamp scroll near the top. Fix: only reset to `null` on a genuine location change (tracked via a ref comparing coordinates); on a window-only change, keep showing the previous window's data until the new fetch resolves, adding an optional `isRefreshing` flag consumers may use for a subtle in-place indicator. No consuming component's rendering logic needs to change — their existing `series !== null` guards stay correct.

## Technical Context

**Language/Version**: TypeScript 5.5 (React 18.3, Vite 5.4)

**Primary Dependencies**: None new — a behavior change to the existing `useObservationData` hook

**Storage**: N/A

**Testing**: Vitest (`npm test`); extends `tests/unit/useObservationData.test.ts` (already exists)

**Target Platform**: Browser (responsive web app)

**Project Type**: Single-page web application (Vite + React)

**Performance Goals**: N/A — no new network calls; same fetches, different state-reset timing

**Constraints**: Must not change any consuming component's props/rendering contract (research.md §2's blast-radius check); a genuine location change must still show the existing "Loading…" state, unaffected

**Scale/Scope**: One hook (`src/hooks/useObservationData.ts`) plus its existing unit test file; no component changes required, no data-model changes beyond one new optional boolean field

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no project-specific principles have been ratified), so there are no project-specific gates to evaluate. No violations to justify.

**Post-design re-check**: Unchanged — still no ratified gates.

## Project Structure

### Documentation (this feature)

```text
specs/042-preserve-scroll-on-window-change/
├── plan.md                             # This file (/speckit-plan command output)
├── research.md                         # Phase 0 output (/speckit-plan command)
├── data-model.md                       # Phase 1 output (/speckit-plan command)
├── quickstart.md                       # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── use-observation-data.md         # Phase 1 output (/speckit-plan command)
└── tasks.md                            # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
└── hooks/
    └── useObservationData.ts   # Location-vs-window-change distinction, isRefreshing flag

tests/
└── unit/
    └── useObservationData.test.ts   # Existing file, extended with window-change/location-change cases
```

**Structure Decision**: Single Vite/React project. All work happens inside one existing hook and
its existing unit test file — no new files, modules, components, or directories. No component
(`WeatherIconOverview.tsx`, `ObservationChart.tsx`, `ObservationDetails.tsx`, `Footer.tsx`) needs
to change (research.md §2's blast-radius check).

## Complexity Tracking

*No constitution violations to justify — table intentionally omitted.*
