# Contract: Provider parsing additions (internal — `smhiProvider.ts` / `openMeteoProvider.ts`)

Both providers' `getObservations`/`getForecastOnly` functions keep their existing signatures and return shapes (`ObservationSeries`/`WeatherObservation[]`) — this only adds three optional fields (data-model.md) to each `WeatherObservation` they already build, using response fields both providers already return but don't currently parse.

## `smhiProvider.ts`

- **Observations** (`metobs`): add parameter **21** ("Byvind", gust wind, m/s, max/hour) and parameter **3** ("Vindriktning", wind direction, degrees, 10-min average/hour — confirmed via SMHI's parameter catalog to share the exact same cadence as the existing wind-speed parameter 4, unlike the higher-frequency parameter 48 of the same name) to the existing `Promise.all` alongside parameters 1/4/7/16, following the exact same `fetchParameterValues` degrade-to-null-on-failure pattern already used for precipitation/wind/cloud.
- **Forecast** (`snow1g`, 006): read `wind_from_direction` and `wind_speed_of_gust` directly off each `timeSeries` entry's `data` object (research.md §2 — confirmed present, no new fetch).
- Both map onto `WeatherObservation.windDirection`/`windGust` (data-model.md), `null` when the source field is absent, matching every existing field's convention.

## `openMeteoProvider.ts`

- Add `wind_direction_10m` and `wind_gusts_10m` to the existing `hourly` query parameter (already a comma-separated list — research.md §2 confirms both are valid variables on the same `/v1/forecast` endpoint already called). No new request.
- Map onto the same `WeatherObservation.windDirection`/`windGust` fields, unit-converted the same way `wind_speed_10m` already is (gusts share the `wind_speed_unit` query param already set to `"ms"`).
- `relativeHumidity` (data-model.md, feels-like input only): add `relative_humidity_2m` to the same `hourly` parameter list.

## Unchanged

`getForecastOnly`'s contract (006) — still returns the forecast-tagged subset only; the new fields ride along on the same points, no shape change.
