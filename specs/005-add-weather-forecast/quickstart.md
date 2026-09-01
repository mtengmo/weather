# Quickstart: Validate Add Weather Forecast

Manual + automated validation once the feature is implemented, mapped to the spec's user stories and success criteria.

## Prerequisites

- `npm install` (already set up in this repo)
- Network access to `opendata-download-metfcst.smhi.se`, `opendata-download-metobs.smhi.se`, and `api.open-meteo.com` (no API keys required — both are public open-data APIs)

## Run it

```sh
npm run dev
```

Open the printed local URL in a browser.

## Validation scenarios

### 1. 24h merged forecast (User Story 1 / SC-001)

1. Grant location access when prompted (or select a favorite/search a Swedish location known to be within SMHI coverage).
2. With the **Last 24 hours** window and **temperature** tab selected, confirm the chart's X-axis extends past the current hour and shows a continuous line: solid up to "now", dotted from "now" onward.
3. Hover a dotted point — the tooltip should present it as a prediction (not implying it was measured), per FR-010.
4. Switch to rain / wind / cloud tabs — repeat: forecast continuation should appear for each metric the provider supplies, and any metric the provider doesn't supply should show the existing "not available" message (FR-009), not a broken/empty chart.
5. Click **View details** — confirm rows for the upcoming hours are present and each row indicates observed vs. forecast (FR-011).

**Expected**: All of the above hold without navigating away from the existing chart view (SC-001).

### 2. 7-day merged forecast (User Story 2 / SC-002)

1. Switch to the **Last 7 days** window.
2. Confirm daily high/low/average bars/lines extend into the coming week, visually distinguished the same way as the 24h view.
3. Pick a location/date range where SMHI's ~10-day horizon won't fully cover 7 forecast days from "now" (harder to force manually — note in test notes if full 7-day forecast coverage can't be verified for the tested location) — confirm the chart shows only the days actually returned rather than fabricating placeholder days (User Story 2, Acceptance Scenario 3).

**Expected**: Same distinguishability as the 24h view; no fabricated days (SC-002).

### 3. Forecast unavailable, observations fine (Edge case / FR-009)

1. Pick or simulate a location within observation coverage but outside forecast coverage (or temporarily point the forecast fetch at an invalid coordinate during manual testing).
2. Confirm the chart still renders historical data normally, and forecast absence surfaces as the existing "unavailable" messaging rather than an error or blank chart.

**Expected**: SC-005 — no blank/broken chart on forecast-only failure.

### 4. Current-position naming (User Story 3 / SC-004)

1. Grant location access (fresh, not from a previously cached favorite).
2. Confirm the chart heading/legend show a real station name — not the literal text "Current Location".
3. If reachable, force a scenario where the nearest station has no usable name from the provider — confirm the fallback text is "Unnamed station" (matching `004-chart-styling-fixes`'s existing convention), not "Current Location" and not a blank string.
4. Switch to a favorite or searched location — confirm its naming is unchanged from current (pre-feature) behavior.

**Expected**: SC-004 — no current-position session shows the generic label (excluding the documented "Unnamed station" fallback).

### 5. Automated checks

```sh
npm run lint
npm test
npm run build
```

Extend the existing test suite under `tests/unit/` and `tests/integration/` (see plan.md Technical Context) rather than introducing a new pattern: at minimum, cover the observed/forecast boundary logic in `chartData.ts`'s row builders and the daily-aggregate `isForecast` bucket classification in `dailyAggregation.ts`, since both are pure functions already covered this way for the existing (non-forecast) behavior.
