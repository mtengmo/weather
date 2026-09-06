# Implementation Plan: Dashboard Polish, Round Seven

**Branch**: `032-dashboard-polish-round-seven` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/032-dashboard-polish-round-seven/spec.md`

## Summary

Seven independent changes, each touching a small, contained part of the existing codebase:

1. **Radar (US1)**: Replace `031-map-precipitation-overlay`'s `CircleMarker` overlay in
   `MapView.tsx` with a real radar imagery `TileLayer`, sourced from RainViewer's free, key-free
   public tile API (confirmed reachable during specification) — a one-time metadata fetch for the
   latest frame path, then a standard Leaflet tile layer, non-blocking on failure.
2. **Location naming (US2)**: In `useGeolocation.ts`, fetch reverse-geocoded place name and
   nearest-station name in parallel, preferring the place name.
3. **Home button (US3)**: Rename every "Back" button to "Home" in `App.tsx`; change `closeMap` to
   always call `viewOverview()` instead of restoring `previousView`.
4. **Dismissible warnings (US4)**: A new `useWarningDismissal` hook (localStorage-backed, mirrors
   existing preference hooks) filters `warnings` before `WarningBanner` ever sees them; the banner
   gains a per-warning dismiss control.
5. **Icon intensity (US5)**: Extends `WeatherCondition` with `light-rain`/`heavy-rain` (replacing
   `rainy`) and `light-snow`/`heavy-snow` (replacing `snowy`) — classified from SMHI's/MET
   Norway's own symbol codes (which already encode light/moderate/heavy) where available, falling
   back to an mm threshold otherwise (Open-Meteo, or any point with no symbol code).
6. **Rain chart split (US6)**: `BarRow` in `WeatherIconOverview.tsx` splits its single bar+text
   row into two: a bars-only row and a values-only row directly beneath it, sharing the same
   column grid — applied uniformly to both the precipitation and snow rows, since both already
   share this one component.
7. **Temperature Y-axis (US7)**: `LineRow` gains a sticky-left degree scale (5°-step ticks) and
   matching horizontal gridlines, computed from the same min/max range `buildSegments` already
   derives for the polyline itself.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: Leaflet 1.9 / react-leaflet 4.2 (already a dependency, `TileLayer`
already used for the base map) — no new runtime dependency for any of the seven stories.

**Storage**: `localStorage` for warning dismissals (US4), mirroring every other client-side
preference this app already persists this way (favorites, theme, units, high/low visibility).

**Testing**: Vitest + `@testing-library/react` per story — unit tests for the symbol-code→
intensity mapping (US5) and the degree-scale tick generation (US7); integration tests for the
radar tile layer's presence/failure-isolation (US1), the naming preference (US2), Home's
consistent destination (US3), dismiss-then-reload persistence (US4), and the split rain-chart
rows (US6).

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: US1 adds one small JSON metadata fetch per Map view open (RainViewer's own
`weather-maps.json`), then ordinary tile requests Leaflet already knows how to batch/cancel — no
material change to page-load cost elsewhere.

**Constraints**: Every story must degrade gracefully on its own failure without affecting the
others or any pre-existing behavior (US1's radar failure leaves the map/pins working; US2's
geocoding failure falls back to the station name exactly as today; US4's dismissal is purely
additive — a user who never dismisses anything sees no behavior change, per spec Assumptions).

**Scale/Scope**: Touches `MapView.tsx`, `useGeolocation.ts`, `App.tsx`, `WarningBanner.tsx`,
`weatherCondition.ts`, `smhiProvider.ts`, `metNoProvider.ts`, `weatherIcons.tsx`,
`WeatherIconOverview.tsx`, `index.css`; adds one new hook (`useWarningDismissal.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions (localStorage-only client state, non-blocking/
independent-failure data fetches, reusing existing symbol-code classification infrastructure
rather than inventing a parallel one, never fabricating a value for missing data). No violations
to track.

## Project Structure

### Documentation (this feature)

```text
specs/032-dashboard-polish-round-seven/
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
├── MapView.tsx              # US1: TileLayer (RainViewer) replaces CircleMarker overlay
├── mapPrecipitationVisual.ts # US1: removed — no longer used once the circle overlay is gone
├── WarningBanner.tsx         # US4: per-warning dismiss control
├── weatherIcons.tsx          # US5: new light/heavy rain+snow icon entries
├── WeatherIconOverview.tsx   # US5 (ConditionRow badge unaffected), US6 (BarRow split),
│                             # US7 (LineRow degree scale)
└── App.tsx                   # US3: Back -> Home, closeMap -> viewOverview

src/hooks/
├── useGeolocation.ts          # US2: prefer reverse-geocoded name
└── useWarningDismissal.ts     # NEW (US4): localStorage-backed dismissal set

src/services/
├── weatherCondition.ts        # US5: light/heavy rain+snow conditions, mm-threshold fallback
├── smhiProvider.ts             # US5: Wsymb2 codes mapped to light/heavy tiers
└── metNoProvider.ts            # US5: "light"/"heavy" substring classification

src/index.css                  # US5 color rules, US6/US7 layout CSS
```

**Structure Decision**: Existing single-project structure. `mapPrecipitationVisual.ts`
(introduced in `031-map-precipitation-overlay`) is removed as part of US1, since the feature it
supported is being replaced, not extended — its own unit tests are removed with it.

## Complexity Tracking

*No constitution violations — section not needed.*
