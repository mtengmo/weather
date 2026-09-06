# Implementation Plan: Severe Weather Warnings

**Branch**: `028-severe-weather-warnings` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-severe-weather-warnings/spec.md`

## Summary

Adds a new SMHI-only data fetch (the Impact-Based Weather Warnings feed — the full national list
of currently-published warnings, each carrying a GeoJSON boundary, a severity level, bilingual
title/description, and a validity period), filters it down to the warnings whose boundary
contains the viewed location (via a small hand-rolled point-in-polygon check — no new runtime
dependency) and whose validity window covers "now," and renders the result as a new, small,
collapsible banner region above the existing tab controls. Absent/failed/out-of-coverage cases
all resolve to "no banner," rendering the page byte-identical to today.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: Vite 5, Vitest 2 + Testing Library; no new runtime dependency — the
GeoJSON point-in-polygon check is implemented as a small standard ray-casting function (well
inside what this codebase already hand-rolls elsewhere, e.g. `haversineKm` in `smhiProvider.ts`)

**Storage**: N/A (no backend; per-load fetch only, same as every other weather data source)

**Testing**: Vitest + `@testing-library/react` (unit tests for point-in-polygon matching against
both `Polygon` and `MultiPolygon` fixtures, severity ordering, and validity-window filtering;
integration test asserting the banner appears/doesn't appear and expands correctly); live
Playwright verification against the real warnings endpoint before merging

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: One additional per-location-load fetch of the full national warnings
list (confirmed via a live sample to be a modest JSON payload — a handful of active warnings
nationwide at any given time), fired in parallel with existing fetches via its own independent
effect — no measurable added load time.

**Constraints**: Must never block or delay the rest of the overview (FR-008) — same "own effect,
independent failure" pattern as `027-uv-index-alert`'s UV fetch and `025-reduce-api-requests`'s
nearby-station fetch. Must show no banner (not an empty/broken one) for non-Swedish locations
(FR-007) or fetch failures (FR-008). Must never surface a warning outside its own validity
window (FR-006).

**Scale/Scope**: One new provider function (`smhiProvider.getActiveWarnings`), one small
point-in-polygon geometry helper, one new hook effect in `useObservationData`, one new banner
component (`WarningBanner.tsx`) rendered near the top of the overview, plus CSS.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions (per-source try/catch degrade-to-empty, independent
non-blocking fetch effects, no new runtime dependency for a task this codebase already hand-rolls
elsewhere). No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/028-severe-weather-warnings/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md              # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
src/services/
├── smhiProvider.ts        # + getActiveWarnings(): full-list fetch, degrade to [] on failure
├── weatherApi.ts          # + getWarningsForLocation(location): coverage gate + point-in-polygon filter + validity filter + severity sort
└── geo.ts                 # NEW: pointInPolygon(point, geometry) — Polygon/MultiPolygon ray-casting helper

src/hooks/
└── useObservationData.ts  # + its own independent effect/fetch, mirrors 027's UV-risk pattern

src/components/
└── WarningBanner.tsx       # NEW: collapsed summary (severity + title) → expand for full list/description

src/App.tsx                  # renders <WarningBanner warnings={warnings} /> directly below the
                              # header — persistent across Overview/Details/Graph/Map (not gated
                              # to one tab), since a safety warning must stay visible regardless
                              # of which view the user is currently on (spec FR-002)

src/index.css                # banner styling (severity colors, all three themes)
```

**Structure Decision**: Existing single-project structure, plus two small new files
(`geo.ts`, `WarningBanner.tsx`) that follow this codebase's existing one-concern-per-file
convention (`sunMoon.ts`, `feelsLike.ts` are similarly small, single-purpose service modules).

## Complexity Tracking

*No constitution violations — section not needed.*
