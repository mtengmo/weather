# Quickstart: Calendar-Day Rain Total on the Today Card

## Automated validation

```bash
TZ=UTC npx vitest run
```

Expect new unit tests for `sumCalendarDayPrecipitation` in `tests/unit/dailyAggregation.test.ts`:
- Sums both already-elapsed and still-forecast hours of today into one total.
- Excludes an hour belonging to tomorrow, even when called late at night.
- Returns `null` (not `0`) when no non-null reading exists anywhere in today's span.

Expect an updated/new integration test in `tests/integration/weatherIconOverview.test.tsx`
(alongside the existing "Today summary card" tests) asserting the rendered rain figure matches a
calendar-day sum, not the existing rolling-window bucket's total, for a fixture where the two
values deliberately differ (e.g. rain in tomorrow's early hours, none left in today).

## Manual / live validation

1. `npm run dev`.
2. Load a location with rain forecast for the next few hours crossing into tomorrow.
3. Confirm the Today card's rain figure excludes the portion that falls after midnight tonight.
4. Confirm the card's other figures (icon, high/low, wind, sunrise/sunset) are visually unchanged
   from before this feature.
