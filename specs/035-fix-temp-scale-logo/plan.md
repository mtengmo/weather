# Implementation Plan: Fix Temperature Scale Layout and Add Header Logo

**Branch**: `035-fix-temp-scale-logo` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/035-fix-temp-scale-logo/spec.md`

## Summary

Moves the temperature chart's sticky degree-scale ticks from their own column *after* the row
title (where they currently sit flush against/over the "Temperature (°C)" text) into the row
title's own sticky 7rem box, as a narrow sub-column to the *left* of a shortened "Temp (°C)"
label — preserving every row's shared 7rem title width (and therefore the cross-row column
alignment `computeYScale`/the "now" marker depend on). Adds a minimum-vertical-gap filter so
adjacent tick *labels* never render closer together than their own text height allows (gridlines
stay untouched — every 5° step still gets a line, only crowded labels are thinned). Separately,
adds the already-generated `public/icon-192.png` Tengmo Väder logo (034-rebrand-tengmo-vader) as a
small `<img>` in the app header, visible on every view.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: None new

**Storage**: N/A

**Testing**: Vitest + `@testing-library/react` integration tests in
`tests/integration/weatherIconOverview.test.tsx` (row title text, tick DOM structure/count) and a
new assertion in `tests/integration/appHeader.test.tsx` (logo `<img>` present)

**Target Platform**: Static SPA, GitHub Pages (vader.tengmo.com)

**Project Type**: Single front-end web app

**Performance Goals**: N/A — no new network requests (logo reuses the already-built
`public/icon-192.png`)

**Constraints**: The temperature row's title column MUST stay exactly 7rem wide, matching every
other row's title column — this is what keeps the "now" marker and period columns pixel-aligned
down the page across rows (008 research.md §1; `.weather-timeline-row-title` at
`src/index.css:889`). The degree-scale therefore moves *inside* that existing 7rem box rather than
occupying additional width before it.

**Scale/Scope**: `src/components/WeatherIconOverview.tsx` (row-title JSX restructure, tick
min-gap filter function), `src/index.css` (retarget `.weather-timeline-temp-scale` from its own
sticky/left:7rem column to a relatively-positioned sub-box inside `.weather-timeline-row-title`),
`src/App.tsx` (header `<img>`), `src/index.css` (`.app-logo` rule).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond this
repo's own established conventions (preserve the shared-column-alignment invariant called out in
008's research.md; reuse the already-generated icon asset rather than adding a new binary). No
violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/035-fix-temp-scale-logo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md              # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
src/components/WeatherIconOverview.tsx   # row-title JSX restructure; tick min-gap filter
src/index.css                             # .weather-timeline-row-title (temperature variant),
                                           # .weather-timeline-temp-scale retarget, .app-logo
src/App.tsx                               # <img className="app-logo"> in the header

tests/integration/weatherIconOverview.test.tsx  # "Temp" label text; tick spacing assertions
tests/integration/appHeader.test.tsx            # logo <img> present
```

**Structure Decision**: No new files — restructures existing JSX/CSS in place.

## Complexity Tracking

*No constitution violations — section not needed.*
