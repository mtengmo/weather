# Contract: Map overlay picker (US1, US2, US3)

## `MapView`'s overlay selection

**Contract**: `MapView` holds one `MapOverlay` state value (`"rain" | "temperature" | "wind" | "none"`,
default `"rain"` on mount — FR-003). A layer-picker control (a `role="group"` button/tab group,
matching the app's existing toggle pattern used elsewhere, such as the Details view's window
toggle) lets the user select among whichever overlays are currently available:

- `"rain"` is always offered when there's at least one pin.
- `"temperature"` and `"wind"` are both offered only when an OpenWeatherMap API key is configured
  — omitted entirely otherwise (see `data-model.md` Configuration), rather than showing a button
  that would only ever render broken (`401`) tiles.
- `"none"` is always offered.

Every overlay value renders inside the same `MapContainer` (pins, base tiles) with at most one
additional `TileLayer` on top, per the table in `data-model.md` — including Wind, which (as of the
follow-up in `research.md` §5) is a plain `TileLayer` like Rain and Temperature, not a separate
embedded page. Never throws; a failed Temperature or Wind tile fetch degrades to that tile simply
not loading (standard `<img>` behavior), never to a broken map (FR-008).

## OpenWeatherMap Temperature tile layer

**Contract**: `TileLayer` with
`url="https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}"`, rendered
above the base map layer, below marker panes (same z-ordering convention as the existing Rain
`TileLayer`), at a reduced opacity for legibility against pins/base map.

## OpenWeatherMap Wind tile layer

**Contract**: `TileLayer` with
`url="https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${apiKey}"`, same
z-ordering/opacity convention as Temperature, gated on the same API key (research.md §5 —
replaces the originally-planned Windy.com embed iframe, which the user found disconnected from
the rest of the app).
