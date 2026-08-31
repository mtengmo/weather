# Contract: Daily Aggregation — Wind High/Low

Extends `003-extended-history-metrics`'s `daily-aggregation.md` contract (`services/dailyAggregation.ts`).

```ts
function toDailyAggregates(
  observations: WeatherObservation[],
  bucketCount: number
): DailyAggregate[] // DailyAggregate now also carries windHigh/windLow
```

- Each `DailyAggregate` additionally computes `windHigh`/`windLow` the same way `high`/`low` are already computed for temperature: `Math.max(...windSpeeds)`/`Math.min(...windSpeeds)` over that bucket's non-null `windSpeed` readings, `null` if the bucket has zero non-null `windSpeed` readings (data-model.md).
- `windHigh`/`windLow` are computed independently of `windAverage`/`average`/`totalPrecipitation`/`cloudAverage` — a gap in one field's readings does not affect another field's aggregate for the same bucket (mirrors the existing per-field gap independence already established for `windAverage`/`cloudAverage` in `003-extended-history-metrics`).

## Postconditions

- For any bucket where `windHigh` and `windLow` are both non-null, `windHigh >= windLow`.
- Existing callers reading only `high`/`low`/`average`/`totalPrecipitation`/`windAverage`/`cloudAverage` see byte-for-byte identical output to before this change — `windHigh`/`windLow` are purely additive fields.
