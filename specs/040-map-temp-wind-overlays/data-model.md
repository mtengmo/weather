# Phase 1 Data Model: Temperature and Wind Map Overlays

No persisted/stored entities — this feature is client-side UI state plus three third-party data
sources already reachable over HTTPS.

## `MapOverlay` (new, client-side UI state only)

A union of the three selectable overlays plus "none," held as local component state in
`MapView.tsx` (mirrors how `radarTileUrl` is already local state today):

| Value | Meaning | Rendered as |
|-------|---------|-------------|
| `"rain"` | The existing live radar layer (unchanged) | `TileLayer` fed by RainViewer's latest frame |
| `"temperature"` | New | `TileLayer` fed by OpenWeatherMap's `temp_new` tiles |
| `"wind"` | New | The `MapContainer` area is replaced by the Windy embed `iframe` (see `research.md` §3) |
| `"none"` | No overlay | Base map + pins only |

- Default value on mount: `"rain"` (FR-003, preserves current behavior).
- Exactly one value is active at a time (FR-002) — this is a plain enum-like selection, not a set.

## Existing entities touched (unchanged shape)

- **`Location` / `FavoritePlace`** (`src/models/types.ts`): unchanged — still just used to place
  pins on the base map. The Wind overlay (Windy embed) does not receive individual pins; it's
  centered using the same `pins[0]` coordinate `MapView` already computes for the base map's
  `center`.

## External data shapes (not owned by this app)

- **RainViewer** `weather-maps.json` — unchanged, already modeled in `MapView.tsx`'s
  `RainviewerResponse`/`RainviewerFrame` types.
- **OpenWeatherMap tile response** — an opaque PNG image per `{z}/{x}/{y}`; no JSON shape to
  model, just a URL template: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid={key}`.
- **Windy embed** — an opaque HTML document loaded via `iframe src`; no data shape, just a URL
  with query parameters for center/zoom/layer (see `contracts/map-overlays.md`).

## Configuration (new)

- **OpenWeatherMap API key**: a client-side config value (Vite env var, e.g.
  `VITE_OPENWEATHERMAP_API_KEY`), not a data entity. When absent, the Temperature overlay option
  is omitted from the picker entirely (FR-008's "must still work" applied to a missing key, same
  spirit as a failed fetch) rather than rendering broken/`401` tiles.
