# Data Model: Chance of Rain Alongside Precipitation Amount

## Extended Entities

### `WeatherObservation` (`src/models/types.ts`)

Add one optional field, following the same pattern as 008's `windDirection`/`windGust`/`relativeHumidity`:

```ts
export interface WeatherObservation {
  // ...existing fields unchanged...
  /**
   * Percent (0-100) chance of precipitation, when the source provider supplies it. Only
   * meaningful for forecast points — always treated as absent for observed points regardless
   * of what a provider returns (011-precipitation-chance, FR-004).
   */
  chanceOfRain?: number | null;
}
```

### `DailyAggregate` (`src/models/types.ts`)

Add one optional field, following the same "bucket maximum" pattern as `windGustHigh`:

```ts
export interface DailyAggregate {
  // ...existing fields unchanged...
  /** Max of the bucket's forecast chanceOfRain readings (011-precipitation-chance, FR-006). */
  chanceOfRainMax?: number | null;
}
```

### `TimelineRowPoint` (`src/components/timelineData.ts`)

Add one optional field, following the same pattern as the wind row's optional `direction`:

```ts
export interface TimelineRowPoint {
  isForecast: boolean;
  value: number | null;
  direction?: number | null; // wind row only
  /** Precipitation row only: percent (0-100) chance of rain, when available. */
  chanceOfRain?: number | null;
}
```

## Field Population Rules

| Field | Source | Gating |
|---|---|---|
| `WeatherObservation.chanceOfRain` | Open-Meteo `precipitation_probability[i]` (when the array is present in the response) | None at fetch time — raw value passed through as-is |
| `WeatherObservation.chanceOfRain` (SMHI-sourced points) | Always `undefined`/absent | SMHI's point-forecast API has no equivalent field (research.md §1) |
| `TimelineRowPoint.chanceOfRain` (precipitation row) | `source.isForecast ? (source.chanceOfRain ?? null) : null` | Explicitly nulled for any non-forecast point regardless of raw provider value (research.md §2, FR-004) |
| `DailyAggregate.chanceOfRainMax` | `Math.max(...)` of the bucket's forecast, non-null `chanceOfRain` readings, or `null` if none | Mirrors `windGustHigh`'s existing bucket-maximum pattern (research.md §3, FR-006) |

## Validation Rules

- `chanceOfRain` values are always in `[0, 100]` (Open-Meteo's native scale) — no unit conversion,
  unlike temperature/precipitation/wind which vary by `UnitSystem`.
- `0` is a valid, meaningful value and must never be treated as equivalent to `null`/absent
  (spec Edge Cases) — all comparisons/checks in this feature use `!== null` /
  `!== undefined`, never truthiness.
- No new state transitions — this is a stateless, per-render derived/passthrough value with no
  persistence.
