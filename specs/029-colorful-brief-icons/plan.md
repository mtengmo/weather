# Implementation Plan: Colorful Daily Brief Icon

**Branch**: `029-colorful-brief-icons` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/029-colorful-brief-icons/spec.md`

## Summary

`TodaySummaryCard`'s icon wrapper (`.today-summary-icon`) renders the same `WEATHER_ICONS[...]`
component every other view already renders in color, but never gets the
`weather-condition-{condition}` class the app's existing per-condition color CSS
(`010-timeline-visual-styling`) keys off of — so it inherits the page's default (monochrome)
text color instead. The fix is to add that one class to the wrapper, reusing styling that
already exists and is already themed for all three of the app's visual themes; no new CSS rules,
colors, or icons are introduced.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: none new

**Storage**: N/A

**Testing**: Vitest + `@testing-library/react` — an integration test asserting the Today card's
icon wrapper carries the `weather-condition-{condition}` class matching its derived condition,
for a representative condition (e.g. `clear-day`); existing snapshot/rendering tests must
continue to pass unchanged (layout, size, and position are untouched).

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: N/A — a class-name change only, no new computation or fetch.

**Constraints**: Must not change the icon's shape, size, or position (FR-004's "same as
before" success criterion); must remain legible across all three existing themes (already
guaranteed by the existing `--wx-*` CSS variables, which are already defined per-theme).

**Scale/Scope**: One-line change to `src/components/TodaySummaryCard.tsx`'s icon wrapper — no
other file needs to change, since the color styling itself already exists in `src/index.css`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions (reuse existing styling rather than duplicate it). No
violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/029-colorful-brief-icons/
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
└── TodaySummaryCard.tsx   # .today-summary-icon wrapper gains the weather-condition-{condition} class
```

**Structure Decision**: Existing single-project structure — a change to one already-existing
file; no new files.

## Complexity Tracking

*No constitution violations — section not needed.*
