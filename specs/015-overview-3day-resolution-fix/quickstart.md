# Quickstart: Overview Resolution Split and High/Low Fix

## Prerequisites

- `npm install` already run.
- A location with SMHI or Open-Meteo forecast coverage reaching at least 1-3 days ahead (e.g.
  Stockholm), to see forecast-side sub-day and daily behavior.

## Setup

```bash
npm run dev
```

## Validation Scenarios

### Scenario 1 — 7-day Overview shows one column per day (User Story 1)

1. Open the Overview, select "Last 7 days."
2. **Expected**: all seven columns are weekday-labeled, full-day columns — none show sub-day
   labels (Morning/Lunch/Afternoon/Evening/Night).

### Scenario 2 — 3-day view shows sub-day detail throughout (User Story 2)

1. Open the Overview, select "Last 3 days" (new option, between "Last 24 hours" and "Last 7
   days").
2. **Expected**: all visible columns are sub-day columns (Morning/Lunch/Afternoon/Evening/Night),
   for as many of the 3 days as the location's forecast actually reaches — no full-day columns
   mixed in, and no more than 3 days' worth of periods even if more data exists.
3. Switch back to "Last 24 hours" then to "Last 7 days" then back to "Last 3 days" — confirm no
   extra network requests fire beyond the initial 24h/7d fetches already made (check the browser's
   network tab, or confirm no new loading state appears).

### Scenario 3 — High/Low toggle works on both new resolutions (User Story 3)

1. Turn on "High/Low" in the header.
2. Open the 7-day Overview — confirm each day's temperature cell shows `"<avg>°C (<high>°/<low>°)"`.
3. Switch to the 3-day view — confirm each sub-day period's temperature cell shows the same
   pattern, using that period's own high/low.
4. Switch to the 24-hour Overview — confirm temperature cells show only the plain value (by
   design, unaffected).
5. Turn High/Low off — confirm both the 7-day and 3-day views revert to plain average-only values.

## Automated Coverage

- `tests/unit/dailyAggregation.test.ts` — `toSubDayBuckets`'s day-count clamping, never-fabricate
  rule, and per-period aggregation math (high/low included). `toSubDayAndDailyBuckets`'s old test
  block is removed along with the function.
- `tests/unit/timelineData.test.ts` — `buildDailyTimelineData` reverts to asserting plain
  weekday-only labels (no sub-day mixing); new `build3DayTimelineData` tests cover sub-day labels,
  high/low population, and the never-fabricate-beyond-forecast rule.
- `tests/integration/weatherIconOverview.test.tsx` — window-toggle now offers 3 options; switching
  between them doesn't trigger extra fetches; High/Low regression tests across all three display
  modes.

Run `npm test` for the full suite.
