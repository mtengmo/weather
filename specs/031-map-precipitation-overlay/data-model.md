# Data Model: Forecast Precipitation Overlay on the Map

## New local state (`src/components/MapView.tsx`)

### `PinPrecipitation` (internal, component-local shape)

| Field | Type | Notes |
|---|---|---|
| `key` | `string` | `${latitude},${longitude}` — matches the existing `Marker`'s own `key` convention in `MapView.tsx`. |
| `mm` | `number` | The pin's next-hour forecast precipitation, from `getForecastOnly`'s first forecast entry. Only present for a pin whose fetch succeeded and returned a non-null, positive value — a pin with zero/unavailable precipitation simply has no entry (data-model validation rule below), not a zero-valued one, since both render identically (no circle) and there's no reason to carry a distinguishable "explicit zero" case. |

Held as `Map<string, number>` (pin key → mm) in a single `useState`, populated once per
`pins`-array change via the effect described in research.md §4.

## Relationships

```
favorites + cachedLocation  →  pins: Location[]  (already existing MapView.tsx computation, unchanged)
        │
        ▼
useEffect keyed on `pins`
        │  Promise.allSettled(pins.map(pin => openMeteoProvider.getForecastOnly(pin, "last-24-hours")))
        ▼
precipitationByPin: Map<string, number>   (pin key → mm; only successful, positive results included)
        │
        ▼
pins.map(pin => <CircleMarker ... />)   — rendered only when precipitationByPin.has(pin key)
```

## Validation rules

- `precipitationByPin` never contains a pin whose fetch failed, returned no forecast data, or
  whose forecast precipitation was zero — all three collapse to "no entry," which the rendering
  layer treats identically (FR-003, FR-007): no circle drawn.
- The pins array (and therefore the `Marker`/`Popup` set) is never derived from or gated on
  `precipitationByPin` — it's computed exactly as it is today, independent of whether the
  precipitation fetch has completed, is still in flight, or failed entirely.
