# Quickstart: Temperature and Wind Map Overlays

## Prerequisites

- `npm install` (if not already done)
- A free OpenWeatherMap account and API key (https://openweathermap.org/api — the free "Weather
  Maps 1.0" tier, no payment) for the Temperature overlay. Set it as `VITE_OPENWEATHERMAP_API_KEY`
  in a local `.env` file (not committed). The Wind (Windy embed) and Rain (RainViewer) overlays
  need no key.

## Automated validation

```bash
npm test
```

Expect (per `research.md` §4):
- `tests/integration/mapView.test.tsx` covers: the overlay picker defaults to Rain; selecting
  Temperature/Wind/None swaps the rendered layer/iframe; pins remain clickable regardless of
  selection; a missing OpenWeatherMap key hides the Temperature option instead of rendering
  broken tiles.

## Manual validation

1. `npm run dev` with `VITE_OPENWEATHERMAP_API_KEY` set, open the Map view with at least one
   favorite/recent location.
   - **Expected**: Rain overlay shown by default (unchanged from today).
2. Select the Temperature overlay.
   - **Expected**: A color-coded temperature layer appears over the map; pins remain visible and
     clickable; panning/zooming still works.
3. Select the Wind overlay.
   - **Expected**: The map area is replaced by an embedded, animated Windy map centered on the
     same location, showing moving wind particles.
4. Select "None," then switch rapidly between Rain → Wind → Temperature.
   - **Expected**: Exactly one overlay (or none) is visible at each step; no stale layer lingers.
5. Re-run step 1 without `VITE_OPENWEATHERMAP_API_KEY` set.
   - **Expected**: The Temperature option is not offered; Rain and Wind still work; the map
     doesn't break.
6. Disconnect from the network (or block the OpenWeatherMap domain) while Temperature is selected.
   - **Expected**: The map and pins remain usable; only the temperature tiles fail to appear.

## Notes

- No new dependencies are required for the Windy embed (it's a plain `iframe`). No new dependency
  is required for the Temperature tiles (reuses the existing `TileLayer` from `react-leaflet`).
- Attribution: OpenWeatherMap and Windy both require attribution per their terms — add a small
  credit line/link the same way the existing Rain overlay already credits RainViewer.
