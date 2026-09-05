# Contract: Dropdown Legibility, Rain Bar, Wind Direction, High/Low Labels, 7-Day Cap (US3-US7)

## `src/index.css` — dropdown legibility (US3)

```css
[data-theme="glass"] .app-header,
[data-theme="glass"] .observation-table-wrap,
[data-theme="glass"] .location-panel-content,
[data-theme="glass"] .display-menu-content,
[data-theme="glass"] .forecast-sources-control ul,
[data-theme="glass"] .error-banner {
  background: var(--surface);
  backdrop-filter: blur(var(--surface-blur));
  -webkit-backdrop-filter: blur(var(--surface-blur));
  border-radius: 10px;
  padding: 0.75rem;
}
```

(Two selectors added to the existing rule; no new rule, no other theme affected since `--surface`
is already opaque there.)

## `src/components/WeatherIconOverview.tsx` — rain bar (US4)

Investigate live (dev server + a real SMHI/Open-Meteo forecast series, or a synthetic series with
varied per-column precipitation) before changing code — `BarRow`'s height math and CSS read as
correct in isolation (verified against a synthetic 24h series during planning; heights did scale
0-100% proportionally with a shared bottom baseline). Check, in order:

1. Whether the discrepancy is specific to the 3-day/7-day (`daysToTimelineData`) precipitation
   values (`day.totalPrecipitation`) rather than the hourly path.
2. Whether it's actually the graph view's Recharts-based Rain metric tab (`ObservationChart.tsx`),
   a different rendering path entirely, that the user means by "the rain bar."

Whichever is confirmed live, the fix keeps `BarRow`'s existing `Math.max(2, (point.value / max) *
100)` proportional-height contract and shared `justify-content: flex-end` baseline — apply
whatever correction the live root cause calls for (a data-flow fix if the value reaching the row
is wrong, or a CSS-scoping fix if 018's `.weather-timeline-row-grid-cells` wrapper interferes)
without changing that contract's shape.

## `src/components/timelineData.ts` — wind direction (US5)

```ts
const sources: RowSource[] = days.map((day) => ({
  temperature: day.average,
  precipitation: day.totalPrecipitation,
  windSpeed: day.windAverage,
  windDirection: day.windDirection ?? null, // was: null (stale — aggregateBucket now computes a real value)
  windGust: day.windGustHigh,
  ...
}));
```

One-line change; `WindRow`'s existing `point.direction`-driven arrow rendering (unchanged)
picks this up automatically for both the 3-day and 7-day views.

## `src/components/WeatherIconOverview.tsx` — high/low labeling (US6)

```tsx
{point.combined
  ? `${formatRowValue(row, point.value)} (avg)`
  : highLowVisible && point.high != null && point.low != null
    ? `${formatRowValue(row, point.value)} (H ${formatValue(point.high, 0)}° / L ${formatValue(point.low, 0)}°)`
    : formatRowValue(row, point.value)}
```

(Replaces the `point.sources !== undefined` branch — see
`contracts/forecast-source-behavior.md` — and adds `H `/`L ` labels to the existing
high/low parenthetical.)

## `src/components/TodaySummaryCard.tsx` — high/low labeling (US6)

```tsx
<div className="today-summary-highlow">
  <span className="today-summary-high">
    High {formatValue(convertTemperature(today.high, unit), 0)}°
  </span>
  <span className="today-summary-low">
    Low {formatValue(convertTemperature(today.low, unit), 0)}°
  </span>
</div>
```

## `src/components/timelineData.ts` — forecast-reach cap and dated labels (US7)

```ts
/** Caps the forecast portion of an oldest->newest DailyAggregate[] at `maxForecastDays`,
 *  leaving observed/historical days (including "today") untouched (research.md §7 — a naive
 *  tail-slice was tried first and found, via live testing, to silently drop "today"). */
function capForecastReach(days: DailyAggregate[], maxForecastDays: number): DailyAggregate[] {
  const firstForecastIndex = days.findIndex((d) => d.isForecast === true);
  if (firstForecastIndex === -1) return days;
  return days.slice(0, firstForecastIndex + maxForecastDays);
}

export function buildDailyTimelineData(series: ObservationSeries, unit: UnitSystem): TimelineData {
  return daysToTimelineData(
    capForecastReach(toDailyAggregates(series.observations, DAILY_BUCKET_COUNT), DAILY_BUCKET_COUNT),
    unit
  );
}
```

```ts
label: day.subDayLabel ?? new Date(day.bucketEnd).toLocaleDateString([], { weekday: "short", day: "numeric" }),
```

(The 3-day view's sub-day columns are unaffected — they still use `subDayLabel` and are already
capped by `toSubDayBuckets`' own contract.)

## `src/components/WeatherIconOverview.tsx` — `weeklyDays` capped (US7)

```ts
const weeklyDays: DailyAggregate[] = capForecastReach(
  weeklySeries !== null && weeklySeries.status === "ready"
    ? toDailyAggregates(weeklySeries.observations, 7)
    : [],
  7
);
```

(`capForecastReach` exported from `timelineData.ts` and imported here, rather than duplicated.)

## No changes to

- `toDailyAggregates`, `toSubDayBuckets` — their own forward-extension contract is correct and
  used as-is by other callers (e.g. the graph/details views); only the two call sites that need a
  forecast-reach cap gained the new `capForecastReach` wrapper.
- `PeriodGrid`, `ConditionRow`, `LineRow`'s SVG line-drawing — untouched.
