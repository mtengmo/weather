# Phase 1 Data Model: Combined Weather Icon Overview

This feature introduces one new derived type and reuses existing entities unchanged (`WeatherObservation`, `DailyAggregate`, `ObservationSeries` from prior features) — no new persisted or fetched fields.

## New type

### `WeatherCondition`

A closed set of six values, one of which is always assigned to a period with usable data:

| Value | Icon (research.md §1) | Meaning |
|---|---|---|
| `"clear-day"` | `Sun` | No rain/snow, not windy, low cloud cover, daytime (hourly) or any clear day (daily). |
| `"clear-night"` | `Moon` | Same as above, but nighttime — hourly view only (research.md §3). |
| `"cloudy"` | `Cloud` | Cloud cover at/above the cloudy threshold, no rain/snow/wind condition ranks higher. |
| `"rainy"` | `CloudRain` | Precipitation present, temperature above freezing. |
| `"windy"` | `Wind` | Wind speed at/above the windy threshold, no rain/snow. |
| `"snowy"` | `CloudSnow` | Precipitation present, temperature at/below freezing. |

`null` (absence of a `WeatherCondition`) represents the "no data" case (FR-008) — distinct from any of the six values, never guessed.

## Derived value (not a new type — computed, not stored)

### Icon Overview Period

The pairing an `WeatherIconOverview` component renders one grid cell for:

| Field | Type | Source |
|---|---|---|
| `label` | `string` | The period's hour (24h view) or day (7-day view), formatted the same way the existing charts already format their X-axis ticks. |
| `condition` | `WeatherCondition \| null` | Derived by `weatherCondition.ts` (data-model.md's new type) from the period's `WeatherObservation` (hourly) or `DailyAggregate` (daily). |
| `isForecast` | `boolean` | Read directly from the underlying `WeatherObservation.isForecast`/`DailyAggregate.isForecast` (005/006) — not recomputed. |
| `temperature`, `precipitation`, `windSpeed`, `cloudCoverPercent` | `number \| null` (each) | Passed through unchanged from the underlying period, for display alongside the icon (FR-005: "underlying values remain visible"), unit-converted the same way the existing charts already convert them. |

**Not persisted**: computed fresh from `ObservationSeries.observations` (already-fetched data) each time the overview view renders — no new fetch, no new stored state.

## Relationships

- One `WeatherIconOverview` period corresponds 1:1 to one existing `WeatherObservation` (24h view) or one existing `DailyAggregate` (7-day view) — no new relationship, just a derived read.
- `WeatherCondition` has no relationship to any other entity; it's a pure function's output type.
