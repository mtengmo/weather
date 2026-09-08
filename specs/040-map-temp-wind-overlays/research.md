# Phase 0 Research: Temperature and Wind Map Overlays

## 1. Temperature overlay data source

**Decision**: OpenWeatherMap's free "Weather Maps 1.0" tile API (`temp_new` layer):
`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid={key}` — a Leaflet `TileLayer`,
the same pattern as the existing Rain overlay.

**Rationale**: Confirmed live (`curl`): the endpoint responds and sets
`Access-Control-Allow-Origin: *`, so it's safe for direct client-side tile loading. It requires a
free API key (a free OpenWeatherMap account, no payment), which per the spec's Assumptions is
acceptable — a client-embedded key for a free-tier map-tile service is standard practice and not
"building a backend." No live gridded temperature product was found that's both free and
key-free (Open-Meteo, this app's other primary source, has no map-tile product at all — confirmed
by inspecting its docs — only point-forecast JSON).

**Alternatives considered**:
- Open-Meteo: rejected — no tile/raster map product exists, only point JSON per coordinate; would
  require building our own gridding/rendering pipeline, which is a much bigger lift than "easy."
- A second RainViewer-style key-free provider for temperature: none found with comparable
  reliability/coverage to OpenWeatherMap's long-established tile product.

## 2. Wind overlay: comparing the two candidate approaches (per spec Assumptions)

**Decision**: Ship the **embedded Windy.com iframe** (`https://embed.windy.com/embed2.html?...`)
for the animated Wind overlay. The custom on-map `leaflet-velocity` + NOAA-data approach was
prototyped far enough to rule out — see below.

### 2a. leaflet-velocity + NOAA GFS wind data (rejected)

Tested live: NOAA's NOMADS GRIB-filter endpoint (the only free, no-signup source of GFS
wind-vector data, and the one `leaflet-velocity`'s expected data pipeline is built around) —

```
curl -I "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?dir=...&file=...&var_UGRD=on&var_VGRD=on&..."
```

— returns `200` with the raw GRIB2 binary, but **carries no `Access-Control-Allow-Origin` header
at all**. A browser `fetch()` from this app's own origin would be blocked by CORS; the file could
only be retrieved by a server we control, i.e. a backend proxy. That directly violates the
"no backend" constraint (spec Assumptions), so this path is not viable as specified, independent
of the further work `leaflet-velocity` would need anyway (a GRIB2-to-JSON conversion step, which
`leaflet-velocity`'s own README confirms has no existing free public API — only a
convert-it-yourself tool, `grib2json`).

**Conclusion**: Not pursued further. Limiting the query to the Nordic countries (as the user
suggested) shrinks the GRIB payload but does not solve the CORS blocker, which is the actual
disqualifying issue.

### 2b. Windy.com embed iframe (chosen)

Tested live: `https://embed.windy.com/embed2.html?lat=59.0&lon=16.0&detailLat=59.0&detailLon=16.0&width=650&height=450&zoom=5&level=surface&overlay=wind&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`
returns `200`, plain HTML, with no `X-Frame-Options` or `Content-Security-Policy: frame-ancestors`
header restricting embedding — i.e. it's freely embeddable in an `<iframe>` from any origin, no
API key, no signup. This is Windy's standard public embed product (the same one countless
hobby/news sites use), showing the genuine WebGL animated wind-particle visualization the user
wants, for the whole globe (no Nordic-only limitation needed).

**Rationale**: The only approach of the two that is simultaneously (a) genuinely animated,
(b) free with no signup, and (c) achievable with no backend. Confirmed working via a live request,
not just documentation.

**Trade-off accepted** (per spec Assumptions, User Story 2 acceptance scenario 2): the Wind
overlay is a separate embedded mini-map (Windy's own UI, pan/zoom, and branding), not a layer
merged into this app's own Leaflet map/pins — switching to the Wind overlay replaces the map
area with the Windy embed rather than adding a layer on top of the existing map. This is a
visible seam the user should be aware of, but is the honest outcome of the "no backend" constraint
ruling out the alternative.

**Alternatives considered**:
- `leaflet-velocity` + NOAA data — rejected, see §2a (CORS-blocked without a backend).
- `leaflet-velocity` + a third-party pre-converted wind-JSON mirror (e.g. old `earth`-project
  forks occasionally hosted on GitHub Pages) — rejected: no such mirror was found to be currently
  live/maintained; depending on one would be fragile and outside this app's control, worse than
  RainViewer's own maintained public API.
- A static OpenWeatherMap `wind_new` tile layer (same pattern as Temperature) — rejected as the
  *primary* choice per the user's explicit request for real animation, but noted here as the
  natural fallback if Windy's embed product ever becomes unavailable or unsuitable.

## 3. Reconciling the embed with "one overlay at a time" (FR-002) and pin selection (FR-006/US3)

**Decision**: The Wind "overlay" is implemented as a full replacement of the map area (the Windy
iframe swapped in for the `MapContainer`), rather than a Leaflet `TileLayer` layered on top of it,
whereas Rain and Temperature remain `TileLayer`s on the existing `MapContainer`. All three still
present as one mutually-exclusive selection (a layer picker control), satisfying FR-002 from the
user's point of view even though Wind's implementation differs structurally from the other two.

**Rationale**: Since the Wind overlay's content isn't a Leaflet tile layer at all, there's no way
to render it inside the same `MapContainer` as the pins. Swapping the visible map area for the
Windy embed (with a clear way back to the pin map, e.g. re-selecting Rain or Temperature) is the
simplest faithful implementation of "an overlay you can pick," and matches spec Assumption/US2
acceptance scenario 2's acknowledgment that Wind won't be merged into the existing map/pins.

**Alternatives considered**: Rendering the Windy iframe as a floating panel *alongside* the pin
map (both visible at once) — rejected as more complex and not clearly better; it would also
violate FR-002's "exactly one overlay visible" framing by showing two maps simultaneously.

## 4. Testing approach (as originally planned, §2b-era)

**Decision**: Use Vitest + Testing Library for the overlay-selection logic (which `TileLayer`/
iframe renders for a given selection, that pins still render/select correctly, that a failed
Temperature tile fetch doesn't break the map) — same conventions as the existing
`tests/integration/mapView.test.tsx`. The live third-party services themselves (RainViewer,
OpenWeatherMap, Windy) are not covered by automated tests, consistent with how the existing Rain
overlay's own tests mock `fetch` rather than hitting the real RainViewer API.

**Rationale**: Matches existing project convention; no new test tooling needed. (Superseded in
spirit by §5 below — the iframe is gone, but the same testing conventions still apply to the
replacement `TileLayer`.)

## 5. Follow-up: replacing the Windy embed with a static on-map layer

**Decision**: After shipping §2b's Windy.com embed, the user tried it and rejected it: "the windy
map wasn't so nice, as it's embedd[ing] another site." Replaced with a static OpenWeatherMap
`wind_new` `TileLayer` (`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid={key}`)
merged into the app's own `MapContainer`, using the same API key already required for Temperature
— i.e. §2a/§2b's "Alternatives considered" fallback (a static OWM tile layer) is now the shipped
approach, not animation.

**Rationale**: This is a values trade-off the user made explicitly, not a new technical
constraint — consistency with the rest of the map (same pins, same map instance, same visual
language as Rain/Temperature) mattered more than the animated visual. The `leaflet-velocity` +
NOAA path from §2a remains ruled out for the reason already documented (no CORS support, would
need a backend); this follow-up doesn't reopen that path, it just deprioritizes animation
entirely in favor of staying merged into the app's own map.

**Consequence**: FR-005/FR-006 and User Story 2 in `spec.md` were updated to describe a static,
on-map wind-strength layer instead of an animated embed; the "Nordic-only coverage" contingency
(originally scoped for a from-scratch animated build) is moot, since OpenWeatherMap's tiles are
globally covered like Temperature's. §3's "reconciling the embed with one-overlay-at-a-time"
concern is also moot — Wind is now a plain `TileLayer` alongside Rain/Temperature, no special
full-map-replacement structure needed.
