# Data Model: Dashboard Polish Round Six

## `src/services/smhiProvider.ts`

### `SmhiForecastResponse` — field name corrected

```ts
interface SmhiForecastResponse {
  /** ISO 8601 — SMHI's own forecast model-run reference time, the closest match to "when this
   *  forecast was created" (021-dashboard-polish-round-six, research.md §1 — the previous
   *  `approvedTime` field name doesn't exist in SMHI's actual API response, so this value has
   *  never once been populated in production). */
  referenceTime?: string;
  timeSeries?: SmhiForecastTimeSeriesEntry[];
}
```

### `fetchForecastTimeSeries` — parses the corrected field

```ts
const data = (await response.json()) as SmhiForecastResponse;
return { timeSeries: data.timeSeries ?? [], issuedAt: data.referenceTime ?? null };
```

(`SmhiForecastFetchResult`'s own shape — `{ timeSeries, issuedAt }` — and every downstream
consumer of `issuedAt`/`forecastIssuedAt` are unchanged; only the source field name changes.)

## `src/services/format.ts`

### `dataSourceDisclosure` — gains a `combined` parameter

```ts
export function dataSourceDisclosure(
  series: {
    primarySource?: "smhi" | "open-meteo";
    forecastFromFallbackSource?: boolean;
    forecastIssuedAt?: string | null;
  },
  lastUpdated: string | null,
  combined: boolean
): string | null {
  if (series.primarySource === undefined) return null;
  const observedLabel = series.primarySource === "smhi" ? "SMHI observations" : "Open-Meteo observations";
  const forecastLabel = combined ? "SMHI + Open-Meteo forecast" : "Forecast";
  const freshnessTime = series.forecastIssuedAt ?? lastUpdated;
  const freshness = freshnessTime
    ? ` · ${forecastLabel} updated ${new Date(freshnessTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "";
  return `${observedLabel}${freshness}`;
}
```

(`combined` mirrors `WeatherIconOverview.tsx`'s own existing "2+ sources have data" check —
`multiSourceForecast.length > 1` — computed once in `App.tsx`/`Footer.tsx` rather than
duplicating the threshold.)

## `src/components/Footer.tsx`

### New prop

```ts
interface FooterProps {
  series: ObservationSeries | null;
  lastUpdated: string | null;
  /** Whether the forecast currently blends 2+ sources — same threshold WeatherIconOverview.tsx
   *  already applies before merging (021-dashboard-polish-round-six, research.md §2). */
  combinedForecast: boolean;
}
```

```tsx
const disclosure = series !== null ? dataSourceDisclosure(series, lastUpdated, combinedForecast) : null;
```

## `src/App.tsx`

```tsx
<Footer series={series} lastUpdated={lastUpdated} combinedForecast={multiSourceForecast.length > 1} />
```

## `src/components/WeatherIconOverview.tsx` — Rain row chance-of-rain placement

```tsx
// Before: chance-of-rain on its own stacked line below the value
<span className="weather-timeline-bar-value">{formatRowValue(row, point.value)}</span>
{point.chanceOfRain != null && <span className="weather-timeline-bar-chance">{Math.round(point.chanceOfRain)}%</span>}

// After: chance-of-rain inline, same text node/line as the value
<span className="weather-timeline-bar-value">
  {formatRowValue(row, point.value)}
  {point.chanceOfRain != null && <span className="weather-timeline-bar-chance"> · {Math.round(point.chanceOfRain)}%</span>}
</span>
```

Every `.weather-timeline-bar-cell` now always stacks exactly two children (the bar, and one text
line), so `justify-content: flex-end`'s bottom-anchoring never shifts a bar's baseline based on
whether a chance-of-rain value happens to be present.

## `src/components/WeeklyForecastStrip.tsx`

```tsx
// Before:
<iconInfo.Icon aria-hidden="true" size={24} />
// After:
<iconInfo.Icon aria-hidden="true" size={28} />
```

## `src/index.css`

### `.location-panel-content` and `.display-menu-content` — added contrast layer

```css
box-shadow:
  0 8px 24px rgba(0, 0, 0, 0.35),
  0 0 0 1px rgba(255, 255, 255, 0.08);
```

(Replaces the single-layer `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25)` on both rules — the
second layer is a subtle light "ring" that stays visible against a dark background regardless of
how close `--border`/`--surface` sit to each other in a given theme.)

## `package.json`

```json
"version": "0.1.1"
```

## Validation Rules

- `dataSourceDisclosure`'s `combined` fragment ("SMHI + Open-Meteo forecast") only appears when
  `combinedForecast` is actually true for the currently-shown data — never implying a blend that
  didn't happen (FR-009).
- The chance-of-rain inline suffix is omitted entirely (not a fabricated `0%`) when the
  underlying period has no `chanceOfRain` value, unchanged from today's gap-vs-fabrication
  behavior.
