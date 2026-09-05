# Implementation Plan: Dashboard Polish Round Six

**Branch**: `021-dashboard-polish-round-six` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-dashboard-polish-round-six/spec.md`

## Summary

A bug-fix and polish pass: fixes a real defect where SMHI's forecast-issued timestamp has never
actually reached the UI (the wrong API field name was used), makes the already-working
cross-source forecast averaging visible in the one place it wasn't mentioned (the footer), fixes
a genuine rain-bar baseline misalignment caused by the probability percentage's layout position,
strengthens the location panel's contrast against dark backgrounds, standardizes forecast-icon
sizing between the 7-day strip and the main timeline, and bumps the app version — plus commits to
bumping it on every future round.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: Vite 5, lucide-react, Vitest 2 + Testing Library

**Storage**: N/A (no backend)

**Testing**: Vitest + `@testing-library/react`; live dev-server + Playwright verification for the
CSS/layout fixes and the real-SMHI-field confirmation, matching this session's established
practice — this round's root causes (a wrong field name, a footer wording gap, a flex layout
issue, low shadow contrast) were themselves found via live investigation during planning, not
guessed

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: No change — this round touches parsing of an already-fetched API response
field, CSS, and a version bump; no new network calls

**Constraints**: No backend/server component; must not fabricate data for a genuine gap
(FR-009)

**Scale/Scope**: Touches `smhiProvider.ts`'s forecast-response parsing, the footer's disclosure
text, one CSS layout fix in the timeline's Rain row, one CSS contrast fix for the location panel,
one icon-sizing tweak, and `package.json`'s version

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions (gap-vs-fabrication, unit-conversion-at-display, reusing
existing patterns). No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/021-dashboard-polish-round-six/
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
├── components/     # WeatherIconOverview.tsx, WeeklyForecastStrip.tsx, Footer.tsx
├── services/        # smhiProvider.ts, format.ts
└── index.css

package.json          # version bump
```

**Structure Decision**: Existing single-project structure — no new files; every change is to an
already-existing file (plus the `package.json` version bump).

## Complexity Tracking

*No constitution violations — section not needed.*
