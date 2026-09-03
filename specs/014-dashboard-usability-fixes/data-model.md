# Data Model: Dashboard Usability Fixes

## Changed: `PlaceSearchProps` (`src/components/PlaceSearch.tsx`)

```ts
interface PlaceSearchProps {
  onAddFavorite: (place: PlaceCandidate) => void; // renamed from onSelect (research.md §1)
  onView: (place: PlaceCandidate) => void;          // NEW
}
```

## Changed: `LocationSwitcherProps` (`src/components/LocationSwitcher.tsx`)

```ts
interface LocationSwitcherProps {
  currentLocation: Location | null;
  favorites: FavoritePlace[];
  selected: Location | null;
  onSelect: (location: Location) => void;
  geoStatus: GeolocationStatus;              // NEW (research.md §2)
  onRequestCurrentLocation: () => void;      // NEW
}
```

## Changed: `LocationPanelProps` (`src/components/LocationPanel.tsx`)

Forwards the new `PlaceSearch`/`LocationSwitcher` props verbatim:

```ts
interface LocationPanelProps {
  // ...existing fields unchanged...
  geoStatus: GeolocationStatus;              // NEW, forwarded to LocationSwitcher
  onRequestCurrentLocation: () => void;      // NEW, forwarded to LocationSwitcher
}
```

## Changed: `TimelineRowPoint` (`src/components/timelineData.ts`)

```ts
export interface TimelineRowPoint {
  // ...existing fields unchanged...
  /** Temperature row (daily builder only): the day's high, when High/Low is relevant
   *  (014-dashboard-usability-fixes, FR-009). */
  high?: number | null;
  /** Temperature row (daily builder only): the day's low. */
  low?: number | null;
}
```

## Changed: `WeatherIconOverviewProps` (`src/components/WeatherIconOverview.tsx`)

```ts
interface WeatherIconOverviewProps {
  // ...existing fields unchanged...
  highLowVisible: boolean; // NEW (research.md §4)
}
```

## New: Combine-Forecast-Sources Preference

Mirrors `src/services/units.ts`'s existing `getUnitPreference`/`setUnitPreference` pattern exactly:

```ts
// src/services/combineForecastPreference.ts
export function getCombineForecastSourcesPreference(): boolean;
export function setCombineForecastSourcesPreference(value: boolean): void;
```

```ts
// src/hooks/useCombineForecastSourcesPreference.ts
export function useCombineForecastSourcesPreference(): {
  combineForecastSources: boolean;
  setCombineForecastSources: (value: boolean) => void;
};
```

## New: `MultiSourceForecast` (`src/services/weatherApi.ts`)

```ts
export interface MultiSourceForecastEntry {
  source: "smhi" | "open-meteo";
  observations: WeatherObservation[]; // forecast points only (isForecast: true on every point)
}

export function getMultiSourceForecast(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<MultiSourceForecastEntry[]>;
```

## New: Averaged-Forecast Chart Rows (`src/components/chartData.ts`)

```ts
export function sourceKey(index: number): string; // "source0", "source1", ... — distinct from
                                                     // the existing seriesKey (primary/nearbyN)

export function buildMultiSourceForecastRows(
  entries: MultiSourceForecastEntry[],
  unit: UnitSystem
): ChartRow[]; // one row per forecast timestamp; each row has one key per source plus "average"
```

## Changed: `dailyAggregation.ts`

```ts
export interface SubDayPeriod {
  label: "morning" | "lunch" | "afternoon" | "evening" | "night";
  startHour: number; // local hour, inclusive
  endHour: number;   // local hour, exclusive (wraps past midnight for "night")
}

export const SUB_DAY_PERIODS: SubDayPeriod[]; // the five fixed periods (research.md §8)

export function toSubDayAndDailyBuckets(
  observations: WeatherObservation[],
  dailyBucketCount: number
): DailyAggregate[]; // same element shape as toDailyAggregates's return, more elements
                       // for the first two days when data reaches that far
```

`DailyAggregate` itself gains no new fields — sub-day buckets are still just `DailyAggregate`
values, one per sub-day period instead of one per calendar day, differentiated only by how
narrow a time window each `bucketEnd` represents (no new "granularity" flag needed, since
`timelineData.ts` already derives each period's `label` from `bucketEnd` independent of bucket
width).

## Field Population Rules

| Field | Source | Gating |
|---|---|---|
| `TimelineRowPoint.high`/`.low` (temperature row) | `DailyAggregate.high`/`.low`, unit-converted the same way `average` already is | Only set by `buildDailyTimelineData`; always `undefined` from `buildHourlyTimelineData` |
| `MultiSourceForecastEntry[]` | `weatherApi.getMultiSourceForecast` | Only called when `combineForecastSources` preference is `true` |
| `ChartRow.average` (multi-source) | Mean of whichever sources have a non-null value at that timestamp | Computed per-timestamp, not per-series — a timestamp with only one source's data still gets an average (equal to that one value), per FR-017 |
| Sub-day `DailyAggregate` entries | `toSubDayAndDailyBuckets`, reusing `toDailyAggregates`'s per-bucket aggregation math over narrower windows | Only for the first two calendar days; days 3+ use the existing unchanged 24h-bucket path |

## Validation Rules

- `TimelineRowPoint.high`/`.low` are never fabricated when `average` is null — if a day's bucket
  has no temperature readings at all, all three (`value`/`high`/`low`) stay `null` together.
- `getMultiSourceForecast` never throws — a failed/uncovered source is simply absent from its
  result array, mirroring every existing provider function's fail-soft convention in this app.
- Nordic sorting (`searchPlaces`) never removes a result — the returned array's length is always
  identical to what the API returned, only reordered.
- Sub-day buckets never span across the two-day/day-3-onward boundary — the boundary itself is
  fixed at exactly 2 calendar days from "now," matching `toDailyAggregates`'s own existing bucket
  boundaries so the two bucketing strategies compose without a gap or overlap.
