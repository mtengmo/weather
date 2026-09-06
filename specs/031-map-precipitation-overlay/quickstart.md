# Quickstart: Forecast Precipitation Overlay on the Map

## Prerequisites

- At least one favorite location saved, ideally one currently forecast rain and one not, to
  exercise both the "circle shown" and "no circle" paths. Checking a live Open-Meteo forecast for
  a couple of candidate cities beforehand helps pick good test locations.

## Automated validation

```bash
TZ=UTC npx vitest run
```

Expect new/updated tests in `tests/integration/mapView.test.tsx` covering:
- A pin with positive forecast precipitation renders a `CircleMarker`; a pin with zero/no data
  renders none.
- Every existing pin/`Marker`/"View" interaction still works unchanged (non-regression check).
- A rejected `getForecastOnly` call for one pin doesn't prevent other pins (or their own circles)
  from rendering.

## Manual / live validation (Playwright, per this session's established practice)

1. `npm run dev`.
2. Add 2-3 favorite locations, ideally with different current rain forecasts.
3. Open the Map view; confirm a tinted circle appears under any pin with forecast rain, sized
   roughly by amount, and no circle under a dry pin.
4. Click a pin's popup "View" button; confirm it still selects that location exactly as before.
5. Pan and zoom the map; confirm no errors and no extra network requests are triggered by the
   pan/zoom itself.
6. Take a screenshot for the PR/verification record.
