# Quickstart: Dashboard Polish Round Six

## Prerequisites

```sh
npm ci
npm run dev
```

Select a real SMHI-covered location (e.g. Stockholm).

## US1 — Real SMHI forecast timestamp

1. Open the footer. **Expect**: the "updated" time shown is close to SMHI's own published
   forecast-issue time for that location (compare against SMHI's own app/site, or a direct fetch
   of `opendata-download-metfcst.smhi.se/.../data.json`'s `referenceTime` field), not simply
   "whenever this page happened to load."

## US2 — Visible cross-source blending

1. With a forecast period where both sources have data, **expect**: the timeline shows an
   `(avg)`-suffixed value (already working).
2. Check the footer. **Expect**: it now also names both sources (e.g. "SMHI + Open-Meteo
   forecast") when blending is active, not just the observation source.

## US3 — Rain bar baseline

1. Find a period with a rain-probability percentage and a neighboring period without one.
   **Expect**: both bars' bottoms align at the same height; the percentage appears on the same
   line as the mm value, not pushing the bar upward.

## US4 — Location panel contrast

1. Open "Change location" in the default theme. **Expect**: the panel's edge is clearly visible
   against the page behind it.

## US5 — Icon consistency

1. Compare a day's icon in the 7-day forecast strip against the same condition's icon on the main
   timeline. **Expect**: matching size.

## US6 — Version bump

1. Check the footer's version number. **Expect**: higher than before this round shipped.

## Automated checks

```sh
npm test
npm run lint
npm run build
```
