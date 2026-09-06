# Contract: Today Summary's Forward-Looking Window (US1)

## `src/components/WeatherIconOverview.tsx`

See `data-model.md` for the exact `todayIndex` change.

**Test-relevant**: given a `weeklySeries` whose most recent past 24h were cloudy
(`cloudCoverPercent` averaging ≥50%) but whose next 24h forecast is clear
(`cloudCoverPercent` averaging <50%, `precipitation` 0, `windSpeed` low), `TodaySummaryCard`'s
rendered condition/description must be "Clear," not "Cloudy" — the inverse of what the old
backward-looking selection would have shown. Given a `weeklySeries` with only observed data (no
`isForecast` entries anywhere), `today` must still resolve to the most recent observed
`DailyAggregate`, unchanged from today's existing fallback behavior.

## No changes to

- `toDailyAggregates`, `bucketIndexOf`, or any other daily-bucketing logic — the rolling-window
  scheme itself is unchanged; only which single bucket "Today" reads from it changes.
- `WeeklyForecastStrip.tsx`'s own day list (`windowAroundToday(weeklyDays, 7)`) — a different
  consumer of `weeklyDays`, unaffected.
- `TodaySummaryCard.tsx` itself — it already renders whatever `DailyAggregate` it's given; no
  prop or rendering logic changes.
