# Research: Forecast Precipitation Overlay on the Map

## §1 — Sample points: reuse the pins, don't invent a grid

**Decision**: Use the map's own existing pin set (`favorites` + `cachedLocation`, already
computed in `MapView.tsx`, already capped at `FAVORITES_LIMIT` = 10) as the precipitation sample
points, instead of computing a separate bounding-box grid across the visible map area.

**Rationale**: The spec's own Assumptions describe "a modest set of sampled forecast points
spanning the map's currently visible/pinned area" — the pins already are exactly that set, and
are the locations the user actually cares about (US1: "near my saved places"). Reusing them
avoids: (a) any new geometry/bounding-box code, (b) any ambiguity about grid density or spacing,
and (c) any risk of the fetch count scaling with map zoom/pan (directly satisfies FR-006's
"bounded, not unbounded" requirement, since it's provably capped at the same 10-entry limit
favorites already enforce).

**Alternatives considered**:
- An independent NxN grid across the map's current viewport — rejected: requires new
  bounding-box/grid-spacing logic, and its density would need to scale sensibly across a huge
  range of possible zoom levels (a user's favorites can span the whole country or one city),
  which the spec's "keep it simple, bounded" framing doesn't justify for a first version.

## §2 — Data source: reuse `openMeteoProvider.getForecastOnly`

**Decision**: Fetch each pin's near-term forecast via `openMeteoProvider.getForecastOnly(pin,
"last-24-hours")` (already exported, already used elsewhere for multi-source forecasting) and
read the first forecast entry's `precipitation` value (mm) as that pin's "upcoming hour" sample.

**Rationale**: This is an existing, already-tested function — no new provider code, no new
endpoint. Open-Meteo (unlike SMHI) has no Sweden-only coverage restriction, which matters here
since map pins (favorites) can be anywhere in the world, not just Sweden. Using the SMHI-first
`weatherApi.getObservations` orchestration (as the main per-location views do) would be needless
complexity for a lightweight overlay that doesn't need SMHI's extra precision — a single
consistent global source keeps every pin's circle computed the same way.

**Alternatives considered**:
- `weatherApi.getMultiSourceForecast` (blends SMHI/Open-Meteo/MET Norway) — rejected: over-fetches
  (3 requests per pin instead of 1) for a value that's only ever rendered as a coarse visual
  intensity, not a precise number; the extra precision blending buys isn't visible in a tinted
  circle.

## §3 — Visual rendering: `CircleMarker`, not a raster/heatmap layer

**Decision**: One `react-leaflet` `CircleMarker` per pin with a non-zero forecast, radius and
fill-opacity both scaled by the mm value (capped at a reasonable maximum so one very heavy
reading doesn't dwarf the map), `interactive={false}` so it never intercepts clicks meant for the
pin's own `Marker`/`Popup`, and simply omitted entirely for a pin whose forecast precipitation is
zero/unavailable (FR-003 — no fabricated tint).

**Rationale**: `CircleMarker` is already part of `react-leaflet` (a dependency this app already
has) — no new library, no canvas/heatmap plugin. `interactive={false}` is a built-in Leaflet
option that directly satisfies US2's "must not interfere with pin selection" without any custom
event-handling code.

**Alternatives considered**:
- A dedicated heatmap plugin (e.g. `leaflet.heat`) — rejected: a new runtime dependency for a
  handful of discrete, pin-anchored points is disproportionate; a heatmap's continuous-blend
  visual also implies more spatial precision than 10 discrete sample points actually have,
  which risks misleading the user about coverage between pins.

## §4 — Fetch timing and failure isolation

**Decision**: The precipitation fetch runs in `MapView.tsx`'s own `useEffect`, keyed on the
computed `pins` array, firing all per-pin `getForecastOnly` calls via `Promise.allSettled` — a
rejected/failed pin simply contributes no circle, and the pins/`MapContainer` render is entirely
unconditional on this effect's state (mirrors the "own independent effect, degrade to
empty/absent on failure" pattern already established for UV risk and warnings in
`useObservationData.ts`).

**Rationale**: Directly satisfies FR-007 ("a failure... MUST NOT prevent or delay the map's
existing pins and navigation from working") the same structural way, not just by convention —
the pins array and the precipitation-circle state are entirely independent React state, so one
can never block the other from rendering.
