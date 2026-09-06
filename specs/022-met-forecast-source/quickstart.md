# Quickstart: MET Norway Forecast Source & Richer Conditions

## Prerequisites

```sh
npm ci
npm run dev
```

Select a real, well-covered Swedish location (e.g. Stockholm).

## US1 — MET Norway as a third source

1. Open DevTools → Network, reload. **Expect**: a request to
   `api.met.no/weatherapi/locationforecast/2.0/compact?...` succeeds (200), alongside the existing
   SMHI/Open-Meteo requests.
2. Open the footer. **Expect**: if MET Norway's own `updated_at` is the most relevant timestamp to
   show, it appears there (comparable to a direct fetch of the same MET Norway URL's
   `properties.meta.updated_at`), otherwise the existing SMHI/sync-time rules apply unchanged.

## US2 — 7-day strip icon colors

1. View the persistent 7-day forecast strip. **Expect**: each day's icon is colored (sun
   yellow/gold, rain blue, snow pale blue, etc.), matching the same condition's color on the main
   timeline — not a flat/uncolored icon.

## US3 — More distinguishable conditions

1. Find (or mock) a forecast period where a source's symbol code indicates thunderstorm, fog, or
   sleet. **Expect**: that period shows its own distinct icon and color, not collapsed into
   cloudy/rainy/snowy.
2. Check the same condition appears identically colored/iconed on the main timeline, the 7-day
   strip, and the Details table's Condition column.
3. Find a period with no symbol code from any contributing source. **Expect**: it still classifies
   using the existing six-condition threshold logic, unaffected.

## US4 — Per-source series and Overview indicator

1. Open the Details/graph view, switch to the 7-day window, Temperature tab. **Expect**: each
   contributing source (SMHI/Open-Meteo/MET Norway) renders its own dashed line, plus a bold
   combined-average line — matching what the 24-hour Temperature tab already showed before this
   round.
2. Switch to the Rain and Wind tabs. **Expect**: the same per-source-lines pattern now appears
   there too.
3. On the Overview, find a period blended from 3 sources. **Expect**: its value shows `(avg of 3)`
   rather than the plain `(avg)` used for a 2-source blend.

## Automated checks

```sh
npm test
npm run lint
npm run build
```
