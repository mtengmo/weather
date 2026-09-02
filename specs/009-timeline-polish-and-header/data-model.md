# Data Model: Timeline Polish and Header Consolidation

## New: Cached Location (`localStorage`)

No new TypeScript type — reuses the existing `Location` interface (`src/models/types.ts`)
verbatim, serialized as JSON under a new `localStorage` key, following `units.ts`'s existing
key-naming convention:

```ts
const STORAGE_KEY = "weather-app:last-location:v1";
```

```ts
// src/services/locationCache.ts
export function getCachedLocation(): Location | null { ... }
export function setCachedLocation(location: Location): void { ... }
```

Both wrapped in `try/catch` (Edge Cases: `localStorage` unavailable degrades to no persistence,
matching `units.ts`/`theme.ts`'s existing pattern exactly).

## Changed: `TimelineRowPoint` (`src/components/timelineData.ts`)

One new optional field, following the existing pattern of `direction`/`chanceOfRain`:

```ts
export interface TimelineRowPoint {
  isForecast: boolean;
  value: number | null;
  direction?: number | null;      // wind row only
  chanceOfRain?: number | null;   // precipitation row only (011)
  gust?: number | null;           // wind row only (009) — replaces the standalone gust row
  /** true when `value` was derived by interpolating this row's neighboring points at the
   *  observed/forecast boundary, rather than measured/forecast directly (009 FR-012/FR-013). */
  interpolated?: boolean;
}
```

## Removed: standalone `cloud`, `feelsLike`, `gust` rows

`TimelineData`'s `cloud`, `feelsLike`, and `gust` fields (`src/components/timelineData.ts`) are
removed entirely — not just hidden. `gust`'s data moves onto the existing `wind` row's points
(`TimelineRowPoint.gust`, above) instead of remaining a sibling row. `snow` stays unchanged (not
in scope for this feature — the spec doesn't ask for its removal).

```ts
export interface TimelineData {
  periods: TimelinePeriod[];
  nowBoundaryIndex: number | null;
  temperature: TimelineRow;
  precipitation: TimelineRow;
  wind: TimelineRow;   // now also carries gust per point
  snow: TimelineRow;
  // cloud, feelsLike, gust: REMOVED
}
```

## Changed: hour label formatting (`buildHourlyTimelineData`)

```ts
// Before:
label: new Date(obs.timestamp).toLocaleTimeString([], { hour: "2-digit" })
// After:
label: new Date(obs.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", hourCycle: "h23" })
```

No type change — `TimelinePeriod.label` stays `string`.

## Field Population Rules

| Field | Rule |
|---|---|
| `TimelineRowPoint.gust` (wind row) | Same source as the removed standalone gust row: `obs.windGust` (hourly) / `day.windGustHigh` (daily), unit-converted the same way, rounded to whole numbers at render time (FR-008) |
| `TimelineRowPoint.interpolated` | `true` only for the single point at `periods[nowBoundaryIndex + 1]` in the **hourly** builder, and only when both neighbors (`nowBoundaryIndex`, `nowBoundaryIndex + 2`) have non-null values (research.md §3); absent (`undefined`/falsy) everywhere else, including the entire daily builder |
| Cached `Location` | Written only from `App.tsx`'s `selectLocation` (explicit user action), never from the passive `currentLocation`-sync effect (research.md §4) |

## Validation Rules

- Interpolated values still respect each row's existing unit conversion and rounding — no new
  precision rules beyond FR-008's "whole numbers for wind/gust."
- A cached `Location` with `source: "favorite"` is only trusted if a favorite with matching
  `latitude`/`longitude` still exists at mount time (research.md §5); otherwise treated as absent.
- `0` remains a valid, non-absent value throughout (existing convention, unaffected by this
  feature) — interpolation and gust-merge logic both use `!== null` checks, never truthiness.
