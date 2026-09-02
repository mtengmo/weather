# Contract: Provider Field Mapping for Chance of Rain

## Open-Meteo (`src/services/openMeteoProvider.ts`)

**Request change**: append `precipitation_probability` to the existing `hourly` query parameter
string in `fetchHourlyPoints`:

```
temperature_2m,precipitation,wind_speed_10m,cloud_cover,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,precipitation_probability
```

**Response shape addition** (`OpenMeteoHourlyResponse.hourly`):

```ts
precipitation_probability?: (number | null)[];
```

**Mapping**: `chanceOfRain: precipitation_probability?.[i] ?? null`, applied in both
`getObservations` and `getForecastOnly`'s shared per-point mapping — mirrors exactly how
`windDirection`/`windGust`/`relativeHumidity` were added in 008.

No unit conversion: Open-Meteo already returns a 0-100 integer percent.

## SMHI (`src/services/smhiProvider.ts`)

**No change.** `SmhiForecastData` gains no new field — confirmed in research.md §1 that SMHI's
point-forecast API has no probability-of-precipitation parameter. `WeatherObservation.chanceOfRain`
is simply left `undefined` for every SMHI-sourced point (both `buildHourlySeries` for observed data
and `buildForecastHourlySeries` for SMHI's own forecast data), which downstream code already
treats identically to "not available" (data-model.md's field population rules).

## Downstream consumers

- `src/services/dailyAggregation.ts`: reads `o.chanceOfRain ?? null` per observation in a bucket,
  filtered to `o.isForecast === true` observations only, takes the max (mirrors `windGustHigh`).
- `src/components/timelineData.ts`: reads `obs.chanceOfRain` (hourly) / `day.chanceOfRainMax`
  (daily) into each `RowSource`, then the precipitation row's point-mapping applies the
  `isForecast`-gated null-out described in data-model.md before it ever reaches rendering.
- `src/components/WeatherIconOverview.tsx`'s `BarRow`: renders
  `point.chanceOfRain !== null && point.chanceOfRain !== undefined` as a secondary line under the
  existing bar value line, formatted as `${Math.round(point.chanceOfRain)}%` (whole-number percent,
  consistent with how this row already has no fractional precision expectation).
