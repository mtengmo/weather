# Implementation Plan: Restore Rain Chance & Remove Overview Blend Count

**Branch**: `024-restore-rain-chance` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/024-restore-rain-chance/spec.md`

## Summary

Parses SMHI's own `probability_of_precipitation` field (present in SMHI's forecast response but
never read) into `chanceOfRain` on SMHI-sourced forecast observations, so the Rain row's
percentage shows up regardless of which source's forecast the app is currently using — closing a
gap that became more visible once 021-dashboard-polish-round-six's coordinate-rounding fix made
SMHI's own forecast succeed more consistently (previously, a failing SMHI forecast would trigger
the Open-Meteo fallback, which has always had this field, masking the gap). Also removes the
Overview's "(avg)"/"(avg of N)" inline annotation on blended forecast values, per the user's
explicit request that the footer's own source disclosure is enough.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: Vite 5, Vitest 2 + Testing Library

**Storage**: N/A (no backend)

**Testing**: Vitest + `@testing-library/react`

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: No change — parses one already-fetched field, removes a text annotation

**Constraints**: Must not fabricate a rain-probability value when no source genuinely supplies
one (FR-005); restoring the percentage must not reintroduce the pre-021 bar-baseline misalignment
bug (FR-002) — satisfied automatically since the inline-with-the-value JSX layout from
021-dashboard-polish-round-six is untouched, only the underlying data value changes

**Scale/Scope**: Touches `smhiProvider.ts` (parse one new field) and
`WeatherIconOverview.tsx` (remove one inline text annotation)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions (gap-vs-fabrication, reusing existing patterns). No
violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/024-restore-rain-chance/
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
├── components/     # WeatherIconOverview.tsx
└── services/       # smhiProvider.ts
```

**Structure Decision**: Existing single-project structure — no new files; both changes are to
already-existing files.

## Complexity Tracking

*No constitution violations — section not needed.*
