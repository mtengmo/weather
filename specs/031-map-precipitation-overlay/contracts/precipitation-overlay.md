# Contract: Map precipitation overlay

## `MapView`'s precipitation fetch

**Contract**: When `pins.length > 0`, `MapView` fetches, once per distinct `pins` array
(identity/content change), each pin's forecast via `openMeteoProvider.getForecastOnly(pin,
"last-24-hours")` in parallel (`Promise.allSettled`). A pin is added to `precipitationByPin` only
when its fetch fulfilled AND its first forecast entry's `precipitation` is a positive number.
Never throws, never blocks the component's own render — `pins`/`MapContainer`/`Marker` rendering
proceeds identically regardless of this fetch's timing or outcome.

## `CircleMarker` overlay rendering

**Contract**: For each pin present in `precipitationByPin`, one `CircleMarker` is rendered
centered on that pin's coordinates, with `interactive={false}` (never intercepts pointer events),
and radius/opacity monotonically increasing with the mm value (capped at a fixed maximum visual
intensity). A pin absent from `precipitationByPin` gets no `CircleMarker` at all — never a
zero-radius or zero-opacity placeholder.

## Non-interference with existing pin behavior

**Contract**: Every `Marker`/`Popup`/"View" button pair already in `MapView.tsx` today continues
to render and behave identically regardless of this feature's fetch state — this feature adds
`CircleMarker` siblings only, never wrapping, replacing, or altering the existing `Marker`
elements or `onSelectLocation` call.
