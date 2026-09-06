# Data Model: Restore Rain Chance & Remove Overview Blend Count

## `src/services/smhiProvider.ts`

### `SmhiForecastData` — gains `probability_of_precipitation`

```ts
interface SmhiForecastData {
  air_temperature?: number;
  wind_speed?: number;
  wind_from_direction?: number;
  wind_speed_of_gust?: number;
  precipitation_amount_mean?: number;
  cloud_area_fraction?: number;
  symbol_code?: number;
  /** Percent (0-100), SMHI's own chance-of-rain reading (024-restore-rain-chance,
   *  research.md §1 — parsed for the first time; previously only Open-Meteo's equivalent field
   *  was read, so SMHI-sourced forecast points never carried a chanceOfRain value). */
  probability_of_precipitation?: number;
}
```

### `buildForecastHourlySeries` — sets `chanceOfRain`

```ts
forecast.push({
  timestamp,
  temperature: data?.air_temperature ?? null,
  precipitation: data?.precipitation_amount_mean ?? null,
  windSpeed: data?.wind_speed ?? null,
  cloudCoverPercent: data?.cloud_area_fraction !== undefined ? data.cloud_area_fraction * 12.5 : null,
  windDirection: data?.wind_from_direction ?? null,
  windGust: data?.wind_speed_of_gust ?? null,
  symbolCondition: symbolCodeToCondition(data?.symbol_code, timestamp),
  chanceOfRain: data?.probability_of_precipitation ?? null,
  isForecast: true,
});
```

(`WeatherObservation.chanceOfRain` already exists and is already consumed generically by
`timelineData.ts`/`dailyAggregation.ts`/`WeatherIconOverview.tsx`'s Rain row — no downstream
change needed; this is purely a new value flowing into an existing, already-correct pipeline.)

## `src/components/WeatherIconOverview.tsx`

### `LineRow` — drops the "(avg...)" suffix

```tsx
// Before:
{point.combined
  ? `${formatRowValue(row, point.value)} (avg${point.combinedSourceCount && point.combinedSourceCount > 2 ? ` of ${point.combinedSourceCount}` : ""})`
  : highLowVisible && point.high != null && point.low != null
    ? `${formatRowValue(row, point.value)} (H ${formatValue(point.high, 0)}° / L ${formatValue(point.low, 0)}°)`
    : formatRowValue(row, point.value)}

// After:
{highLowVisible && point.high != null && point.low != null
  ? `${formatRowValue(row, point.value)} (H ${formatValue(point.high, 0)}° / L ${formatValue(point.low, 0)}°)`
  : formatRowValue(row, point.value)}
```

(`point.combined`/`point.combinedSourceCount` are no longer read by this line, but remain defined
on `TimelineRowPoint` and set by `mergeMultiSourceIntoTimelinePoints` — unused here, still used
nowhere else since the value itself was always what mattered; no interface change needed.)

## Validation Rules

- `chanceOfRain` is only ever set from a genuine `probability_of_precipitation` value in SMHI's
  response — `?? null`, never a fabricated default (FR-005).
- The blended value's own number is byte-for-byte unchanged by the annotation removal — only the
  displayed text differs (FR-004).
