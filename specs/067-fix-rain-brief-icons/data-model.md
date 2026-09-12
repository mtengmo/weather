# Phase 1 Data Model: Stop Brief Morning Rain From Marking the Whole Day, and Refresh Weather Icon Artwork

## `DailyAggregate` (extended further)

Building on 066's five `daytime*` fields, three more optional fields are added to
`src/models/types.ts`, computed alongside them in `toDailyAggregates`' daytime-filtered pass:

| Field | Type | Meaning |
|---|---|---|
| `daytimeHourCount` | `number \| null` | Count of the bucket's daytime-hour (6 AM-8 PM) observations that have a precipitation reading at all |
| `daytimeRainHourCount` | `number \| null` | Of those, how many have measurable rain (`precipitation > 0`) |
| `daytimeMaxHourlyPrecipitation` | `number \| null` | The single highest hourly precipitation reading among the bucket's daytime-hour observations |

**Validation / invariants**:
- All three are `null` together exactly when `daytimeHourCount` would be `0` (no daytime
  observation in the bucket has a precipitation reading at all) — mirrors the existing
  null-when-empty convention every other `daytime*`/whole-bucket field already follows.
- `daytimeRainHourCount <= daytimeHourCount` always holds when both are non-null.
- These are read-only derived counts — nothing downstream writes back to them, and they do not
  replace or alter `daytimeTotalPrecipitation`'s existing meaning (still the raw sum, per 066's
  data-model.md) or any whole-bucket field.
- Only computed by `toDailyAggregates` (matching where 066's other `daytime*` fields are
  computed) — never by `toSubDayBuckets`, whose sub-day periods are already narrow enough that
  this further split is meaningless and which no consumer of this feature reads.

## Derived (non-stored) value: "is this day's daytime rain meaningful?"

Not a new `DailyAggregate` field — a small boolean computed inline in
`WeeklyForecastStrip.tsx` at render time from the three fields above plus the existing
`PRECIPITATION_HEAVY_THRESHOLD_MM` constant (now exported from `weatherCondition.ts`):

```
meaningful =
  daytimeHourCount != null && daytimeRainHourCount != null &&
  ( daytimeRainHourCount / daytimeHourCount > 0.5
    || (daytimeMaxHourlyPrecipitation ?? 0) >= PRECIPITATION_HEAVY_THRESHOLD_MM )
```

When `false`, the precipitation value passed into `deriveWeatherCondition` for that day becomes
`0` instead of `daytimeTotalPrecipitation` (or the whole-bucket fallback's `totalPrecipitation`,
per 066's existing fallback path) — every other input to `deriveWeatherCondition` (temperature,
wind, cloud cover, chance of rain) is unaffected. When `daytimeHourCount`/`daytimeRainHourCount`
are `null` (066's existing "no daytime data at all" fallback case), this new check is bypassed
entirely and 066's whole-bucket fallback behavior applies unchanged.

## Weather icon artwork (US2) — no schema change

The regenerated files are a pure content replacement at the exact same 124 paths/names already
described by 063-replace-weather-icons' own data-model.md (`weather_{type}_{day|night}_{band}.png`
under `src/assets/weather-icons-v2/`). No new entity, field, or naming convention is introduced.
