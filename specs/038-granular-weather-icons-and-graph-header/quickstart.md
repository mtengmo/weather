# Quickstart: Validate Granular Weather Icons and Slimmer Graph Header

## Automated validation

```bash
npm test
```

Covers: a low-precipitation, low-chance-of-rain period no longer resolves to rain/snow; a period with no chance-of-rain data still classifies from amount alone; SMHI/MET-Norway symbol codes and raw cloud-cover percentages resolve to two distinct cloud tiers; every icon-affecting call site compiles with the new optional field; the graph view's title renders inline with the window-toggle group.

## Manual validation

1. `npm run dev`, open the dashboard.
2. **Icons (US1)**: find (or mock) a forecast period with a small precipitation amount and a low chance-of-rain figure (e.g. 7%) — confirm it shows a cloud/clear icon, not rain. Find a period with moderate cloud cover and one with heavy/overcast cloud cover — confirm they show two visibly different cloud icons (partly-cloudy vs. cloudy).
3. **Graph header (US2)**: open the Details/graph view on a narrow (mobile-width, e.g. ~375px) browser window — confirm the location title sits inline with the 24h/7-day/30-day buttons, and that row plus the metric tabs scroll horizontally rather than wrapping onto extra lines, leaving more room for the chart. Widen the window back to desktop size and confirm the layout still looks correct and uncluttered.
