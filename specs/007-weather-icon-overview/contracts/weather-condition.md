# Contract: `src/services/weatherCondition.ts` (new, internal)

## Export

A pure function deriving a `WeatherCondition | null` (data-model.md) from one period's values:

- **Input**: `{ temperature: number | null; precipitation: number | null; windSpeed: number | null; cloudCoverPercent: number | null; timestamp?: string }`. `timestamp` is required to distinguish `"clear-day"` from `"clear-night"` (research.md §3) — when omitted (the daily/7-day case), a clear result always resolves to `"clear-day"`.
- **Output**: One of the six `WeatherCondition` values, or `null` when `temperature === null && precipitation === null` (the existing gap-detection rule, reused — research.md §2).
- **Contract**: Pure, synchronous, no side effects, no unit conversion (operates on raw metric values exactly as stored on `WeatherObservation`/`DailyAggregate` — the caller converts for *display*, not for condition derivation, so thresholds in this module are defined once in metric units regardless of the active `UnitSystem`).
- **Priority order** (evaluated top to bottom, first match wins): no-data → snowy → rainy → windy → cloudy → clear (day/night). Exact threshold constants (freezing point, windy speed, cloudy percentage) are implementation details for `/speckit-tasks`, values per research.md §2.

## Callers

Only `WeatherIconOverview.tsx` (new, this feature) calls this function — once per displayed period, mapping over `series.observations` (24h) or `toDailyAggregates(series.observations, bucketCount)` (7-day), the same source arrays the existing chart/details views already consume.
