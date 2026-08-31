# Phase 1 Data Model: Extended History Window, Additional Weather Metrics, and Display Controls

All changes are additive extensions of types defined in `001-weather-history-locations`'s `data-model.md` (`src/models/types.ts`), plus one new preference type. No existing field is removed or reinterpreted.

## ObservationWindow (extended)

```ts
export type ObservationWindow = "last-24-hours" | "last-7-days" | "last-30-days";
```

`"last-30-days"` behaves like `"last-7-days"` (daily-aggregated, one point per day) with 30 buckets instead of 7 (research.md §1).

## WeatherObservation (extended)

```ts
export interface WeatherObservation {
  timestamp: string;
  temperature: number | null;      // Celsius (unchanged)
  precipitation: number | null;    // millimeters (unchanged)
  windSpeed: number | null;        // meters per second — NEW
  cloudCoverPercent: number | null; // 0-100 — NEW
}
```

Both new fields follow the existing `temperature`/`precipitation` convention: `null` means "no reading for this hour" (a gap, per FR-010/FR-022 from `001-weather-history-locations`), never a sentinel like `0` or `-1`.

## DailyAggregate (extended)

```ts
export interface DailyAggregate {
  bucketEnd: string;
  high: number | null;              // temperature (unchanged)
  low: number | null;               // temperature (unchanged)
  average: number | null;           // temperature (unchanged)
  totalPrecipitation: number | null; // (unchanged)
  windAverage: number | null;        // NEW — mean of the bucket's non-null windSpeed readings
  cloudAverage: number | null;       // NEW — mean of the bucket's non-null cloudCoverPercent readings
}
```

`windAverage`/`cloudAverage` follow the same null-when-empty-bucket rule as `average` (research.md §4).

## WeatherMetric (new)

```ts
export type WeatherMetric = "temperature" | "rain" | "wind" | "cloud";
export const DEFAULT_METRIC: WeatherMetric = "temperature";
```

Not persisted — resets to `"temperature"` on reload, consistent with the existing `obsWindow` state in `App.tsx` (also not persisted). Purely a UI-state concept selecting which of the four tabs (research.md §3) is active; it does not affect what data is fetched (`getObservations`/`getNearbyStationSeries` always fetch every metric together per FR-005's "switching tabs must not change location/window/station-count").

| Metric | Chart type | Value field(s) used |
|---|---|---|
| `"temperature"` (default) | Line + Bar | `temperature` (line), `precipitation` (bar) |
| `"rain"` | Bar | `precipitation` |
| `"wind"` | Line | `windSpeed` |
| `"cloud"` | Line | `cloudCoverPercent` |

## NearbyStationCountPreference (new)

```ts
export type NearbyStationCount = 0 | 1 | 2 | 3 | 4;
export const DEFAULT_NEARBY_STATION_COUNT: NearbyStationCount = 4;
```

Persisted in `localStorage` under its own key (`weather-app:nearby-station-count:v1`), following the exact shape of the existing `Theme`/`UnitSystem` preferences (`001-weather-history-locations` data-model.md) — a `get`/`set` pair plus a hook. Applies uniformly across all four metrics (FR-006a) and both the graph and details views.

## Validation rules

- `windSpeed` and `cloudCoverPercent` are `null` for any hour a provider doesn't report (gap semantics unchanged from `001-weather-history-locations`).
- `cloudCoverPercent`, when non-null, is always in `[0, 100]` regardless of provider (both SMHI and Open-Meteo report this parameter directly in percent — research.md §2); no downstream code needs provider-specific unit knowledge.
- `NearbyStationCount` is always one of `0 | 1 | 2 | 3 | 4`; a stored value outside this set (e.g. a stale `5` from before this feature) falls back to the default `4`, mirroring how `getThemePreference()`/`getUnitPreference()` already fall back on an invalid stored value.
- No existing field, entity, or persisted key from `001-weather-history-locations`/`002-vibrant-award-theme` is removed or renamed.
