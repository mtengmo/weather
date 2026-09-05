# Contract: SMHI Preference, Combined Averaging, Source Freshness (US8)

## `src/services/smhiProvider.ts` — parse `approvedTime`

```ts
interface SmhiForecastResponse {
  approvedTime?: string;
  timeSeries?: SmhiForecastTimeSeriesEntry[];
}

async function fetchForecastTimeSeries(
  location: { latitude: number; longitude: number }
): Promise<{ timeSeries: SmhiForecastTimeSeriesEntry[]; issuedAt: string | null }> {
  try {
    const response = await fetch(/* unchanged */);
    if (!response.ok) return { timeSeries: [], issuedAt: null };
    const data = (await response.json()) as SmhiForecastResponse;
    return { timeSeries: data.timeSeries ?? [], issuedAt: data.approvedTime ?? null };
  } catch {
    return { timeSeries: [], issuedAt: null };
  }
}
```

Callers of `fetchForecastTimeSeries` (`getObservations`'s SMHI path) thread `issuedAt` onto the
`ObservationSeries` they return as `forecastIssuedAt`.

## `src/services/weatherApi.ts` — Automatic mode (confirms existing behavior)

No code change to the SMHI-primary / Open-Meteo-forecast-only-fallback logic in `getObservations`
— already matches FR-010 exactly (SMHI's forecast used whenever it returns any; Open-Meteo used
only when SMHI's forecast is entirely empty). Add a regression test asserting this explicitly
(it was previously only incidentally covered).

`getObservations` also sets `forecastIssuedAt` on its returned `ObservationSeries`:
- SMHI path: the `issuedAt` from `fetchForecastTimeSeries` (`null` when SMHI provided no forecast
  or didn't return `approvedTime`).
- Open-Meteo path (primary or fallback): `null` — Open-Meteo doesn't expose an equivalent
  timestamp (research.md §8); the app's own `lastUpdated` (already tracked by
  `useObservationData`) is used as that source's freshness in the footer instead.

## `src/services/weatherApi.ts` — `getMultiSourceForecast` gains `issuedAt`

```ts
export interface MultiSourceForecastEntry {
  source: "smhi" | "open-meteo";
  observations: WeatherObservation[];
  issuedAt: string | null;
}
```

SMHI's entry uses the same `fetchForecastTimeSeries` `issuedAt`; Open-Meteo's entry is always
`issuedAt: null` (footer falls back to `lastUpdated`, per above).

## `src/components/timelineData.ts` — Combined mode averages instead of listing sources

```ts
export function mergeMultiSourceIntoTimelinePoints(
  temperatureRow: TimelineRow,
  periods: TimelinePeriod[],
  multiSourceForecast: MultiSourceForecastEntry[],
  unit: UnitSystem
): void {
  if (multiSourceForecast.length < 2) return;

  periods.forEach((period, i) => {
    if (!period.isForecast) return;
    const point = temperatureRow.points[i];
    if (!point) return;

    // ...existing periodStart/periodEnd windowing...

    const perSourceAverages = multiSourceForecast
      .map((entry) => {
        const temperatures = entry.observations
          .filter((o) => /* existing window filter */ true)
          .map((o) => o.temperature)
          .filter((v): v is number => v !== null);
        return temperatures.length > 0
          ? temperatures.reduce((sum, v) => sum + v, 0) / temperatures.length
          : null;
      })
      .filter((v): v is number => v !== null);

    if (perSourceAverages.length > 1) {
      const combinedAverage = perSourceAverages.reduce((sum, v) => sum + v, 0) / perSourceAverages.length;
      point.value = convertTemperature(combinedAverage, unit)!;
      point.combined = true;
    }
  });
}
```

(Replaces populating `point.sources`; the old `sources` field on `TimelineRowPoint` is removed
since nothing sets it afterward — see `contracts/timeline-and-display-fixes.md` for the
corresponding rendering change.)

## `src/services/format.ts` — `dataSourceDisclosure` includes forecast freshness

```ts
export function dataSourceDisclosure(
  series: { primarySource?: "smhi" | "open-meteo"; forecastFromFallbackSource?: boolean; forecastIssuedAt?: string | null },
  lastUpdated: string | null
): string | null {
  if (series.primarySource === undefined) return null;
  const observedLabel = series.primarySource === "smhi" ? "SMHI observations" : "Open-Meteo observations";
  const forecastSourceName = series.forecastFromFallbackSource
    ? (series.primarySource === "smhi" ? "Open-Meteo" : "SMHI")
    : (series.primarySource === "smhi" ? "SMHI" : "Open-Meteo");
  const freshnessTime = series.forecastIssuedAt ?? lastUpdated;
  const freshness = freshnessTime
    ? ` (updated ${new Date(freshnessTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`
    : "";
  return `${observedLabel} · ${forecastSourceName} forecast${freshness}`;
}
```

`Footer.tsx` passes `series` (already includes `forecastIssuedAt`) and `lastUpdated` (already a
prop) through unchanged — only `dataSourceDisclosure`'s own signature/body changes.

## No changes to

- `getObservations`'s SMHI-covered / fallback-on-empty-forecast branching logic itself (FR-010 is
  already satisfied; only `forecastIssuedAt` plumbing is added).
- `getNearbyStationSeries`, `getMultiSourceForecast`'s own SMHI-coverage/Promise.allSettled
  structure — only the new `issuedAt` field is added to its return shape.
