# Phase 1 Data Model: Nearby-Station Name Fix and Temperature/Wind Chart Styling

All changes are additive extensions to types defined in prior features (`001-weather-history-locations`, `003-extended-history-metrics`), plus one new preference type. No existing field is removed or reinterpreted.

## StationInfo (unchanged shape, stricter construction rule)

```ts
export interface StationInfo {
  id: string;
  displayName: string; // now guaranteed non-blank (research.md §1) — "Unnamed station" when the source has no name
  distanceKm: number;
  latitude: number;
  longitude: number;
}
```

No field added or removed — only the value `smhiProvider.ts` places into `displayName` changes (never blank/whitespace-only going forward).

## DailyAggregate (extended)

```ts
export interface DailyAggregate {
  bucketEnd: string;
  high: number | null;              // temperature (unchanged)
  low: number | null;               // temperature (unchanged)
  average: number | null;           // temperature (unchanged)
  totalPrecipitation: number | null; // (unchanged)
  windAverage: number | null;        // (unchanged, from 003-extended-history-metrics)
  cloudAverage: number | null;       // (unchanged, from 003-extended-history-metrics)
  windHigh: number | null;           // NEW — max of the bucket's non-null windSpeed readings
  windLow: number | null;            // NEW — min of the bucket's non-null windSpeed readings
}
```

`windHigh`/`windLow` follow the same null-when-empty-bucket rule as every other aggregate field (research.md §4).

## HighLowVisibility (new)

```ts
export type HighLowVisibility = boolean;
export const DEFAULT_HIGH_LOW_VISIBLE = true;
```

Persisted in `localStorage` under its own key (`weather-app:high-low-visible:v1`), following the same `get`/`set`/hook shape as `Theme`/`UnitSystem`/`NearbyStationCount`. A single global preference (not tracked per metric) — set once, applies to both the temperature and wind 7-day/30-day charts (research.md §3, per this spec's Assumption that the option is global).

## Chart color constants (not a persisted entity, but part of this feature's "shape")

Two new fixed constants in `components/seriesColors.ts` (research.md §2):

```ts
export const HIGH_COLOR = "#dc2626";
export const LOW_COLOR = "#0ea5e9";
```

Used only for the **primary** location's "high"/"low" lines on the temperature and wind 7-day/30-day charts. Not used for the "average" line (keeps `seriesColor(0)`) or for any nearby comparison station's line (keeps `seriesColor(i + 1)`/`seriesDash(i + 1)`, unchanged).

## Validation rules

- `windHigh`/`windLow`, when both non-null for the same bucket, satisfy `windHigh >= windLow` (by construction — max/min of the same non-empty set).
- `StationInfo.displayName` is never an empty string or whitespace-only string after this feature ships (research.md §1) — downstream code (chart legends, tooltips, details-table headers) needs no additional blank-check of its own.
- No existing field, entity, or persisted key from `001`-`003` is removed, renamed, or reinterpreted by this feature.
