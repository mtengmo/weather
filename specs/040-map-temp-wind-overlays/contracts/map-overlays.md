# Contract: Map overlay picker (US1, US2, US3)

## `MapView`'s overlay selection

**Contract**: `MapView` holds one `MapOverlay` state value (`"rain" | "temperature" | "wind" | "none"`,
default `"rain"` on mount — FR-003). A layer-picker control (e.g. a small button/tab group,
matching the app's existing `role="group"` toggle pattern used elsewhere, such as the Details
view's window toggle) lets the user select among whichever overlays are currently available:

- `"rain"` and `"temperature"` are always offered when there's at least one pin (`"temperature"`
  is omitted entirely if no OpenWeatherMap API key is configured — see `data-model.md`
  Configuration).
- `"wind"` is always offered (no key required).
- `"none"` is always offered.

Selecting a value other than `"wind"` renders the existing `MapContainer` (pins, base tiles) with
at most one additional `TileLayer` on top, per the table in `data-model.md`. Never throws; a
failed Temperature tile fetch degrades to that tile simply not loading (standard `<img>`
behavior), never to a broken map (FR-008).

Selecting `"wind"` replaces the `MapContainer` with the Windy embed `iframe`
(`https://embed.windy.com/embed2.html?...`, centered on the same coordinate `MapView` already uses
for the base map's `center`, `overlay=wind`), sized to the same visible area. Pins are not shown
inside the Windy embed (FR-006 applies only to the app's own map, not the embedded one — see
`research.md` §3's accepted trade-off). Re-selecting any other overlay value restores the
`MapContainer` (pins, existing behavior) exactly as it was before switching to `"wind"`.

## OpenWeatherMap Temperature tile layer

**Contract**: `TileLayer` with
`url="https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}"`, rendered
above the base map layer, below marker panes (same z-ordering convention as the existing Rain
`TileLayer`), at a reduced opacity for legibility against pins/base map.

## Windy embed URL

**Contract**: The `iframe`'s `src` is built from the same `center` coordinate `MapView` already
computes, with a fixed `zoom` matching the base map's own default zoom (5), and `overlay=wind`,
`type=map`, `metricWind=default`. No API key required (research.md §2b).
