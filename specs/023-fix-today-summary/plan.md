# Implementation Plan: Fix Today Summary's Backward-Looking Condition

**Branch**: `023-fix-today-summary` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-fix-today-summary/spec.md`

## Summary

Fixes the persistent "Today" summary card to derive its condition/description/high/low from the
forward-looking `(now, now+24h]` daily bucket instead of the backward-looking `(now-24h, now]`
bucket it currently reads — the confirmed root cause of the reported mismatch, where the card
read "Cloudy" (dominated by an already-past cloudy stretch) while the hourly forecast shown
alongside it was clear. A one-line change to which bucket index counts as "today."

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: Vite 5, Vitest 2 + Testing Library

**Storage**: N/A (no backend)

**Testing**: Vitest + `@testing-library/react`

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: No change — reuses already-computed `weeklyDays` data, only changes which
index is read

**Constraints**: Must preserve the existing no-forecast fallback (FR-003) — when a location has no
forecast data at all, "Today" continues to summarize the most recent observed day; must not alter
any other day's card (FR-004) — `weeklyDays` itself and the 7-day strip's own day list are untouched

**Scale/Scope**: Touches only `WeatherIconOverview.tsx`'s `todayIndex` computation (a single
`useMemo`-free inline IIFE, ~4 lines)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions (gap-vs-fabrication, reusing existing patterns). No
violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/023-fix-today-summary/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md              # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
src/
└── components/WeatherIconOverview.tsx
```

**Structure Decision**: Existing single-project structure — one existing file changes, no new
files.

## Complexity Tracking

*No constitution violations — section not needed.*
