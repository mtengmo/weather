# Quickstart: Dashboard Polish Round Five

## Prerequisites

```sh
npm ci
npm run dev
```

Select a real SMHI-covered location. For US1/US3, view the app at a time when "today" has some
early-morning (00:00-06:00) data already recorded, or simulate via a mocked series.

## US1 — 3-day observations

1. Open the "3 Days" tab. **Expect**: every period with underlying observed data shows real
   values, including the earliest hours of "today" (00:00-06:00) if the location has data there —
   no gap for that stretch specifically.

## US2 — No forecast-source picker; always-averaged forecast

1. Inspect the header. **Expect**: no "Forecast sources" control.
2. With both providers returning forecast data for a period, **expect**: a single averaged value
   shown for that period (not two side-by-side values, and not a stale single-source-only value).

## US3 — "Now" line and day-boundary line alignment

1. Open the 3-day view. **Expect**: each day-boundary line falls exactly at the border between
   the last column of one day and the first column of the next, not shifted into either column.
2. Check the "Now" line similarly, on any view with a forecast boundary. **Expect**: it sits
   exactly at the observed/forecast transition column, not shifted.

## US4 — Consolidated navigation

1. From the Overview, click "Details." **Expect**: a "Details" button, landing on the details
   table with a "Back" button.
2. Click "Back." **Expect**: lands on the Overview (not the graph).
3. From the Overview, click "Details" then look for a way to reach the graph. Confirm the graph
   view (if reached) also shows "Details" and "Back" consistently labeled/positioned, with "Back"
   landing on the Overview.
4. Compare header layout across Overview, graph, and Details. **Expect**: consistent
   placement/labeling of equivalent controls.

## US5 — 7-day forecast brief

1. Open the Overview for a location with 14 days of combined observed+forecast data. **Expect**:
   the persistent forecast-brief strip shows at most 7 cards, anchored on today and the days
   ahead.

## US6 — Forecast freshness

1. With a forecast showing, check the footer. **Expect**: a single, clear "last updated" time for
   the forecast, without needing to open any menu.

## US7 — Details page icons

1. Open Details (24-hour window). **Expect**: a "Condition" column showing the same style of
   weather icon the Overview's timeline uses, at a consistent size.

## US8 — Mobile pass

1. Open the app in a phone-sized viewport (e.g. 390×844). Walk through: select a location, switch
   tabs, open Details, open Map. **Expect**: every control reachable, all text legible, no
   unintended page-level horizontal scroll.

## Automated checks

```sh
npm test
npm run lint
npm run build
```
