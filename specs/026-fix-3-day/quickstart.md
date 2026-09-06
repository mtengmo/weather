# Quickstart: Fix 3-Day "Observed" Mislabel & Add Weekday Labels

## Prerequisites

```sh
npm ci
npm run dev
```

Select a location whose 3-day view is currently (or can be made, via a moment in time) entirely
forecast — e.g. a location where the observed history has aged out of the 3-day window.

## US1 — Section header matches what's shown

1. Open the 3-day view for a location/moment where the visible periods are entirely forecast.
   **Expect**: the header reads "Forecast" spanning the full width — not "Observed."
2. Open the 3-day view for a typical location with a normal mix of observed + forecast periods.
   **Expect**: the header still splits proportionally into "Observed" and "Forecast," unchanged
   from before this fix.

## US2 — Weekday labels above the sub-day periods

1. Open the 3-day view. **Expect**: each of the three days' group of Morning/Lunch/Afternoon/
   Evening/Night columns has a weekday label (e.g. "Mon," "Tue," "Wed") above or alongside it,
   and the three labels are visibly distinct and correctly ordered.
2. Compare the weekday labels against the actual calendar dates those columns represent (e.g. via
   the existing day-boundary marker's position). **Expect**: they match.

## Automated checks

```sh
npm test
npm run lint
npm run build
```
