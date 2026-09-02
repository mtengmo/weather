# Contract: Chart Readability Changes

## `src/services/weatherApi.ts`

`getObservations`'s three return paths each gain `primarySource`:

```ts
// SMHI success (with or without forecast fallback):
return { ...smhiResult, primarySource: "smhi", ... };
// SMHI success, forecast fallback applied:
return { ...smhiResult, observations: [...], forecastFromFallbackSource: true, primarySource: "smhi" };
// SMHI not covered / SMHI failed:
return { ...(await openMeteoProvider.getObservations(location, window)), primarySource: "open-meteo" };
```

## `src/models/types.ts`

`ObservationSeries` gains `primarySource: "smhi" | "open-meteo"` (data-model.md).

## `src/components/chartData.ts`

New exports: `ObservedExtreme`, `ObservedExtremes`, `findObservedExtremes` (data-model.md).

## `src/components/ObservationChart.tsx`

- Every `<YAxis>` currently appearing alone (the rain/wind/cloud single-metric charts, both hourly
  and daily variants) gains a sibling `<YAxis orientation="right" .../>` bound to the same
  `dataKey`/domain, mirroring the scale (research.md §6). The temperature chart's existing two-axis
  (`yAxisId="temp"` left / `yAxisId="precip"` right) layout is unchanged.
- Every `<Line dot={false} .../>` changes to `<Line dot={{ r: 3 }} .../>` (research.md §7);
  `activeDot={{ r: 5 }}` where already present is unchanged.
- A new data-source note renders once per chart view (e.g. below the window/metric toggles),
  reading `series.primarySource` and `series.forecastFromFallbackSource`:
  - `primarySource === "smhi"`, no fallback: "Data: SMHI"
  - `primarySource === "smhi"`, `forecastFromFallbackSource === true`: "Data: SMHI (forecast: Open-Meteo)"
  - `primarySource === "open-meteo"`: "Data: Open-Meteo"
- When `metric === "temperature"`, a new high/low note renders using
  `findObservedExtremes(series.observations)`: e.g. "High: 24°C at 15:00 · Low: 9°C at 04:00",
  formatted with the same `formatValue`/unit-conversion helpers already used elsewhere in this
  file; renders nothing when `findObservedExtremes` returns `null` (FR-020).

## `src/components/WeatherIconOverview.tsx`

- A new effect (research.md §5) centers `timelineWrapRef`'s scroll position on the "now" column
  whenever the content overflows and a "now" boundary exists; re-runs when the timeline's
  underlying data changes.
- The same data-source note described above for `ObservationChart.tsx` also renders here, reusing
  `series.primarySource`/`forecastFromFallbackSource` (both views show it per FR-013).

## No changes to

- `src/services/smhiProvider.ts`, `src/services/openMeteoProvider.ts` — provider-selection logic
  itself is unchanged; only its *result* is now surfaced via `primarySource`.
- `src/services/dailyAggregation.ts` — the high/low note operates on raw observations, not
  daily-bucketed aggregates (research.md §8).
