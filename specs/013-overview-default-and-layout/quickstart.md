# Quickstart: Overview Default, Location Panel, and Graph Readability

## Prerequisites

- `npm install` already run in the repo root.
- A location with both SMHI and Open-Meteo-fallback scenarios reachable if possible (any Swedish
  location for SMHI; a non-Swedish location, e.g. Paris, to see the Open-Meteo-only path).

## Setup

```bash
npm run dev
```

## Validation Scenarios

### Scenario 1 — App opens on the Overview (User Story 1)

1. Load the app fresh (clear `localStorage` first, or use a private window) with geolocation
   allowed, or with a cached/favorite location present.
2. **Expected**: the Overview timeline is the first view shown — not the line graph.
3. Click "Back to graph"; confirm the classic graph view opens.

### Scenario 2 — Location switching lives in a panel (User Story 2)

1. On a laptop-width viewport, look at the header.
2. **Expected**: a single "Change location" control, not separate always-visible search/favorites
   sections.
3. Click it; confirm a panel opens containing current-location, favorites, and search together.
4. Search for a place and add it to favorites; confirm the panel stays open and the new favorite
   appears in the list.
5. Select a favorite; confirm the app switches to it and the panel closes.
6. Reopen the panel and press Escape (or click outside it); confirm it closes without changing the
   selected location.
7. Repeat on a narrow (mobile-width) viewport; confirm the panel remains usable.

### Scenario 3 — Timeline opens centered on "now" (User Story 3)

1. On a narrow viewport, open the Overview for a location with a forecast (so a "now" boundary
   exists) and enough hourly columns to overflow the visible width.
2. **Expected**: the "now" column is visible without manually scrolling.
3. Switch to the 7-day window and back; confirm the 24-hour view re-centers correctly.
4. Try a location/window with no forecast data; confirm the timeline opens at its default (left)
   scroll position, unchanged from before this feature.

### Scenario 4 — Data source note (User Story 4)

1. Open a Swedish location (SMHI-covered); confirm a visible note reads "Data: SMHI" (or, if that
   location's forecast happens to need the fallback, "Data: SMHI (forecast: Open-Meteo)").
2. Open a non-Swedish location (e.g. search "Paris"); confirm the note reads "Data: Open-Meteo".
3. Confirm the note is visible on both the graph and Overview views without hovering.

### Scenario 5 — Mirrored axis and point dots (User Story 5)

1. Open the graph view, switch to the "Rain", "Wind", or "Cloud coverage" metric tab (whichever
   currently shows only a left-edge scale).
2. **Expected**: the same scale now also appears on the right edge.
3. On any chart, confirm each hour's (or day's) data point has a small visible dot, not just the
   connecting line — and that forecast-segment dots look visually distinct from observed-segment
   dots (dashed/reduced-opacity line convention carrying through to the dots).
4. Confirm the temperature chart's existing left-temp/right-precipitation two-axis layout is
   unchanged (still two distinct scales, not a mirrored duplicate).

### Scenario 6 — Observed high/low note (User Story 6)

1. Open the temperature chart for a window with a mix of observed values.
2. **Expected**: a note identifies the single highest and single lowest observed temperature and
   roughly when each occurred.
3. Switch to a window/location where all data is forecast (no observed points); confirm the note
   is absent.
4. Switch between the 24-hour, 7-day, and 30-day windows; confirm the note updates for whichever
   window is currently displayed.

## Automated Coverage

- `tests/unit/weatherApi.test.ts` — `primarySource` set correctly across all three provider paths.
- `tests/unit/chartData.test.ts` — `findObservedExtremes`: correct high/low; excludes forecast
  points; returns `null` for an all-forecast or empty series; ties resolve to the first occurrence.
- `tests/integration/appHeader.test.tsx` — default view is Overview; LocationPanel open/select/
  dismiss behavior; adding/removing a favorite keeps the panel open.
- `tests/integration/weatherIconOverview.test.tsx` — center-on-now scroll behavior (structural:
  asserts `scrollLeft` after render, matching the existing wheel-scroll test's approach to
  scrollable-container assertions); data-source note rendering.
- `tests/integration/chartAndDetails.test.tsx` — mirrored right-edge axis presence; dot markers
  present; data-source note; observed high/low note.

Run `npm test` for the full suite. Manual visual verification (Scenarios 2, 3, 5) benefits from the
Playwright setup already proven working in this repo's prior polish phases (008-012).
