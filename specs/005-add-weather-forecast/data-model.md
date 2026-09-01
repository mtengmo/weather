# Phase 1 Data Model: Add Weather Forecast

This extends the existing model in `src/models/types.ts`; it does not replace it. Field names below are illustrative of shape/intent — exact naming is an implementation detail for `/speckit-tasks`, not a contract this document fixes.

## Extended entities

### `WeatherObservation` (extended)

The existing per-timestamp reading, extended with a status flag so one array can hold both halves of a merged series.

| Field | Type | Notes |
|---|---|---|
| `timestamp` | `string` (ISO 8601) | Unchanged. |
| `temperature` | `number \| null` | Unchanged (Celsius as fetched). |
| `precipitation` | `number \| null` | Unchanged (millimeters as fetched). |
| `windSpeed` | `number \| null` | Unchanged (m/s). |
| `cloudCoverPercent` | `number \| null` | Unchanged (0–100). |
| `isForecast` *(new)* | `boolean` | `true` for a predicted point, `false`/absent for a measured point. Drives the observed/forecast split described in research.md §4–5; computed relative to "now" at row-build time, not persisted as a fixed fetch-time judgment (research.md §5). |

**Validation / invariants**:
- A series' `observations` array is time-ordered ascending, same as today.
- `isForecast` points and non-forecast points may be interleaved only at the single boundary point where "now" falls (the boundary point itself may be duplicated across both the observed and forecast row-builder outputs — see research.md §4 — but the underlying `WeatherObservation` array holds each timestamp once).
- All existing per-metric null-handling (a metric reporting `null` because the provider didn't supply it) is unchanged and applies equally to forecast points.

### `ObservationSeries` (unchanged shape, extended meaning)

No new fields. `observations` may now include points with `isForecast: true` appended after the most recent measured point. `status` (`loading | ready | unavailable`) keeps its existing meaning at the whole-series level; a series with observed data but no forecast data is still `"ready"` (forecast absence is metric/point-level, not series-level — see FR-009's existing "data unavailable" pattern, applied per-metric as it already is today for missing observed metrics).

### `DailyAggregate` (extended)

The existing rolling-24h-bucket aggregate used for the 7-day view, extended the same way:

| Field | Type | Notes |
|---|---|---|
| *(existing fields: `bucketEnd`, `high`, `low`, `average`, `totalPrecipitation`, `windAverage`, `cloudAverage`, `windHigh`, `windLow`)* | — | Unchanged. |
| `isForecast` *(new)* | `boolean` | `true` when the bucket's underlying observations are forecast points (or a mix that skews forecast — see Open Question below), mirroring `WeatherObservation.isForecast`. |

**Open question deferred to `/speckit-tasks`**: a rolling 24h bucket that straddles the observed/forecast boundary (partly measured, partly predicted) needs a bucket-level classification rule (e.g. "forecast if any constituent point is forecast" vs. "forecast if the bucket's `bucketEnd` is in the future"). Either rule is a small, local decision inside `toDailyAggregates`; flagged here rather than resolved, since it doesn't change the shape above.

### `Location` (unchanged shape, changed value source for current-position)

No new fields. For `source: "current-position"`, `displayName` is now populated from the resolved nearest station's name (research.md §6) instead of the literal string `"Current Location"`. Favorite and searched locations are unaffected (unchanged per spec FR-008 scope).

## New concept (no new top-level type required)

### Merged Metric Series (conceptual, not a new interface)

The spec's "Merged Metric Series" (spec.md Key Entities) is realized as **existing row-builder output** (`ChartRow[]` in `chartData.ts`) gaining, per logical series index, a second data key for the forecast continuation (e.g. today's `primary` gains a sibling `primaryForecast`; today's `seriesKey(i)` pattern extends analogously) — per research.md §4. This is a row-shaping detail, not a new persisted or fetched entity, so it is not modeled as its own type here; it is derived at render time from the extended `WeatherObservation`/`DailyAggregate` above.

## Relationships (unchanged)

`ObservationSeries` (1) → `WeatherObservation` (many); `ObservationSeries.location` (1) → `Location`; `NearbyStationSeries` (many, primary-only excluded from forecast per FR-006) → `StationInfo` + `ObservationSeries`. No relationship shapes change — only the point-level and bucket-level `isForecast` addition, and the current-position `Location.displayName` source.
