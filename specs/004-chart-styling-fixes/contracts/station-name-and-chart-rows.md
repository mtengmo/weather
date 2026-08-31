# Contract: Station Name Fallback and Shared High/Low/Average Row Builder

## `services/smhiProvider.ts` — station name fallback (FR-001, FR-002)

```ts
function getNearestStations(
  location: Pick<Location, "latitude" | "longitude">,
  count: number
): Promise<StationInfo[]> // StationInfo.displayName now guaranteed non-blank
```

- `nearestActiveStations` (internal) MUST set `displayName` to the source station's `name` when it is non-blank (after trimming), and to the literal fallback `"Unnamed station"` otherwise. This is the single construction point for every `StationInfo` the app produces (both `getNearestStations` and `getObservations`'s own internal nearest-station lookups), so every consumer — `ObservationChart.tsx`'s legend/tooltip strings, `ObservationDetails.tsx`'s table column headers — inherits the guarantee with no change of their own.

## `components/chartData.ts` — shared high/low/average daily row builder (FR-009, FR-010)

```ts
interface HighLowAverageFields {
  high: keyof Pick<DailyAggregate, "high" | "windHigh">;
  low: keyof Pick<DailyAggregate, "low" | "windLow">;
  average: keyof Pick<DailyAggregate, "average" | "windAverage">;
}

function buildHighLowAverageDailyRows(
  primary: ObservationSeries,
  nearbyStations: NearbyStationSeries[],
  unit: UnitSystem,
  bucketCount: number,
  fields: HighLowAverageFields,
  convert: (value: number | null, unit: UnitSystem) => number | null
): ChartRow[] // rows keyed "primaryHigh" / "primaryLow" / "primaryAverage" / seriesKey(i+1) per nearby station's average
```

- Used by both `buildDailyRows` (temperature — wraps this and adds the `primaryPrecipitation` bar field on top) and a new `buildWindDailyRows` (wind — calls this directly, no bar field), so the two metrics' 7-day/30-day row-building logic is the same function parameterized by field selection and unit-conversion function, not two independent implementations (research.md §4).
- Nearby-station rows carry only their **average** value (`seriesKey(i + 1)` → that station's `average`/`windAverage`), consistent with the existing temperature daily view's behavior (comparison stations show one line — their average — not their own high/low) — this feature does not change that.

## Postconditions

- `buildDailyRows(primary, nearby, unit, bucketCount)` produces byte-for-byte the same output as before this feature, for any input that produced valid output before (the refactor into a shared helper is behavior-preserving for temperature).
- `buildWindDailyRows(primary, nearby, unit, bucketCount)` produces rows with the same shape (`bucketEnd`, `primaryHigh`, `primaryLow`, `primaryAverage`, `seriesKey(i+1)`) as `buildDailyRows`, sourced from `windHigh`/`windLow`/`windAverage` instead of `high`/`low`/`average`, converted via `convertWindSpeed` instead of `convertTemperature`.
