# Contract: `WeatherIconOverview.tsx` rendering (rewritten internals, unchanged external contract)

## Unchanged from 007

The component's props (`location`, `window`, `onWindowChange`, `unit`, `series`, `onBack`), its "Overview" navigation entry point in `App.tsx`/`ObservationChart.tsx`/`ObservationDetails.tsx`, and its window toggle (24h/7d only, per 007's spec Edge Cases, still unchanged by this feature) are all untouched (FR-013 — this is a redesign of the same entry point, not a new one).

## Rewritten: internal DOM structure

- A single grid container (research.md §1) with one column per displayed period (hour or day) and one row per: condition icons, temperature, precipitation, wind, cloud cover, and — only when their underlying data is available for at least one period in the series — feels-like, snow, wind gusts (data-model.md, FR-011: a row with zero available periods is omitted entirely, not rendered empty).
- One `<svg>` overlay per line-shaped row (temperature, cloud cover, feels-like if present) drawing a connected polyline across that row's cells, split into an observed segment and a forecast segment (006/007's existing solid/dashed convention, FR-004) that visually join at the boundary the same way 006's chart forecast lines already do.
- One absolutely-positioned "now" indicator spanning the full height of the grid (FR-003), positioned via the same boundary-lookup concept 006 already established (`forecastBoundaryValue`, chartData.ts) rather than a new calculation.
- A Sun & Moon summary rendered once (not as a grid row), using `sunMoon.ts` (contracts/sun-moon.md).
- The grid's outer wrapper scrolls horizontally (`overflow-x: auto`) rather than shrinking columns (FR-008, research.md §6).

## Gap handling (FR-006)

A period with `null` for a given row's underlying value renders that cell as the same visual gap indicator 007 already uses for "no data" periods (reused, not reinvented) — the row itself only disappears entirely per the enrichment-row rule above (zero available periods across the whole series), not for an individual missing period within an otherwise-populated row.
