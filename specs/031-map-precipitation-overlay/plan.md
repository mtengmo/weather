# Implementation Plan: Forecast Precipitation Overlay on the Map

**Branch**: `031-map-precipitation-overlay` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/031-map-precipitation-overlay/spec.md`

## Summary

Rather than sampling an arbitrary grid across the visible map, this reuses the map's own existing
pin set (`favorites` + `cachedLocation` — already displayed, already bounded at
`FAVORITES_LIMIT` = 10 entries) as the sample points: for each pin, fetch its next-hour forecast
precipitation via the same `openMeteoProvider.getForecastOnly` call already used elsewhere in the
app, and render a semi-transparent `CircleMarker` under that pin, sized/colored by the forecast
amount — invisible (no circle at all) when the forecast is zero (FR-003). This satisfies the
spec's "modest set of sampled forecast points spanning the map's currently visible/pinned area"
(Assumptions) with no new grid-bounding-box math and a naturally bounded, one-shot fetch
(FR-006/FR-007), fired once when the Map view's pin set is known, independent of the pins'
own render — a fetch failure leaves pins/navigation completely unaffected (US3).

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: Leaflet 1.9 / react-leaflet 4.2 (already a dependency) — `CircleMarker`
is part of the existing library, no new package

**Storage**: N/A (per-view fetch only)

**Testing**: Vitest + `@testing-library/react` (react-leaflet's `MapContainer` already renders in
this app's existing `mapView.test.tsx` suite); unit tests for the mm→circle-radius/opacity
mapping; integration tests for "no circle when precipitation is zero/unavailable" and "a fetch
failure still renders all pins"

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: At most `FAVORITES_LIMIT` (10) additional forecast-only fetches, fired in
parallel once per Map view open — the same order of magnitude as the nearby-station comparison
fetches already used elsewhere in the app.

**Constraints**: Must never block or delay pin rendering (FR-007) — the overlay's own fetch runs
after/alongside pin computation, in its own effect, with `Promise.allSettled` semantics so one
pin's failure doesn't blank the others; must not add any interaction that competes with a pin's
existing click-to-select behavior (US2) — the precipitation circle is `interactive={false}` so
clicks pass through to the pin/map beneath it.

**Scale/Scope**: One new provider function reuse (no new provider code — `getForecastOnly`
already exists), one new small helper (mm → visual intensity mapping), and a change to
`MapView.tsx` to fetch per-pin precipitation and render `CircleMarker`s.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions (reuse an existing fetch function rather than add a new
provider; bounded, independent, non-blocking fetch pattern already used for nearby-stations/UV/
warnings). No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/031-map-precipitation-overlay/
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
└── MapView.tsx         # + per-pin precipitation fetch (own effect) + CircleMarker overlay

src/services/
└── openMeteoProvider.ts  # no change — existing getForecastOnly is reused as-is
```

**Structure Decision**: Existing single-project structure — no new files; the overlay logic lives
inside `MapView.tsx` itself, since it's specific to that one view and small enough not to warrant
a separate module.

## Complexity Tracking

*No constitution violations — section not needed.*
