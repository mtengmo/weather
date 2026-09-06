# Quickstart: Dashboard Polish, Round Seven

## Automated validation

```bash
TZ=UTC npx vitest run
```

Expect coverage across:
- **US1**: `MapView` renders a radar `TileLayer` when RainViewer's metadata resolves with at
  least one frame; renders none (and pins still render) when the fetch fails or returns empty.
- **US2**: `useGeolocation` prefers a resolved place name over the nearest station's name; falls
  back to the station name when geocoding fails; falls back to the placeholder when both fail.
- **US3**: Every "Back" label is gone; opening the Map from Details, then using "Home," lands on
  the Overview (not back on Details).
- **US4**: Dismissing a warning removes it from the banner and keeps it hidden across a
  re-render/reload (mocked `localStorage`); a different warning id is unaffected.
- **US5**: Symbol codes 8/18/15/25 (and their MET Norway `light*` equivalents) classify as
  `light-rain`/`light-snow`; 9/10/19/20/16/17/26/27 (and unprefixed/`heavy*` MET Norway codes)
  classify as `heavy-rain`/`heavy-snow`; the mm-threshold fallback (no symbol code) also splits
  light vs. heavy.
- **US6**: The precipitation and snow rows each render as two separate row elements, bars-only
  then values-only, with matching column counts.
- **US7**: `LineRow` renders tick labels/gridlines at 5°-step values spanning the data's own
  min/max, using the same Y positions the polyline itself uses.

## Manual / live validation (Playwright, per this session's established practice)

1. `npm run dev`.
2. **Map/radar**: open the Map view; confirm a radar imagery layer is visible (or, if radar
   coverage happens to show nothing over the current pins, confirm no console errors and pins
   still work); pan/zoom and click a pin's "View" button to confirm normal behavior.
3. **Location name**: grant current-location access somewhere with a resolvable place name;
   confirm the header shows a place name, not a station name.
4. **Home**: from the Overview, open Details, then the Map from there; confirm the control reads
   "Home" and returns to the Overview (not Details).
5. **Warnings**: load a location with an active warning; dismiss it; reload the page; confirm it
   stays hidden while still active.
6. **Icons**: compare a lightly-rainy period against a heavily-rainy one (and light vs. heavy
   snow, if in season) across the 24h/3-day/7-day views; confirm visibly different icons.
7. **Rain chart**: confirm the precipitation (and snow, if present) row renders as two rows — bars
   only, then values only, aligned by column.
8. **Temperature chart**: confirm a visible degree scale sticks to the left edge while scrolling,
   with gridlines at each labeled value.
