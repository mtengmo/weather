# Data Model: Dashboard Polish Round Four

## `src/services/smhiProvider.ts`

### `SmhiForecastResponse` — gains top-level fields

```ts
interface SmhiForecastResponse {
  approvedTime?: string; // ISO 8601 — when this forecast was generated/approved (research.md §8)
  timeSeries?: SmhiForecastTimeSeriesEntry[];
}
```

`fetchForecastTimeSeries` returns both the parsed `timeSeries` (unchanged) and the raw
`approvedTime` string, so `getObservations`/`getMultiSourceForecast` can surface it alongside the
forecast data they already return.

## `src/models/types.ts`

### `ObservationSeries` — new field

```ts
export interface ObservationSeries {
  // ...existing fields unchanged...
  /** When the active forecast source generated/approved this forecast (SMHI's own
   *  `approvedTime`), or null when the source is Open-Meteo or SMHI didn't supply one
   *  (019-dashboard-polish-round-four, research.md §8). */
  forecastIssuedAt?: string | null;
}
```

### `MultiSourceForecastEntry` (in `weatherApi.ts`) — new field

```ts
export interface MultiSourceForecastEntry {
  source: "smhi" | "open-meteo";
  observations: WeatherObservation[];
  /** Same meaning as `ObservationSeries.forecastIssuedAt`, per-source. */
  issuedAt?: string | null;
}
```

## `src/components/timelineData.ts`

### `TimelineRowPoint` — `sources` replaced with `combined` (temperature row only)

```ts
export interface TimelineRowPoint {
  // ...existing fields unchanged...
  /** true when `value` is a cross-source average rather than a single source's own reading
   *  (019-dashboard-polish-round-four, FR-011) — replaces the old `sources` field, which is
   *  removed since nothing sets it once Combined mode averages instead of listing per-source. */
  combined?: boolean;
}
```

`mergeMultiSourceIntoTimelinePoints` sets `point.value` to the mean of the two sources' own
per-period averages and `point.combined = true`, instead of populating the old `sources` array.
`WeatherIconOverview.tsx`'s `LineRow` rendering switches from
`point.sources !== undefined ? "S 8° · O 12°" : ...` to `point.combined ? "10° (avg)" : ...`.

### New helper

```ts
/** Caps an oldest->newest DailyAggregate[] at `maxForecastDays` *forecast* days, leaving every
 *  observed/historical day (including "today") untouched (research.md §7 — corrected after a
 *  naive tail-slice was found, via live testing, to silently drop "today" once forecast reach
 *  exceeded ~6 days). */
function capForecastReach(days: DailyAggregate[], maxForecastDays: number): DailyAggregate[] {
  const firstForecastIndex = days.findIndex((d) => d.isForecast === true);
  if (firstForecastIndex === -1) return days;
  return days.slice(0, firstForecastIndex + maxForecastDays);
}
```

Applied in `buildDailyTimelineData` (before building rows) and in `WeatherIconOverview.tsx`'s
`weeklyDays` derivation.

## `src/services/format.ts`

### `dataSourceDisclosure` — extended to include forecast freshness

```ts
export function dataSourceDisclosure(series: {
  primarySource?: "smhi" | "open-meteo";
  forecastFromFallbackSource?: boolean;
  forecastIssuedAt?: string | null;
}, lastUpdated: string | null): string | null
```

Appends a freshness fragment: `Forecast <source> updated HH:MM` using `forecastIssuedAt` when
present, else `lastUpdated`. Combined mode (both sources shown) appends one fragment per source
using `MultiSourceForecastEntry.issuedAt`/fallback.

## `src/components/WeatherIconOverview.tsx`

### `weeklyDays` — capped

```ts
const weeklyDays: DailyAggregate[] = capForecastReach(
  weeklySeries !== null && weeklySeries.status === "ready"
    ? toDailyAggregates(weeklySeries.observations, 7)
    : [],
  7
);
```

## `src/App.tsx`

### New state

```ts
const [previousView, setPreviousView] = useState<View>("overview");
```

Set immediately before switching to `"map"`; read by the map view's "Back" control to restore
the prior screen.

## Validation Rules

- `forecastIssuedAt`/`issuedAt` are never fabricated: `null`/absent when the source doesn't
  supply one and no app-level fetch has completed yet, exactly mirroring the existing
  gap-vs-fabrication convention (FR-013).
- `capForecastReach` never pads short arrays and never touches observed/historical days — a
  location with less than `maxForecastDays` of actual forecast reach is shown unchanged, and
  "today" is never at risk of being trimmed away regardless of forecast reach.
- `point.combined` is set only on a forecast period with 2+ sources' data; never on an observed
  period.
