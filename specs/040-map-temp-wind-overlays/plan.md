# Implementation Plan: Temperature and Wind Map Overlays

**Branch**: `040-map-temp-wind-overlays` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/040-map-temp-wind-overlays/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add Temperature and Wind as two new selectable overlays on the Map view, alongside the existing Rain radar overlay, with exactly one active at a time (default: Rain). Temperature is a `TileLayer` fed by OpenWeatherMap's free `temp_new` tiles (client-embedded API key, same "no backend" pattern as the existing RainViewer-fed Rain layer). Wind is delivered as an embedded Windy.com iframe rather than a layer on the app's own map: per `research.md`, the natural custom-built alternative (`leaflet-velocity` fed by NOAA's GFS wind data) was tested live and found to be CORS-blocked for direct browser access, which would require a backend proxy — ruled out by the "no backend" constraint. The Windy embed needs no key, no signup, and delivers genuine animated wind, at the cost of being a separate embedded mini-map rather than a layer merged with the app's own pins.

## Technical Context

**Language/Version**: TypeScript 5.5 (React 18.3, Vite 5.4)

**Primary Dependencies**: `react-leaflet`/`leaflet` (already a dependency, reused for the Temperature `TileLayer`); no new npm dependency for Wind (a plain `iframe`)

**Storage**: N/A (client-side rendering of third-party tile/embed URLs)

**Testing**: Vitest + @testing-library/react (`npm test`); extends existing `tests/integration/mapView.test.tsx`

**Target Platform**: Browser (responsive web app)

**Project Type**: Single-page web application (Vite + React), no backend in this repo — and this feature must not introduce one

**Performance Goals**: N/A — tile/embed loading follows the same pattern as the existing Rain overlay; no new performance target

**Constraints**: No backend/server component may be introduced (spec Assumptions) — this is the binding constraint that ruled out the client-side `leaflet-velocity` + NOAA approach (research.md §2a); exactly one overlay visible at a time (FR-002); existing map/pin behavior must not regress (FR-006/US3)

**Scale/Scope**: One component (`MapView.tsx`) plus its stylesheet and integration test; no data-model or backend changes; one new client-side config value (an OpenWeatherMap API key)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no project-specific principles have been ratified), so there are no project-specific gates to evaluate. No violations to justify.

**Post-design re-check**: Unchanged — still no ratified gates. The one constraint that came from the spec itself ("no backend") was treated as binding throughout Phase 0/1 and is reflected in the chosen Wind approach (research.md §2).

## Project Structure

### Documentation (this feature)

```text
specs/040-map-temp-wind-overlays/
├── plan.md                          # This file (/speckit-plan command output)
├── research.md                      # Phase 0 output (/speckit-plan command)
├── data-model.md                    # Phase 1 output (/speckit-plan command)
├── quickstart.md                    # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── map-overlays.md              # Phase 1 output (/speckit-plan command)
└── tasks.md                         # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── MapView.tsx        # Overlay picker + Rain/Temperature TileLayers + Windy iframe
└── index.css               # Overlay-picker control styling, iframe sizing

tests/
└── integration/
    └── mapView.test.tsx    # Existing radar/pin tests to extend with overlay-selection cases
```

**Structure Decision**: Single Vite/React project (no frontend/backend split, and this feature must not introduce one). All work happens inside the existing `MapView.tsx` component, its stylesheet, and its existing integration test file — no new files, modules, or directories beyond an optional `.env.example` documenting the new `VITE_OPENWEATHERMAP_API_KEY` variable.

## Complexity Tracking

*No constitution violations to justify — table intentionally omitted.*
