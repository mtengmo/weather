# Contract: Combine Forecast Sources (User Story 7)

## `src/services/combineForecastPreference.ts` (new)

Mirrors `units.ts` exactly:

```ts
const STORAGE_KEY = "weather-app:combine-forecast-sources:v1";

export function getCombineForecastSourcesPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setCombineForecastSourcesPreference(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Best-effort; the preference simply won't persist in this browser session.
  }
}
```

## `src/hooks/useCombineForecastSourcesPreference.ts` (new)

Mirrors `useUnitPreference.ts`'s shape exactly (`useState(() => getX())` + a setter that both
updates state and persists).

## `src/services/weatherApi.ts`

```ts
export interface MultiSourceForecastEntry {
  source: "smhi" | "open-meteo";
  observations: WeatherObservation[];
}

export async function getMultiSourceForecast(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<MultiSourceForecastEntry[]> {
  const [smhiResult, openMeteoResult] = await Promise.allSettled([
    (async () => {
      if (!(await isSmhiCovered(location))) return [];
      const series = await smhiProvider.getObservations(location, window);
      return series.observations.filter((o) => o.isForecast === true);
    })(),
    openMeteoProvider.getForecastOnly(location, window),
  ]);

  const entries: MultiSourceForecastEntry[] = [];
  if (smhiResult.status === "fulfilled" && smhiResult.value.length > 0) {
    entries.push({ source: "smhi", observations: smhiResult.value });
  }
  if (openMeteoResult.status === "fulfilled" && openMeteoResult.value.length > 0) {
    entries.push({ source: "open-meteo", observations: openMeteoResult.value });
  }
  return entries;
}
```

## `src/components/chartData.ts`

```ts
export function sourceKey(index: number): string {
  return `source${index}`;
}

export function buildMultiSourceForecastRows(
  entries: MultiSourceForecastEntry[],
  unit: UnitSystem
): ChartRow[] {
  const byTimestamp = new Map<string, ChartRow>();

  entries.forEach((entry, i) => {
    for (const obs of entry.observations) {
      const row = byTimestamp.get(obs.timestamp) ?? { timestamp: obs.timestamp };
      row[sourceKey(i)] = convertTemperature(obs.temperature, unit);
      byTimestamp.set(obs.timestamp, row);
    }
  });

  for (const row of byTimestamp.values()) {
    const values = entries.map((_, i) => row[sourceKey(i)]).filter((v): v is number => typeof v === "number");
    row.average = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
  }

  return Array.from(byTimestamp.values()).sort((a, b) =>
    String(a.timestamp).localeCompare(String(b.timestamp))
  );
}
```

## `src/components/CombineForecastToggle.tsx` (new)

Mirrors `HighLowToggle.tsx`'s shape exactly (`visible`/`onChange` → `combined`/`onChange`, two
pressed-state buttons in a `role="group"` container).

## `src/App.tsx`

```tsx
const { combineForecastSources, setCombineForecastSources } = useCombineForecastSourcesPreference();
// ...
<CombineForecastToggle combined={combineForecastSources} onChange={setCombineForecastSources} />
```

Threaded into `ObservationChart` as a new `combineForecastSources: boolean` prop, alongside a new
`multiSourceForecast: MultiSourceForecastEntry[] | null` prop populated by a small extension to
`useObservationData` (or a new sibling hook) that calls `getMultiSourceForecast` only when
`combineForecastSources` is true, mirroring how `useObservationData` already conditionally fetches
nearby-station comparisons only when `nearbyStationCount > 0`.

## `src/components/ObservationChart.tsx`

When `metric === "temperature"`, `combineForecastSources` is true, and `multiSourceForecast` has
more than one entry: render one additional `<Line dataKey={sourceKey(i)} .../>` per entry plus one
`<Line dataKey="average" .../>`, using `buildMultiSourceForecastRows`'s output as this block's
`data`, laid out the same way the existing nearby-station comparison lines already are (distinct
colors via the same `seriesColor`/`seriesDash` helpers, offset past the indices nearby stations
already use). When `multiSourceForecast` has 0 or 1 entries, nothing renders (FR-017) — the
existing single-source temperature line is completely unaffected either way.

## No changes to

- `smhiProvider.ts`, `openMeteoProvider.ts` — both already expose the underlying fetch functions
  this feature composes; neither needs modification.
- The default (toggle-off) rendering path of `ObservationChart.tsx` — unchanged pixel-for-pixel.
