# Contract: 3-Day Observation Gap Fix and Forecast-Source Simplification (US1, US2)

## `src/services/dailyAggregation.ts` — `subDayBucketsForDate` (US1)

See `data-model.md` for the exact `isFirstDay` parameter and Morning-boundary-widening change.
`toSubDayBuckets` passes `isFirstDay: dayOffset === 0` at its one call site.

**Test-relevant**: an observation timestamped between local midnight and 06:00 on "today" must
now appear in the first rendered day's Morning bucket, contributing to that bucket's
high/low/average/etc. the same as any other observation would.

## Removed: `src/components/ForecastSourcesControl.tsx`, `src/hooks/useCombineForecastSourcesPreference.ts`, `src/services/combineForecastPreference.ts` (US2)

## `src/hooks/useObservationData.ts` — always fetch multi-source forecast

```ts
export function useObservationData(
  location: Location | null,
  window: ObservationWindow,
  nearbyStationCount: NearbyStationCount
): UseObservationDataResult {
  // ...
  Promise.all([
    getObservations(location, window),
    getNearbyStationSeries(location, window, nearbyStationCount),
    getMultiSourceForecast(location, window), // was: combineForecastSources ? ... : Promise.resolve([])
    window === "last-7-days" ? Promise.resolve(null) : getObservations(location, "last-7-days"),
  ]).then(/* unchanged */);
  // ...
}
```

The `combineForecastSources` parameter is removed from the function signature entirely; all
call sites (`App.tsx`) drop the corresponding argument.

## `src/components/timelineData.ts` — always merge multi-source averaging

`mergeMultiSourceIntoTimelinePoints` itself is unchanged (019 already made it average rather than
list sources) — only its call site in `WeatherIconOverview.tsx` drops the
`combineForecastSources &&` guard:

```tsx
// Before:
if (timeline !== null && combineForecastSources) {
  mergeMultiSourceIntoTimelinePoints(...);
}
// After:
if (timeline !== null) {
  mergeMultiSourceIntoTimelinePoints(...);
}
```

## `src/components/ObservationChart.tsx` — always show the combined-forecast rendering path

```tsx
// Before:
const showCombinedForecast = combineForecastSources && multiSourceForecast.length > 1;
// After:
const showCombinedForecast = multiSourceForecast.length > 1;
```

The `combineForecastSources` prop is removed from `ObservationChartProps` entirely.

## `src/App.tsx`

- Removes the `useCombineForecastSourcesPreference()` call, the `<ForecastSourcesControl>` element,
  and the `combineForecastSources`/`multiSourceForecast` prop threading changes noted above
  (`multiSourceForecast` itself is still threaded through — only the boolean gate is removed).

## No changes to

- `getObservations`'s SMHI-primary / Open-Meteo-fallback branching (`weatherApi.ts`) — already
  matches FR-004 exactly, per 019.
- `mergeMultiSourceIntoTimelinePoints`'s own averaging math — already correct since 019; only its
  callers' conditional gating is removed here.
- `toDailyAggregates`, `toSubDayBuckets`'s forward-extension/forecast-reach-cap contracts —
  unaffected by the Morning-boundary fix, which only widens one boundary for one specific day.
