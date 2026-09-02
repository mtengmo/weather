# Quickstart: Chance of Rain Alongside Precipitation Amount

## Prerequisites

- `npm install` already run in the repo root.
- A location known to have Open-Meteo forecast coverage (any location works — Open-Meteo is
  global; SMHI-covered Swedish locations will still show this via the forecast-fallback path or
  wherever SMHI has no station, per `weatherApi.ts`'s existing fallback behavior).

## Setup

```bash
npm run dev
```

Open the printed local URL, allow geolocation (or search/select a location), then open the
timeline **Overview** view.

## Validation Scenarios

### Scenario 1 — Forecast columns show amount + percentage (24h view)

1. With the Overview open on the 24-hour window, locate a forecast (post-"now") column in the
   Precipitation row.
2. **Expected**: the column shows the millimeter amount, with a smaller percentage line beneath it
   (e.g. `2.0 mm` / `70%`), whenever Open-Meteo supplied a probability for that hour.
3. Confirm an observed (pre-"now") column in the same row shows only the millimeter amount, with no
   percentage — matches spec Acceptance Scenario 2 / FR-004.

### Scenario 2 — 0% renders distinctly from "no data"

1. Find (or note, if none present in the current series) that a forecast hour with a genuine 0%
   reading should render `0%` as text, not blank.
2. Compare against a column with no probability data at all (if the active source is SMHI-only for
   that stretch) — that column should show no percentage line at all, not `0%` and not a dash
   placeholder in the percentage's place. Matches Edge Cases / FR-003.

### Scenario 3 — 7-day view shows the day's peak chance

1. Switch to the 7-day window.
2. **Expected**: each forecast day's Precipitation column shows a percentage equal to the maximum
   hourly chance-of-rain among that day's underlying hours, not an average — cross-check against
   `research.md §3` / Clarifications. (Exact per-hour source values aren't visible in this view;
   this is best verified via the unit tests in `tests/unit/dailyAggregation.test.ts` and
   `tests/unit/timelineData.test.ts` for a controlled fixture, since live data won't let you see
   the raw hourly inputs directly.)

### Scenario 4 — Graceful degradation when unavailable

1. If reachable, view a location/window where the active forecast source is SMHI's own point
   forecast (no Open-Meteo fallback triggered) — SMHI never supplies this field.
2. **Expected**: the Precipitation row renders exactly as it did before this feature (amounts
   only), with zero empty/blank percentage placeholders anywhere in the row. Matches FR-002/SC-002.

## Automated Coverage

- `tests/unit/openMeteoProvider.test.ts` — parses `precipitation_probability` when present, `null`
  when absent from the response.
- `tests/unit/dailyAggregation.test.ts` — `chanceOfRainMax` takes the bucket's forecast-only
  maximum; `null` when no forecast readings exist in the bucket.
- `tests/unit/timelineData.test.ts` — precipitation row's `chanceOfRain` is nulled for any
  non-forecast point regardless of raw source value; passes through for forecast points.
- `tests/integration/weatherIconOverview.test.tsx` — renders the percentage beneath the mm value
  for a forecast column with data; renders no percentage for an observed column or a column
  without probability data.

Run `npm test` to execute the full suite, or `npx vitest run tests/unit/timelineData.test.ts` etc.
for a single file during development.
