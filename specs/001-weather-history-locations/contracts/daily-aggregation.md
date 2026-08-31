# Contract: Daily Aggregation (`services/dailyAggregation.ts`)

Internal module contract for turning an hourly `ObservationSeries` into the 7 `DailyAggregate` points the weekly graph renders (FR-014, FR-018, [research.md](../research.md) §12, [data-model.md](../data-model.md) `DailyAggregate`). Pure, synchronous, no I/O.

## Function: `toDailyAggregates`

```ts
function toDailyAggregates(observations: WeatherObservation[]): DailyAggregate[]
```

### Preconditions

- `observations` is expected to be an hourly `"last-7-days"` series (≤168 points) ordered oldest → newest, as produced by `weatherApi.getObservations(location, "last-7-days")` — this function does not fetch or re-order data itself.

### Behavior

1. Divides the trailing window into exactly 7 rolling 24-hour buckets ending at the current hour, bucket 0 = most recent `(now - 24h, now]`, bucket 6 = oldest `(now - 168h, now - 144h]`.
2. Assigns each `WeatherObservation` to the bucket whose range contains its `timestamp`.
3. For each bucket, computes `high`/`low`/`average`/`totalPrecipitation` from only the non-`null` values assigned to it (per-field: a `null` temperature is excluded from `high`/`low`/`average`; a `null` precipitation is excluded from the `totalPrecipitation` sum).
4. A bucket with **zero** non-`null` temperature readings produces `high: null, low: null, average: null`; a bucket with zero non-`null` precipitation readings produces `totalPrecipitation: null` — these are independent per-field checks, not "the whole bucket is a gap only if everything is missing" (a bucket could have temperature readings but no precipitation readings, or vice versa).
5. Returns exactly 7 `DailyAggregate` entries, oldest → newest (bucket 6 first, bucket 0 last), regardless of how many are all-`null`.

### Error / edge handling

| Condition | Result |
|---|---|
| `observations` is empty | Returns 7 all-`null` `DailyAggregate` entries (every bucket has zero readings) — not an error, mirrors an `"unavailable"` `ObservationSeries` rendering as a fully-gapped chart |
| `observations` has fewer than 168 points (e.g., a gappy SMHI series) | Buckets with no matching observations are `null` per point 4 above; buckets with partial coverage aggregate over whatever they have |
| `observations` contains a timestamp outside the 7-day range (defensive) | Ignored — not assigned to any bucket, since only bucket 0–6 exist |

### Postconditions

- Always returns exactly 7 entries — callers (`ObservationChart.tsx`) never need to handle a variable-length result for the weekly graph.
- Never mutates the input `observations` array.
