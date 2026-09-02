# Phase 1 Data Model: Timeline Weather Dashboard Redesign

Extends the existing model (`WeatherObservation`/`DailyAggregate`, carried through 005–007) with a small number of optional fields, plus two new purely-computed, non-persisted types.

## Extended entities

### `WeatherObservation` (extended)

| Field | Type | Notes |
|---|---|---|
| *(existing fields unchanged: `timestamp`, `temperature`, `precipitation`, `windSpeed`, `cloudCoverPercent`, `isForecast`)* | — | Unchanged. |
| `windDirection` *(new)* | `number \| null` | Degrees (0–360, meteorological convention: direction the wind is blowing *from*). Parsed from both providers (research.md §2); `null` when unavailable, same convention as the existing fields. |
| `windGust` *(new)* | `number \| null` | Meters per second, same unit as `windSpeed`. Parsed from both providers (research.md §2). |
| `relativeHumidity` *(new)* | `number \| null` | Percent (0–100), used only as an input to the feels-like calculation (research.md §3) — not displayed as its own row in this feature. |

**Validation / invariants**: All three new fields follow the exact null-means-"not reported" convention every existing field already uses — no new "unavailable" representation is introduced.

### `DailyAggregate` (extended)

| Field | Type | Notes |
|---|---|---|
| *(existing fields unchanged)* | — | Unchanged. |
| `windGustHigh` *(new)* | `number \| null` | Max of the bucket's `windGust` readings, mirroring how `windHigh`/`windLow` are already derived from `windSpeed`. |
| `feelsLikeAverage` *(new)* | `number \| null` | Mean of the bucket's computed feels-like values (data-model.md's new derived value, below) — computed once the underlying observations already have it, the same way `average`/`windAverage` are already derived. |

## New derived (computed, not fetched/stored) values

### Feels-Like Temperature

A single number per `WeatherObservation`, computed on demand (not fetched or persisted) from that observation's `temperature`, `windSpeed`, and `relativeHumidity` via one shared formula (research.md §3). `null` when `temperature` is `null` (nothing to adjust).

### Snow Amount

A single number per period, computed on demand: equals that period's `precipitation` when `deriveWeatherCondition` (007, unchanged) classifies it as `"snowy"`, otherwise absent — the row simply omits that period's cell rather than showing a zero (spec FR-011: shown only where meaningful, not as a misleading always-present zero).

### Sun & Moon Summary (new, not persisted)

Computed once per displayed period (not per hour), purely from the selected location's latitude/longitude and the displayed date(s) — no relationship to `WeatherObservation`/`DailyAggregate` at all, since it's an astronomical fact independent of weather data.

| Field | Type | Notes |
|---|---|---|
| `sunrise` | `string \| null` (ISO 8601) | Computed via research.md §4's approach; `null` on a date with no sunrise at this latitude (polar day/night). |
| `sunset` | `string \| null` (ISO 8601) | Same; `null` on a date with no sunset (polar day/night). |
| `moonPhase` | one of 8 conventional phase names | Computed via research.md §4's synodic-month approximation. |

## Relationships

- `WeatherObservation`'s three new fields are scalar additions to the existing entity — no new relationships.
- `DailyAggregate`'s two new fields are likewise scalar additions, derived from `WeatherObservation` the same way every other daily field already is (`toDailyAggregates`, unchanged in shape, extended in what it aggregates).
- Feels-Like Temperature and Snow Amount are per-point derived values with no independent identity — same pattern as 007's `WeatherCondition` (a pure function's output, not a stored field).
- Sun & Moon Summary has no relationship to any per-point entity — it's keyed only by location + date, computed once per view render, not once per row.
