# Phase 1 Data Model: Fix the Same Brief-Rain Bug on the 7-Day Forecast Graph

No new `DailyAggregate` fields — this feature reuses the `daytime*` fields 066/067 already added
(`daytimeAverage`, `daytimeTotalPrecipitation`, `daytimeWindAverage`, `daytimeCloudAverage`,
`daytimeChanceOfRainMax`, `daytimeHourCount`, `daytimeRainHourCount`,
`daytimeMaxHourlyPrecipitation`) without modification.

## New function: `deriveDailyCondition`

```ts
// src/services/weatherCondition.ts
export function deriveDailyCondition(day: DailyAggregate): WeatherCondition | null
```

Extracted from `WeeklyForecastStrip.tsx`'s existing inline logic (behavior-preserving extraction,
not a new rule):

1. `hasDaytimeData` — true if any of the five 066-era `daytime*` fields is non-null.
2. `dayRainIsMeaningful` — true if `daytimeRainHourCount / daytimeHourCount > 0.5`, or
   `daytimeMaxHourlyPrecipitation >= PRECIPITATION_HEAVY_THRESHOLD_MM` (both from 067).
3. Builds the `deriveWeatherCondition` input using the daytime fields when `hasDaytimeData` is
   true (zeroing precipitation when `dayRainIsMeaningful` is false), or the whole-bucket fields
   otherwise.

**Callers**:
- `WeeklyForecastStrip.tsx` — replaces its existing inline block with a call to this function; no
  behavior change (verified by existing tests continuing to pass unmodified).
- `src/components/timelineData.ts`'s `daysToTimelineData` — new caller, replacing its previous
  direct `deriveWeatherCondition(...)` call for the `periods[].condition` field. For 3-day/sub-day
  `day` objects (no `daytime*` fields populated), this resolves through the `hasDaytimeData: false`
  branch, reproducing today's exact output (SC-004).

**Not changed**: `daysToTimelineData`'s second `deriveWeatherCondition` call (for `isSnowy` line
styling, research.md §4) and `WeeklyForecastStrip.tsx`'s icon-resolution call
(`resolveConditionIconFromCondition`), which already consumes whatever `condition` value it's
given regardless of source.
