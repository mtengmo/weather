# Contract: Overview Resolution Split (User Stories 1 & 2)

## `src/services/dailyAggregation.ts`

Remove `toSubDayAndDailyBuckets` in full. Add:

```ts
export function toSubDayBuckets(
  observations: WeatherObservation[],
  dayCount: number
): DailyAggregate[] {
  const now = Date.now();
  const indices = observations.map((o) => bucketIndexOf(o, now));
  const minIndex = indices.length > 0 ? Math.min(...indices) : 0;
  const forwardBucketCount = minIndex < 0 ? -minIndex : 0;
  const availableDayCount = Math.min(dayCount, 1 + forwardBucketCount);

  const buckets: DailyAggregate[] = [];
  for (let dayOffset = 0; dayOffset < availableDayCount; dayOffset++) {
    const date = new Date(now + dayOffset * BUCKET_MS);
    buckets.push(...subDayBucketsForDate(date, observations, now));
  }
  return buckets;
}
```

`SUB_DAY_PERIODS`, `SubDayPeriod`, `aggregateBucket`, `subDayBucketsForDate`, and `toDailyAggregates` are all unchanged — this is purely additive alongside them, with `toSubDayAndDailyBuckets` deleted.

## `src/components/timelineData.ts`

```ts
import { toDailyAggregates, toSubDayBuckets } from "../services/dailyAggregation";
```

(replaces the `toSubDayAndDailyBuckets` import)

```ts
/** Builds the synchronized daily timeline (7-day view) from an already-loaded series. */
export function buildDailyTimelineData(series: ObservationSeries, unit: UnitSystem): TimelineData {
  const days: DailyAggregate[] = toDailyAggregates(series.observations, DAILY_BUCKET_COUNT);
  // ...unchanged from here down (period/source mapping identical to pre-014 US8 behavior)
}
```

```ts
const SUB_DAY_COUNT = 3;

/** Builds the synchronized sub-day timeline (3-day view) — every day at sub-day resolution. */
export function build3DayTimelineData(series: ObservationSeries, unit: UnitSystem): TimelineData {
  const days: DailyAggregate[] = toSubDayBuckets(series.observations, SUB_DAY_COUNT);

  const periods: TimelinePeriod[] = days.map((day) => ({
    key: day.bucketEnd,
    label: day.subDayLabel ?? new Date(day.bucketEnd).toLocaleDateString([], { weekday: "short" }),
    isForecast: day.isForecast ?? false,
    condition: deriveWeatherCondition({
      temperature: day.average,
      precipitation: day.totalPrecipitation,
      windSpeed: day.windAverage,
      cloudCoverPercent: day.cloudAverage,
    }),
  }));

  const sources: RowSource[] = days.map((day) => ({
    temperature: day.average,
    precipitation: day.totalPrecipitation,
    windSpeed: day.windAverage,
    windDirection: null,
    windGust: day.windGustHigh,
    cloudCoverPercent: day.cloudAverage,
    isSnowy:
      deriveWeatherCondition({
        temperature: day.average,
        precipitation: day.totalPrecipitation,
        windSpeed: day.windAverage,
        cloudCoverPercent: day.cloudAverage,
      }) === "snowy",
    isForecast: day.isForecast ?? false,
    chanceOfRain: day.chanceOfRainMax,
    high: day.high,
    low: day.low,
  }));

  return {
    periods,
    nowBoundaryIndex: boundaryIndex(periods.map((p) => p.isForecast)),
    ...buildRows(sources, unit),
  };
}
```

(Body is deliberately near-identical to `buildDailyTimelineData` — both map a `DailyAggregate[]` the same way; only the source function producing that array differs. `RowSource`, `buildRows`, `boundaryIndex`, `deriveWeatherCondition` are all reused unchanged.)

## `src/components/WeatherIconOverview.tsx`

```tsx
import {
  build3DayTimelineData,
  buildDailyTimelineData,
  buildHourlyTimelineData,
  type TimelineData,
  type TimelinePeriod,
  type TimelineRow,
} from "./timelineData";

type OverviewDisplayMode = "last-24-hours" | "last-3-days" | "last-7-days";

const OVERVIEW_WINDOWS: { value: OverviewDisplayMode; label: string }[] = [
  { value: "last-24-hours", label: "Last 24 hours" },
  { value: "last-3-days", label: "Last 3 days" },
  { value: "last-7-days", label: "Last 7 days" },
];
```

Inside the component:

```tsx
const [displayMode, setDisplayMode] = useState<OverviewDisplayMode>(
  window === "last-24-hours" ? "last-24-hours" : "last-7-days"
);

// Keeps displayMode in sync if `window` changes for a reason outside this component's own
// buttons (e.g. the shared window falling back from last-30-days elsewhere in the app).
useEffect(() => {
  if (window === "last-24-hours" && displayMode !== "last-24-hours") {
    setDisplayMode("last-24-hours");
  } else if (window !== "last-24-hours" && displayMode === "last-24-hours") {
    setDisplayMode("last-7-days");
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [window]);

function selectDisplayMode(mode: OverviewDisplayMode) {
  setDisplayMode(mode);
  onWindowChange(mode === "last-24-hours" ? "last-24-hours" : "last-7-days");
}
```

The window-toggle buttons:

```tsx
<div className="window-toggle" role="group" aria-label="Overview window">
  {OVERVIEW_WINDOWS.map((w) => (
    <button
      key={w.value}
      type="button"
      aria-pressed={displayMode === w.value}
      onClick={() => selectDisplayMode(w.value)}
    >
      {w.label}
    </button>
  ))}
</div>
```

The timeline computation:

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

The fill-width class and the `useEffect`/`window` dependency arrays that reference `window` for centering-on-now and re-running the scroll effect should additionally key on `displayMode` (since switching from 3-day to 7-day changes the periods without necessarily changing `window`):

```tsx
className={`weather-timeline${displayMode !== "last-24-hours" ? " weather-timeline-fill" : ""}`}
```

```tsx
}, [series, window, displayMode, nowLeftPercent]);
```

## No changes to

- `src/models/types.ts` — `ObservationWindow` stays exactly `"last-24-hours" | "last-7-days" | "last-30-days"`.
- `src/App.tsx` — still owns only `obsWindow: ObservationWindow` and passes it through unchanged; `viewOverview()`'s 30-day fallback is untouched.
- `src/services/weatherApi.ts`, `src/services/smhiProvider.ts`, `src/services/openMeteoProvider.ts` — no fetch-window changes.
- `src/components/ObservationChart.tsx` (the classic graph) — entirely out of scope.
