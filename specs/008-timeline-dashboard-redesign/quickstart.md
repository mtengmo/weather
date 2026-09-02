# Quickstart: Validate Timeline Weather Dashboard Redesign

Manual + automated validation, mapped to spec.md's user stories and success criteria. Builds on 007's quickstart — this redesigns the same "Overview" entry point rather than adding a new one.

## Prerequisites

- `npm install` (no new dependency added by this feature — research.md §4)
- Network access to the app's existing weather data sources (SMHI, Open-Meteo) — no new external service

## Run it

```sh
npm run dev
```

## Validation scenarios

### 1. Synchronized 24h timeline (User Story 1 / SC-001–SC-003)

1. Open the Overview for a location with a full 24 hours of data (ideally mixing observed and forecast hours, and at least one data gap).
2. Confirm hour labels appear once across the top, with a distinct row beneath for condition, temperature, precipitation, wind, and cloud cover — not the previous one-card-per-hour grid.
3. Confirm a single vertical "now" line lines up at the same horizontal position across every row.
4. Pick any one hour and confirm you can read that hour's icon and every row's value by looking straight down one column, without hovering.
5. Confirm the observed/forecast boundary looks the same way (solid vs. dashed, or equivalent) on every row that has forecast data.
6. Confirm the gap hour shows a clear "no data" indicator in the affected row(s), not a fabricated value.

### 2. Synchronized 7-day timeline (User Story 2)

1. Switch to the 7-day period.
2. Confirm the same row layout now shows one column per day.
3. Confirm a forecast day is distinguished the same way as a forecast hour.

### 3. Sun, moon, and enrichment rows (User Story 3 / SC-005)

1. Confirm a "Sun & Moon" summary appears showing sunrise, sunset, and the current moon phase for the displayed location/date — check the sunrise/sunset times look plausible for the location and time of year (contracts/sun-moon.md).
2. Confirm feels-like, snow, and wind-gust rows appear when the underlying data supports them, using the same shared-axis/observed-forecast pattern as the core rows.
3. Find or simulate a location/period where one of those three data points isn't available; confirm its row is simply absent rather than shown empty or broken.

### 4. Responsive/narrow screen (FR-008 / SC-004)

1. Resize the browser window narrow (or use device emulation at a phone width).
2. Confirm the timeline scrolls horizontally within its own frame rather than shrinking columns illegibly or breaking the rest of the page.

### 5. Unit/theme consistency (FR-012)

1. Toggle metric/imperial units; confirm every row's displayed values update accordingly.
2. Switch themes; confirm the timeline's styling (grid lines, row backgrounds, icon coloring) follows the active theme.

### 6. Automated checks

```sh
npm run lint
npm test
npm run build
```

New/updated tests: `tests/unit/feelsLike.test.ts`, `tests/unit/sunMoon.test.ts` (new), and a rewritten `tests/integration/weatherIconOverview.test.tsx` reflecting the new grid/row DOM structure — following this repo's established conventions. Because this feature's rendering is CSS Grid + SVG rather than Recharts, its integration tests can assert on real rendered content (row presence, gap indicators, now-line position) rather than 005/006's smoke-test-only pattern.
