# Implementation Plan: Timeline Polish and Header Consolidation

**Branch**: `009-timeline-polish-and-header` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-timeline-polish-and-header/spec.md`

## Summary

Four independent slices: (1) consolidate the app header — drop the standalone "Weather History"
title row, move `PlaceSearch`/`FavoritesList` into `<header className="app-header">` alongside the
existing controls; (2) simplify the timeline — remove the cloud-cover and feels-like rows, fold
gust into the wind row as `12 (18) m/s` with both values rounded to whole numbers; (3) fix three
008-era defects — force a locale-independent 24-hour hour-label format, add wheel-to-horizontal
scroll support so a plain mouse (not just trackpad) can pan the timeline, and interpolate the
single "now" boundary column when it has no direct reading; (4) persist the last-viewed location
in `localStorage` (mirroring the existing `units.ts`/`theme.ts` preference-persistence pattern) and
restore it on load instead of always re-running the default geolocation flow.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3, Vite 5

**Primary Dependencies**: Existing `App.tsx`/`LocationSwitcher`/`PlaceSearch`/`FavoritesList`
components, existing `timelineData.ts`/`WeatherIconOverview.tsx` (008), existing `units.ts`-style
`localStorage` preference pattern

**Storage**: `localStorage`, one new key for the cached location (client-side only, no backend)

**Testing**: Vitest 2 + `@testing-library/react`, matching this repo's existing unit/integration split

**Target Platform**: Browser (GitHub Pages static SPA)

**Project Type**: Single-project web frontend (unchanged)

**Performance Goals**: N/A beyond existing profile — no new network calls; interpolation and
header changes are O(1)/O(n) over already-fetched data

**Constraints**: No new dependencies; must not fabricate data beyond the single-neighbor
interpolation explicitly scoped by FR-012/FR-013; `localStorage` unavailability must degrade
gracefully (Edge Cases)

**Scale/Scope**: Touches `App.tsx`, `LocationSwitcher.tsx` (styling only), `PlaceSearch.tsx`/
`FavoritesList.tsx` (relocated, not rebuilt), `timelineData.ts`, `WeatherIconOverview.tsx`,
`src/index.css`, plus one new `locationCache.ts` service

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no ratified gates apply.
Proceeding per established conventions: graceful `localStorage` degradation (units.ts precedent),
no fabricated data beyond explicit neighbor-interpolation, and reusing existing components rather
than rebuilding them.

## Project Structure

### Documentation (this feature)

```text
specs/009-timeline-polish-and-header/
├── plan.md               # This file (/speckit-plan command output)
├── research.md           # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   ├── location-cache.md
│   └── timeline-changes.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── models/
│   └── types.ts                    # + no new fields (LocationCache reuses Location shape)
├── services/
│   └── locationCache.ts            # NEW — get/set last-viewed Location in localStorage
├── components/
│   ├── App.tsx                     # header consolidation; wires locationCache on select/load
│   ├── timelineData.ts             # row removal (cloud/feelsLike), wind+gust merge,
│   │                                #   boundary-column interpolation (24h view only),
│   │                                #   locale-independent hour label
│   └── WeatherIconOverview.tsx     # removes LineRow(cloud)/LineRow(feelsLike) call sites,
│                                    #   WindRow renders combined speed(gust), interpolated
│                                    #   points render with a distinct visual marker
└── index.css                       # header layout rules, interpolated-point styling

tests/
├── unit/
│   ├── locationCache.test.ts       # NEW
│   └── timelineData.test.ts        # + row removal, wind+gust formatting, interpolation, hour label
└── integration/
    ├── weatherIconOverview.test.tsx  # + no cloud/feelsLike rows, combined wind+gust rendering,
    │                                  #   interpolated "now" marker
    └── observationFlow.test.tsx or a new App-level test    # + header consolidation,
                                                              #   cached-location restore on load
```

**Structure Decision**: Single-project web frontend (unchanged from 001-011). Four independent
vertical slices through existing files, plus one small new service module for the location cache
(mirrors `units.ts`'s existing single-purpose preference-persistence pattern).

## Complexity Tracking

*No constitution violations — table omitted.*
