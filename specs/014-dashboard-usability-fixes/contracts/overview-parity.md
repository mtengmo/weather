# Contract: Overview Parity Fixes (User Stories 3-5, 8)

## User Story 3 — 7-day fill width

`src/components/WeatherIconOverview.tsx`:

```tsx
<div
  className={`weather-timeline${window === "last-7-days" ? " weather-timeline-fill" : ""}`}
>
```

`src/index.css`:

```css
.weather-timeline-fill {
  width: 100%; /* overrides the base .weather-timeline rule's width: max-content */
}
```

(`min-width: 900px` is inherited unchanged from the base `.weather-timeline` rule — CSS `min-width`
always wins over a conflicting `width`, so this alone preserves the narrow-viewport scroll
fallback per FR-007.)

## User Story 4 — High/Low on the Overview

`src/components/timelineData.ts`'s `buildRows`/`buildDailyTimelineData`: the temperature row's
point-mapping for the daily builder gains:

```ts
high: convertTemperature(s.high ?? null, unit),
low: convertTemperature(s.low ?? null, unit),
```

where `RowSource` gains `high?: number | null` and `low?: number | null`, populated in
`buildDailyTimelineData`'s `sources` mapping from `day.high`/`day.low`.

`src/components/WeatherIconOverview.tsx` gains a `highLowVisible: boolean` prop, passed to
`LineRow` (which already receives `row`/`periods`/`nowBoundaryIndex`) as one more prop. `LineRow`'s
value-label rendering:

```tsx
{point.value !== null && highLowVisible && point.high != null && point.low != null
  ? `${formatRowValue(row, point.value)} (${formatValue(point.high, 0)}°/${formatValue(point.low, 0)}°)`
  : formatRowValue(row, point.value)}
```

(only reachable for `row.key === "temperature"` in practice, since only that row ever has
`high`/`low` populated — no explicit key check needed, the values are simply always `undefined`
elsewhere).

## User Story 5 — Hide nearby-stations control

`src/App.tsx`:

```tsx
{view !== "overview" && (
  <NearbyStationCountControl count={nearbyStationCount} onChange={setNearbyStationCount} />
)}
```

## User Story 8 — Sub-day periods for the first two days

`src/components/timelineData.ts`'s `buildDailyTimelineData` switches its call from
`toDailyAggregates(series.observations, DAILY_BUCKET_COUNT)` to
`toSubDayAndDailyBuckets(series.observations, DAILY_BUCKET_COUNT)`. `TimelinePeriod.label`'s
existing `new Date(day.bucketEnd).toLocaleDateString([], { weekday: "short" })` computation is
extended: when a bucket represents a sub-day period (identified by the bucket's own time span
being narrower than 24h — `dailyAggregation.ts`'s `SubDayPeriod` metadata carries this, threaded
through via a new optional `DailyAggregate.subDayLabel?: string` field set only by
`toSubDayAndDailyBuckets`), the period label uses that sub-day label (e.g. `"Morning"`) instead of
the weekday name.

## No changes to

- `dailyAggregation.ts`'s `toDailyAggregates` — kept as-is, still used directly by the classic
  graph's daily/weekly/monthly charts (`ObservationChart.tsx`), which are out of scope for User
  Story 8 (only the Overview's 7-day view gains sub-day detail).
- `chartData.ts`'s existing daily row-builders — unaffected; User Story 8 is Overview-only.
