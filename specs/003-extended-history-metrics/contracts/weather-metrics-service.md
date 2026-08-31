# Contract: Weather/Provider Services — Extended Metrics, Window, and Station Count

Extends `001-weather-history-locations`'s `weather-service.md` and `smhi-provider.md` contracts (`services/weatherApi.ts`, `services/smhiProvider.ts`, `services/openMeteoProvider.ts`). This document covers only what changes; everything not listed here (provider selection/fallback logic, `WeatherObservation.temperature`/`.precipitation` semantics, gap handling) is unchanged.

## `services/weatherApi.ts`

```ts
function getObservations(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow // now includes "last-30-days"
): Promise<ObservationSeries> // ObservationSeries.observations now include windSpeed/cloudCoverPercent

function getNearbyStationSeries(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow,
  count: NearbyStationCount // NEW parameter, 0-4 (was a fixed internal constant of 5)
): Promise<NearbyStationSeries[]>
```

- `getObservations` MUST populate `windSpeed`/`cloudCoverPercent` on every returned observation (as `null` for hours the provider doesn't report), regardless of `window`.
- `getNearbyStationSeries` with `count === 0` MUST return `[]` without issuing any network request (research.md §5).
- `getNearbyStationSeries` with `count` between 1 and 4 fetches at most `count` stations, using the existing "fetch one extra, skip the nearest (already the primary series)" logic, unchanged except the bound is now `count` instead of the old fixed `5`.

## `services/smhiProvider.ts`

- `getObservations` MUST additionally query parameter `4` (wind speed, m/s, no conversion) and parameter `16` (total cloud cover, percent — confirmed via SMHI's own parameter metadata, `unit: "procent"`, no conversion needed) against each metric's own nearest active station (same per-parameter nearest-station pattern already used for temperature/precipitation) and populate `windSpeed`/`cloudCoverPercent` on the built hourly series.
- `WINDOW_HOURS`/`SMHI_PERIOD` gain a `"last-30-days"` entry: `WINDOW_HOURS["last-30-days"] = 24 * 30`; `SMHI_PERIOD["last-30-days"] = "latest-months"` (same period value as `"last-7-days"` — `latest-months` already covers ~4 months, research.md §1).
- A provider request failure for wind or cloud cover alone (e.g., no station reports that parameter nearby) MUST NOT fail the whole `getObservations` call — those fields simply stay `null` for the affected hours/location, consistent with how a missing precipitation station already degrades gracefully today.

## `services/openMeteoProvider.ts`

- The `hourly` query parameter gains `wind_speed_10m,cloud_cover` (alongside the existing `temperature_2m,precipitation`).
- A new query parameter, `wind_speed_unit=ms`, is added so wind speed arrives already in meters per second.
- `pastDaysFor(window)` gains a `"last-30-days"` case returning `31`.

## Postconditions

- For any `ObservationWindow` value and any provider, `getObservations(...).observations` is an array of `WeatherObservation` where every element has all four value fields present (possibly `null`), never `undefined` — existing consumers (`chartData.ts`, `ObservationDetails.tsx`) can rely on the shape without provider-specific branching, exactly as they already do for temperature/precipitation.
