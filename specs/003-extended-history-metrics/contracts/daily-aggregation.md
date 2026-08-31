# Contract: Daily Aggregation — Parameterized Bucket Count and New Fields

Extends `001-weather-history-locations`'s `daily-aggregation.md` contract (`services/dailyAggregation.ts`).

```ts
function toDailyAggregates(
  observations: WeatherObservation[],
  bucketCount: number // NEW parameter — was a hardcoded BUCKET_COUNT = 7
): DailyAggregate[]
```

- `bucketCount` is `7` for `"last-7-days"` and `30` for `"last-30-days"` (research.md §1). The bucketing logic itself (rolling 24h windows relative to "now," oldest-to-newest ordering, gap-when-empty) is unchanged — only the number of buckets varies.
- Each `DailyAggregate` additionally computes `windAverage`/`cloudAverage` the same way `average` is computed for temperature: mean of non-null values in the bucket, `null` if the bucket has zero non-null readings for that field (research.md §4). `windAverage`/`cloudAverage` are computed independently of `average`/`totalPrecipitation` — a gap in one field's readings does not affect another field's aggregate for the same bucket (mirrors the existing per-series gap independence, `001-weather-history-locations` FR-022).

## Postconditions

- `toDailyAggregates(obs, 7).length === 7` and `toDailyAggregates(obs, 30).length === 30`, always — same "always return exactly N points, gaps as `null`" guarantee the existing 7-bucket contract already makes.
- Existing callers passing `7` (the 7-day window) see byte-for-byte identical output to before this change, for the four pre-existing fields.
