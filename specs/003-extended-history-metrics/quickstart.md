# Quickstart: Extended History Window, Additional Weather Metrics, and Display Controls

Validates all six user stories end-to-end, on top of the already-running app from `001-weather-history-locations` and `002-vibrant-award-theme`.

## Prerequisites

- Dependencies installed: `npm install`
- No new environment variables or API keys — this feature adds new hourly parameters to the existing SMHI/Open-Meteo requests, but both remain key-free public endpoints.

## Run

```bash
npm run dev
```

Open the printed local URL. Pick or search for a location with SMHI coverage (e.g., a Swedish city) to exercise the nearby-station scenarios.

## Validation scenarios

1. **30-day window (User Story 1, FR-001/FR-002)**
   - Select "Last 30 days" alongside the existing "Last 24 hours"/"Last 7 days" controls.
   - Confirm the graph shows 30 daily-aggregated points (temperature high/low/average, total precipitation).
   - Click "View details" and confirm the table shows the same 30 rows.

2. **Metric tabs (User Story 2, FR-003-FR-005)**
   - With a location selected, switch to the "Rain" tab — confirm the graph shows only precipitation (bar).
   - Switch to "Wind" — confirm a line graph of wind speed (m/s by default).
   - Switch to "Cloud coverage" — confirm a line graph of cloud coverage (%).
   - Switch back to "Temperature" — confirm the original combined temperature-line + precipitation-bar view returns, and that the selected location/window/nearby-station-count are all unchanged throughout.
   - For a location where a metric has no data (e.g., Open-Meteo-only location with no wind station — or simulate by picking a metric with no coverage), confirm an "unavailable" message rather than an empty graph.

3. **Comparison bars on the Rain tab (User Story 3, FR-006)**
   - Pick an SMHI-covered location with nearby stations and a non-zero station count (see scenario 4).
   - On the "Rain" tab, confirm a bar per shown station appears alongside the primary location's bar, each visually distinguishable, with the primary location clearly identifiable.

4. **Nearby-station count dropdown (User Story 4, FR-007-FR-010)**
   - Open the nearby-station count control; confirm it offers 0, 1, 2, 3, 4, defaulting to 4 for a fresh browser profile.
   - Set it to 2; confirm exactly 2 comparison series appear on both the Temperature and Rain tabs.
   - Set it to 0; confirm no comparison series appear anywhere.
   - Switch location or metric tab; confirm the chosen count is still applied.

5. **Decimal rounding (User Story 5, FR-011)**
   - Hover over any graph point (any metric, any window) and confirm the tooltip shows at most one decimal place.
   - Open the details table and confirm every numeric column (including the new wind/cloud columns) shows at most one decimal place.

6. **Fixed metric default (User Story 6, FR-012/FR-013)**
   - Clear `localStorage` (or open a private window), load the app fresh, and confirm temperature shows in °C, wind in m/s, and precipitation in mm — regardless of system/browser locale.
   - Manually switch to imperial, reload, and confirm the manual choice persists (unchanged existing behavior).

## Automated checks

```bash
npm run test    # unit + component tests, including new dailyAggregation/format/nearbyStationCount tests
npm run lint
npm run build    # confirms the app still builds cleanly for GitHub Pages deployment
```
