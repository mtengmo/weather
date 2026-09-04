# Quickstart: Dashboard Visual Redesign

## Prerequisites

- `npm install` already run.
- A location with observed and forecast data (e.g. Stockholm) to see both timeline sections.

## Setup

```bash
npm run dev
```

## Validation Scenarios

### Scenario 1 — Consolidated header (User Story 1)

1. Select a location.
2. **Expected**: the header shows the location name (still switchable, same as today's "Change
   location"), current temperature, condition, and "feels like" reading together.
3. Click "Display" — confirm it opens a menu containing theme, units, and High/Low, each still
   independently changeable and immediately effective.
4. Click "Forecast sources" — confirm it offers "Automatic" and "Combined," and selecting either
   behaves exactly as the old two-button toggle did.
5. Confirm "Map" and "Details" are still present and still work.

### Scenario 2 — Observed/Forecast sections (User Story 2)

1. Open the Overview with a location that has both observed and forecast data.
2. **Expected**: an "Observed" label spans the observed columns, a "Forecast" label spans the
   forecast columns, and the boundary between them (the "Now" marker) reads as a filled pill.
3. Switch to a hypothetical no-forecast case (e.g. `last-30-days` isn't offered here, so this is
   best checked via the unit tests) — only "Observed" should ever appear alone.

### Scenario 3 — Sticky row labels (User Story 3)

1. Open a wide 7-day or 3-day view so the timeline scrolls horizontally.
2. Scroll the timeline right. **Expected**: each row's label ("Weather," "Temperature °C," "Rain
   mm / Probability," "Wind m/s / Gusts") stays pinned at the left edge while the data scrolls
   underneath it.

### Scenario 4 — Today card and 7-day strip (User Stories 4 & 5)

1. Open the 24-hour tab. **Expected**: a "Today" card (icon, high/low, description, rain, wind
   with compass direction, sunrise/sunset) and a 7-day strip (one card per day, icon + high/low)
   are both visible, without switching tabs.
2. Switch to the 3-day and 7-day tabs in turn. **Expected**: both stay visible and show the same
   data (no re-fetch when switching to/from the 7-day tab specifically — check the network tab).

### Scenario 5 — Footer discloses sources and freshness (User Story 6)

1. With a location selected, scroll to the footer.
2. **Expected**: it shows e.g. "SMHI observations · Open-Meteo forecast · Updated 21:40," plus the
   existing version and Privacy link.
3. With no location selected (fresh load, location denied), confirm the source/freshness text is
   absent, but version/Privacy remain.

## Automated Coverage

- `tests/unit/dailyAggregation.test.ts` — `windDirection` (last-reading-wins) aggregation.
- `tests/unit/format.test.ts` — `directionToCompass`, `dataSourceDisclosure`.
- `tests/integration/appHeader.test.tsx` — `DisplayMenu` open/contains-controls,
  `ForecastSourcesControl` two-option selection, current-conditions summary rendering.
- `tests/integration/weatherIconOverview.test.tsx` — Observed/Forecast section labels (with and
  without forecast data), sticky-column presence, Today card fields (including gap indicators for
  missing data), 7-day strip card count and never-fabricated-day behavior, persistence across all
  three tabs, no duplicate fetch when already on the 7-day tab.

Run `npm test` for the full suite. The sticky-column visual behavior (Scenario 3) and section-pill
styling (Scenario 2) are best confirmed visually via Playwright against a dev/preview build, since
CSS `position: sticky` behavior isn't meaningfully assertable under jsdom.
