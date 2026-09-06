# Contract: Radar layer (US1) and location naming (US2)

## `MapView`'s radar layer

**Contract**: On mount (when `pins.length > 0`), fetches RainViewer's `weather-maps.json` once.
When the response has at least one `radar.past` frame, renders a Leaflet `TileLayer` using that
latest frame's tile URL, above the base `TileLayer`, at reduced opacity, `zIndex` above the base
layer but below marker panes (so pins/popups remain fully usable — FR-003). When the fetch fails
or returns no frames, renders no radar layer at all — the base map and pins are unaffected
(FR-004). Never throws.

## `useGeolocation`'s naming preference

**Contract**: Once coordinates resolve, `reverseGeocode(coords)` and `getNearestStations(coords,
1)` are both attempted (independently — one's failure doesn't block the other). The location's
`displayName` becomes, in order: the reverse-geocoded place name if non-null; otherwise the
nearest station's own name if usable; otherwise the existing `"Unnamed station"` placeholder.
Once `status` is `"granted"`, further name updates only ever *improve* the display name (never
revert to a worse one), matching this hook's existing update-in-place behavior.
