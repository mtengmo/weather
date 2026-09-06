# Data Model: Fix Today Summary's Backward-Looking Condition

## `src/components/WeatherIconOverview.tsx`

### `todayIndex` — selects the forward-looking bucket

```tsx
// Before:
// "Today" = the last non-forecast entry in the always-on 7-day series, or the final entry
// when there's no forecast at all — reused on all three tabs, not gated on displayMode
// (018-dashboard-visual-redesign, contracts/summary-cards.md).
const todayIndex = (() => {
  const firstForecastIndex = weeklyDays.findIndex((d) => d.isForecast === true);
  if (firstForecastIndex === -1) return weeklyDays.length - 1;
  return firstForecastIndex > 0 ? firstForecastIndex - 1 : -1;
})();

// After:
// "Today" = the first forecast-tagged entry in the always-on 7-day series — the forward-looking
// (now, now+24h] window, matching what a user reading "Today" next to today's own sunrise/sunset
// expects (023-fix-today-summary, research.md §1). The bucket immediately before this one is the
// backward-looking (now-24h, now] window, which was the confirmed root cause of the Today card
// disagreeing with the visible forward-looking hourly forecast. Falls back to the most recent
// observed entry only when there is no forecast anywhere in the array at all.
const todayIndex = (() => {
  const firstForecastIndex = weeklyDays.findIndex((d) => d.isForecast === true);
  return firstForecastIndex === -1 ? weeklyDays.length - 1 : firstForecastIndex;
})();
```

`const today = todayIndex >= 0 ? weeklyDays[todayIndex] : null;` (unchanged) and
`<TodaySummaryCard today={today} .../>` (unchanged) — no other line changes.

## Validation Rules

- When `weeklyDays` has no forecast-tagged entries at all, `today` continues to resolve to the
  most recent observed entry (FR-003) — unchanged branch.
- No other day's `DailyAggregate` in `weeklyDays`, and no other consumer of `weeklyDays` (the
  7-day strip, `windowAroundToday`), is touched by this change (FR-004).
- No data is fabricated — the fix only changes which already-computed bucket is selected, never
  invents a value for a bucket that has none.
