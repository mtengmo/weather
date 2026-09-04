# Contract: Multi-Source Forecast on the Overview (User Story 2)

## `src/components/timelineData.ts`

```ts
export function mergeMultiSourceIntoTimelinePoints(
  temperatureRow: TimelineRow,
  periods: TimelinePeriod[],
  multiSourceForecast: MultiSourceForecastEntry[]
): void {
  if (multiSourceForecast.length < 2) return;

  const SOURCE_LABELS: Record<MultiSourceForecastEntry["source"], string> = {
    smhi: "S",
    "open-meteo": "O",
  };

  periods.forEach((period, i) => {
    if (!period.isForecast) return;
    const point = temperatureRow.points[i];
    if (!point) return;

    const periodStart = Date.parse(period.key) - 24 * 3600_000; // period.key is its bucketEnd
    const sources = multiSourceForecast
      .map((entry) => {
        const match = entry.observations.find((o) => {
          const t = Date.parse(o.timestamp);
          return t > periodStart && t <= Date.parse(period.key);
        });
        return { label: SOURCE_LABELS[entry.source], value: match?.temperature ?? null };
      })
      .filter((s) => s.value !== null);

    if (sources.length > 1) {
      point.sources = sources;
    }
  });
}
```

(Matching window mirrors how `RowSource`/`DailyAggregate` buckets are already defined — a period's
`key`/`bucketEnd` is its end timestamp, spanning back to the previous period's end.)

## `src/components/WeatherIconOverview.tsx`

```tsx
interface WeatherIconOverviewProps {
  // ...existing...
  combineForecastSources: boolean;
  multiSourceForecast: MultiSourceForecastEntry[];
}
```

After building `timeline`:

```tsx
if (timeline !== null && combineForecastSources) {
  mergeMultiSourceIntoTimelinePoints(timeline.temperature, timeline.periods, multiSourceForecast);
}
```

`LineRow`'s temperature-row rendering gains, alongside the existing high/low branch:

```tsx
{point.sources !== undefined
  ? `${formatRowValue(row, point.value)} (${point.sources.map((s) => `${s.label} ${formatValue(s.value, 0)}°`).join(" · ")})`
  : highLowVisible && point.high != null && point.low != null
    ? `${formatRowValue(row, point.value)} (${formatValue(point.high, 0)}°/${formatValue(point.low, 0)}°)`
    : formatRowValue(row, point.value)}
```

(`point.sources` takes precedence over the high/low parenthetical when both would apply — showing
both at once would be visually cramped; per-source detail is the more specific, more recently
requested comparison.)

Additionally, `LineRow`'s SVG gains one faint polyline per source, built the same way the existing
temperature polyline already is (via `buildSegments`), reusing `seriesColor(i + 1)` from
`ObservationChart.tsx`'s own color palette (imported, not duplicated) so source colors are visually
consistent between the classic graph and the Overview.

## `src/App.tsx`

```tsx
<WeatherIconOverview
  // ...existing props...
  combineForecastSources={combineForecastSources}
  multiSourceForecast={multiSourceForecast}
/>
```

Both values already exist in `App.tsx`'s state (014) — purely passing them one prop further.

## No changes to

- `src/services/weatherApi.ts`'s `getMultiSourceForecast` — reused unchanged.
- `src/hooks/useObservationData.ts` — already conditionally fetches `multiSourceForecast` when
  `combineForecastSources` is true; the Overview now simply also receives what it already computes.
- `src/components/ObservationChart.tsx` — unaffected; its own multi-source rendering (014) is
  untouched.
