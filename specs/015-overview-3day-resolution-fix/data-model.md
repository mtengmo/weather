# Data Model: Overview Resolution Split and High/Low Fix

## `src/services/dailyAggregation.ts`

### Removed

- `toSubDayAndDailyBuckets(observations, dailyBucketCount)` — no longer called by anything; its whole purpose (mixing sub-day and daily resolutions in one array) is exactly what's being undone.

### Unchanged

- `toDailyAggregates(observations, bucketCount)` — reused as-is by `buildDailyTimelineData` (reverted) and untouched by anything else (the classic graph's own daily/weekly/monthly charts already use it directly).
- `SUB_DAY_PERIODS: SubDayBoundary[]` and `SubDayPeriod` type — the 5 fixed period boundaries (morning/lunch/afternoon/evening/night) are unchanged; still reused by the new function below.
- `aggregateBucket(bucket)` — the shared per-bucket math (high/low/average/etc.) is unchanged and reused by both `toDailyAggregates` and the new function.
- `subDayBucketsForDate(baseDate, observations, now)` — unchanged; already builds one calendar day's 5 sub-day buckets, wall-clock-forecast-flagged the same way `toDailyAggregates` flags its own buckets.
- `DailyAggregate.subDayLabel?: string` (on `src/models/types.ts`) — unchanged; still how a sub-day bucket's column gets its period name instead of a weekday name.

### Added

```ts
/**
 * Every day from "today" through `dayCount - 1` days ahead, each broken into the same 5 fixed
 * sub-day periods — a single, uniform resolution throughout (015, FR-003/FR-004). A day beyond
 * how far the underlying observations' forecast actually reaches is omitted entirely, never
 * fabricated (015, FR-005) — mirrors toDailyAggregates' own forwardBucketCount convention.
 */
export function toSubDayBuckets(
  observations: WeatherObservation[],
  dayCount: number
): DailyAggregate[] {
  const now = Date.now();
  const indices = observations.map((o) => bucketIndexOf(o, now));
  const minIndex = indices.length > 0 ? Math.min(...indices) : 0;
  const forwardBucketCount = minIndex < 0 ? -minIndex : 0;
  // Day 0 ("today") always renders (mirrors index 0 always existing in toDailyAggregates);
  // day N (N >= 1) only renders when forecast data reaches at least N days out.
  const availableDayCount = Math.min(dayCount, 1 + forwardBucketCount);

  const buckets: DailyAggregate[] = [];
  for (let dayOffset = 0; dayOffset < availableDayCount; dayOffset++) {
    const date = new Date(now + dayOffset * BUCKET_MS);
    buckets.push(...subDayBucketsForDate(date, observations, now));
  }
  return buckets;
}
```

## `src/components/timelineData.ts`

### Changed

- `buildDailyTimelineData(series, unit)`: its one line `toSubDayAndDailyBuckets(series.observations, DAILY_BUCKET_COUNT)` reverts to `toDailyAggregates(series.observations, DAILY_BUCKET_COUNT)`. Everything else in this function (period labels, `RowSource` mapping including `high`/`low`) is unchanged — `day.subDayLabel` will simply always be `undefined` again for every period here, so every period label reverts to its weekday name.

### Added

```ts
const SUB_DAY_COUNT = 3;

/** Builds the synchronized sub-day timeline (3-day view) — every day at the same sub-day
 *  resolution, never mixed with plain daily columns (015, FR-003/FR-004). */
export function build3DayTimelineData(series: ObservationSeries, unit: UnitSystem): TimelineData {
  const days: DailyAggregate[] = toSubDayBuckets(series.observations, SUB_DAY_COUNT);
  // periods/sources mapping identical in shape to buildDailyTimelineData's own — reuses the
  // exact same RowSource fields (including high/low) and buildRows(...) call.
  ...
}
```

No changes to `TimelineData`, `TimelineRow`, `TimelineRowPoint`, or `RowSource` — this feature reuses every field 014 already added (`high`, `low`, `subDayLabel`-driven period labels) without adding new ones.

## `src/components/WeatherIconOverview.tsx`

### Changed

```tsx
type OverviewDisplayMode = "last-24-hours" | "last-3-days" | "last-7-days";

// Both "last-3-days" and "last-7-days" fetch via the same shared `last-7-days` ObservationWindow
// (015, research.md §3) — this local state only decides which build*TimelineData function runs
// and which window-toggle button is highlighted; it never triggers a new fetch on its own.
const [displayMode, setDisplayMode] = useState<OverviewDisplayMode>(
  window === "last-24-hours" ? "last-24-hours" : "last-7-days"
);
```

`OVERVIEW_WINDOWS` (the rendered button list) gains a third entry, `{ value: "last-3-days", label: "Last 3 days" }`, positioned between the existing two. Clicking it calls `onWindowChange("last-7-days")` (if not already there) and `setDisplayMode("last-3-days")`. Clicking "Last 7 days" calls `onWindowChange("last-7-days")` and `setDisplayMode("last-7-days")`. Clicking "Last 24 hours" calls `onWindowChange("last-24-hours")` and `setDisplayMode("last-24-hours")`.

The `timeline` computation:

```tsx
const timeline: TimelineData | null =
  series !== null && series.status === "ready"
    ? displayMode === "last-24-hours"
      ? buildHourlyTimelineData(series, unit)
      : displayMode === "last-3-days"
        ? build3DayTimelineData(series, unit)
        : buildDailyTimelineData(series, unit)
    : null;
```

The fill-width class:

```tsx
className={`weather-timeline${displayMode !== "last-24-hours" ? " weather-timeline-fill" : ""}`}
```

(015, research.md §5 — extended from `window === "last-7-days"` to any non-24h display mode.)

## Field Population Rules

| Field | 7-day view (`buildDailyTimelineData`) | 3-day view (`build3DayTimelineData`) |
|---|---|---|
| `TimelinePeriod.label` | Always the weekday name (`day.subDayLabel` is always `undefined` post-revert) | Always the sub-day period name (`day.subDayLabel` is always set) |
| `TimelineRowPoint.high`/`.low` | From `DailyAggregate.high`/`.low` for a full day | From `DailyAggregate.high`/`.low` for that sub-day period's own observations |
| Day/period count | Always exactly 7 | 5 × however many of the 3 days actually have data reaching them (5, 10, or 15) |

## Validation Rules

- `toSubDayBuckets` never returns more than `dayCount * 5` entries, and never fewer than 5 (day 0 always renders, even if empty).
- `build3DayTimelineData`'s `nowBoundaryIndex` uses the same `boundaryIndex(periods.map(p => p.isForecast))` helper already shared by both existing builders — no new boundary logic.
- Switching `displayMode` between `"last-3-days"` and `"last-7-days"` must not change `window`/trigger `onWindowChange` a second time if already `"last-7-days"` (avoids a redundant re-render loop, though not a re-fetch either way since `useObservationData`'s effect is keyed on `window`, not `displayMode`).
