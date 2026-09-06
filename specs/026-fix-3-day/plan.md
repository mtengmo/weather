# Implementation Plan: Fix 3-Day "Observed" Mislabel & Add Weekday Labels

**Branch**: `026-fix-3-day` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-fix-3-day/spec.md`

## Summary

Fixes `timelineData.ts`'s `boundaryIndex` helper, which conflated "no forecast at all" and "no
observed data at all" into the same `null` return value — both then rendered identically as
"Observed, 100% width, no Forecast section" in `WeatherIconOverview.tsx`, which is only correct
for one of the two cases. Distinguishes them by allowing `boundaryIndex` to return `-1`
specifically for "everything is forecast," and reworks the section-header rendering to derive
explicit Observed/Forecast visibility and widths from an "observed column count" rather than a
single derived percentage that couldn't represent zero cleanly. Also adds a weekday label above
each day's group of 5 sub-day period columns (Morning through Night) on the 3-day view, reusing
the exact same index-based day-grouping convention (`i % 5 === 0`) the existing day-boundary
marker already relies on.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: Vite 5, Vitest 2 + Testing Library

**Storage**: N/A (no backend)

**Testing**: Vitest + `@testing-library/react`; live Playwright verification already performed
during specification (confirmed the exact bug: "OBSERVED SECTION WIDTH: 100%" with every visible
period's own label reading e.g. "RainForecast")

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: No change — same data, corrected rendering logic only

**Constraints**: Must not change the hourly (24h) or 7-day view's own Observed/Forecast rendering,
which today never hits the "zero observed" edge case in practice but must remain byte-identical
for the normal cases (FR-002, FR-003); must not fabricate a weekday for a period whose date can't
be determined (never the case in practice, since every period already carries a real `key`
timestamp)

**Scale/Scope**: Touches `timelineData.ts` (`boundaryIndex`) and `WeatherIconOverview.tsx` (the
section-header render logic, plus one new weekday-label row)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions (gap-vs-fabrication, reusing existing index-based
day-grouping pattern, live-verification-before-fix). No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/026-fix-3-day/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md              # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
src/components/
├── timelineData.ts
└── WeatherIconOverview.tsx
```

**Structure Decision**: Existing single-project structure — no new files; both changes are to
already-existing files.

## Complexity Tracking

*No constitution violations — section not needed.*
