# Quickstart: Temperature and Wind Map Overlays

## Prerequisites

- `npm install` (if not already done)
- A free OpenWeatherMap account and API key (https://openweathermap.org/api — the free "Weather
  Maps 1.0" tier, no payment) for the Temperature **and** Wind overlays (both use OpenWeatherMap
  tiles as of `research.md` §5). Set it as `VITE_OPENWEATHERMAP_API_KEY` in a local `.env` file
  (not committed). The Rain overlay (RainViewer) needs no key.

## Automated validation

```bash
npm test
```

Expect (per `research.md` §4/§5):
- `tests/integration/mapView.test.tsx` covers: the overlay picker defaults to Rain; selecting
  Temperature/Wind/None swaps the rendered `TileLayer`; pins remain clickable regardless of
  selection; a missing OpenWeatherMap key hides both the Temperature and Wind options instead of
  rendering broken tiles.

## Manual validation

1. `npm run dev` with `VITE_OPENWEATHERMAP_API_KEY` set, open the Map view with at least one
   favorite/recent location.
   - **Expected**: Rain overlay shown by default (unchanged from today).
2. Select the Temperature overlay.
   - **Expected**: A color-coded temperature layer appears over the map; pins remain visible and
     clickable; panning/zooming still works.
3. Select the Wind overlay.
   - **Expected**: A wind-strength layer appears over the same map (same pins, same map instance)
     — not a separate embedded page.
4. Select "None," then switch rapidly between Rain → Wind → Temperature.
   - **Expected**: Exactly one overlay (or none) is visible at each step; no stale layer lingers.
5. Re-run step 1 without `VITE_OPENWEATHERMAP_API_KEY` set.
   - **Expected**: Neither Temperature nor Wind is offered; Rain still works; the map doesn't
     break.
6. Disconnect from the network (or block the OpenWeatherMap domain) while Temperature or Wind is
   selected.
   - **Expected**: The map and pins remain usable; only that overlay's tiles fail to appear.

## Notes

- No new dependencies: both Temperature and Wind reuse the existing `TileLayer` from
  `react-leaflet`, the same as Rain.
- Attribution: OpenWeatherMap requires attribution per its terms — both the Temperature and Wind
  `TileLayer`s carry their own `attribution` prop, the same mechanism the existing Rain layer
  already uses for RainViewer's credit.
- History: Wind originally shipped as an embedded Windy.com iframe (genuinely animated, no key
  needed) but was replaced after the user found a separate embedded page disconnected from the
  rest of the app — see `research.md` §5.
