# Quickstart: Dashboard Usability Fixes

## Prerequisites

- `npm install` already run in the repo root.
- A Swedish (SMHI-covered) location and a non-Nordic location (e.g. Paris) both reachable, for
  User Stories 6 and 7.

## Setup

```bash
npm run dev
```

## Validation Scenarios

### Scenario 1 — View a search result directly (User Story 1)

1. Open "Change location," search for a place not already in favorites.
2. **Expected**: each result shows both "View" and "Add to favorites." Clicking "View" switches
   the app to that location without adding it to favorites; the favorites list is unchanged.

### Scenario 2 — Retry current location after denying permission (User Story 2)

1. Deny the browser's location-permission prompt on first load.
2. Open "Change location."
3. **Expected**: a "Use current location" option is present. Selecting it re-triggers the
   permission flow; granting it this time shows that location's weather.

### Scenario 3 — 7-day Overview fills a wide screen (User Story 3)

1. Open the 7-day Overview on a wide (laptop) viewport.
2. **Expected**: the seven day-columns stretch to use the available width, no large empty area to
   the right. Narrow the viewport until the columns would be illegibly small; confirm it falls back
   to horizontal scrolling. Confirm the 24-hour view's layout is unaffected either way.

### Scenario 4 — High/Low on the Overview (User Story 4)

1. Turn on "High/Low on" in the header.
2. Open the 7-day Overview.
3. **Expected**: the temperature row shows each day's high/low alongside the average (e.g.
   `17°C (20°/14°)`). Turn the toggle off; confirm it reverts to the plain average.

### Scenario 5 — Nearby stations hidden on the Overview (User Story 5)

1. Open the Overview.
2. **Expected**: the "Nearby stations" control is not in the header.
3. Click "Back to graph"; confirm it reappears and still works.

### Scenario 6 — Nordic-first search results (User Story 6)

1. Search for a place name with both a Nordic and non-Nordic match (e.g. a common town name).
2. **Expected**: Nordic result(s) appear before non-Nordic ones; nothing is missing from the list.

### Scenario 7 — Combine forecast sources (User Story 7)

1. Turn on "Combine forecast sources" (new header control).
2. Open a location where both SMHI and Open-Meteo would have forecast data.
3. **Expected**: the temperature chart shows an averaged forecast line plus each source's own
   forecast line, all distinctly colored. Observed (historical) data is unchanged.
4. Turn the toggle on for a location only one source ever covers; confirm nothing changes there.

### Scenario 8 — Sub-day detail for the first two days (User Story 8)

1. Open the 7-day Overview.
2. **Expected**: the first two days are each broken into 5 sub-day columns (morning/lunch/
   afternoon/evening/night); days 3-7 remain single columns each, unchanged.

## Automated Coverage

- `tests/unit/geocodingApi.test.ts` — Nordic-first sort; non-Nordic results retained.
- `tests/unit/timelineData.test.ts` — high/low points on the daily temperature row; sub-day
  periods for days 1-2, unchanged daily buckets for days 3+.
- `tests/unit/dailyAggregation.test.ts` — `toSubDayAndDailyBuckets`'s bucket boundaries and
  aggregation math.
- `tests/unit/weatherApi.test.ts` — `getMultiSourceForecast`'s per-source fail-soft behavior.
- `tests/unit/chartData.test.ts` — `buildMultiSourceForecastRows`'s per-timestamp averaging.
- `tests/integration/appHeader.test.tsx` — View action, current-location retry, nearby-stations
  visibility per view.
- `tests/integration/weatherIconOverview.test.tsx` — fill-width class, high/low display, sub-day
  periods.
- `tests/integration/chartAndDetails.test.tsx` — combine-forecast-sources toggle and rendering.

Run `npm test` for the full suite. Manual visual verification (Scenarios 3, 6, 7, 8) benefits from
the Playwright setup already proven working in this repo's prior polish phases (008-013).
