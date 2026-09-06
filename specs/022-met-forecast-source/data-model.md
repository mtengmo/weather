# Data Model: MET Norway Forecast Source & Richer Conditions

## `src/services/weatherCondition.ts`

### `WeatherCondition` — three new values

```ts
export type WeatherCondition =
  | "clear-day" | "clear-night" | "cloudy" | "rainy" | "windy" | "snowy"
  | "thunderstorm" | "foggy" | "sleet"; // new (022, research.md §3)
```

### `WeatherConditionInput` — gains an optional pre-classified symbol condition

```ts
export interface WeatherConditionInput {
  temperature: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  cloudCoverPercent: number | null;
  timestamp?: string;
  /** A condition already classified from a source's own official weather-symbol code for this
   *  period (022-met-forecast-source, research.md §3) — takes precedence over the
   *  threshold-based rules below except for the windy-speed override, since symbol codes carry
   *  no wind signal. Absent when no contributing observation in this period had a symbol code. */
  symbolCondition?: WeatherCondition | null;
}
```

### `deriveWeatherCondition` — precedence updated

```ts
export function deriveWeatherCondition(input: WeatherConditionInput): WeatherCondition | null {
  const { temperature, precipitation, windSpeed, cloudCoverPercent, timestamp, symbolCondition } = input;

  if (temperature === null && precipitation === null) return null;

  // Symbol-code-derived precipitation/storm/fog conditions take precedence (research.md §3).
  if (symbolCondition === "thunderstorm" || symbolCondition === "foggy" || symbolCondition === "sleet") {
    return symbolCondition;
  }

  if (precipitation !== null && precipitation > 0) {
    if (temperature !== null && temperature <= FREEZING_CELSIUS) return "snowy";
    return "rainy";
  }

  if (windSpeed !== null && windSpeed >= WINDY_THRESHOLD_MS) return "windy";

  if (symbolCondition === "cloudy" || symbolCondition === "clear-day" || symbolCondition === "clear-night") {
    return symbolCondition;
  }

  if (cloudCoverPercent !== null && cloudCoverPercent >= CLOUDY_THRESHOLD_PERCENT) return "cloudy";

  return timestamp !== undefined && isNight(timestamp) ? "clear-night" : "clear-day";
}
```

(`symbolCondition === "snowy"`/`"rainy"` falls through to the existing precipitation-amount branch
above it rather than an early return, since the existing branch already produces the same result
when precipitation data agrees, and preserves the amount-based snowy/rainy distinction when a
symbol code says merely "precipitation" without SMHI/MET's own snow-vs-rain judgment being more
informative than the actual amount+temperature already available.)

## `src/models/types.ts`

### `WeatherObservation` — gains an optional symbol-derived condition

```ts
export interface WeatherObservation {
  // ...existing fields unchanged...
  /** This observation's own condition, pre-classified from the source's official weather-symbol
   *  code at fetch time (022-met-forecast-source, research.md §3). Absent when the source/period
   *  had no symbol code (e.g. Open-Meteo, which has none). */
  symbolCondition?: WeatherCondition | null;
}
```

## `src/services/smhiProvider.ts`

### `SmhiForecastData` — gains `symbol_code`

```ts
interface SmhiForecastData {
  air_temperature?: number;
  wind_speed?: number;
  wind_from_direction?: number;
  wind_speed_of_gust?: number;
  precipitation_amount_mean?: number;
  cloud_area_fraction?: number;
  symbol_code?: number; // SMHI's Wsymb2 table, 1-27 (022-met-forecast-source, research.md §3)
}
```

### New `SMHI_SYMBOL_CONDITIONS` lookup + `buildForecastHourlySeries` sets `symbolCondition`

```ts
const SMHI_SYMBOL_CONDITIONS: Record<number, WeatherCondition | "cloudy-or-clear"> = {
  1: "cloudy-or-clear", 2: "cloudy-or-clear", // resolved via timestamp/cloud fraction downstream
  3: "cloudy", 4: "cloudy", 5: "cloudy", 6: "cloudy",
  7: "foggy",
  8: "rainy", 9: "rainy", 10: "rainy",
  11: "thunderstorm",
  12: "sleet", 13: "sleet", 14: "sleet",
  15: "snowy", 16: "snowy", 17: "snowy",
  18: "rainy", 19: "rainy", 20: "rainy",
  21: "thunderstorm",
  22: "sleet", 23: "sleet", 24: "sleet",
  25: "snowy", 26: "snowy", 27: "snowy",
};
```

(Codes 1-2 resolve to `clear-day`/`clear-night` via the existing timestamp-based day/night rule at
the point `symbolCondition` is consumed, not baked into this lookup, so the mapping doesn't need
its own copy of `isNight`.)

`buildForecastHourlySeries` sets `symbolCondition` on each forecast `WeatherObservation` from
`data?.symbol_code`, resolving codes 1-2 to `clear-day`/`clear-night` using that observation's own
`timestamp`.

## `src/services/metNoProvider.ts` (new file)

Mirrors `openMeteoProvider.ts`'s shape and public surface:

```ts
const BASE_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";

interface MetNoTimeSeriesEntry {
  time: string;
  data: {
    instant?: { details?: {
      air_temperature?: number; wind_speed?: number; wind_from_direction?: number;
      relative_humidity?: number; cloud_area_fraction?: number;
    } };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
    next_6_hours?: { summary?: { symbol_code?: string } };
  };
}

interface MetNoResponse {
  properties?: { meta?: { updated_at?: string }; timeseries?: MetNoTimeSeriesEntry[] };
}

function roundCoordinate(value: number): number { /* same as smhiProvider.ts's helper */ }

function classifyMetNoSymbol(code: string): WeatherCondition | null {
  if (code.includes("thunder")) return "thunderstorm";
  if (code.includes("fog")) return "foggy";
  if (code.includes("sleet")) return "sleet";
  if (code.includes("snow")) return "snowy";
  if (code.includes("rain")) return "rainy";
  if (code.includes("clearsky")) return code.includes("night") ? "clear-night" : "clear-day";
  if (code.includes("cloud") || code.includes("fair")) return "cloudy";
  return null;
}

export async function getForecastOnly(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<{ observations: WeatherObservation[]; issuedAt: string | null }> {
  // fetch BASE_URL?lat={roundCoordinate(lat)}&lon={roundCoordinate(lon)}
  // map timeseries entries within FORECAST_HOURS[window] of now into WeatherObservation:
  //   temperature: instant.details.air_temperature ?? null
  //   precipitation: next_1_hours.details.precipitation_amount ?? null (gap beyond next_1_hours reach)
  //   windSpeed: instant.details.wind_speed ?? null
  //   windDirection: instant.details.wind_from_direction ?? null
  //   cloudCoverPercent: instant.details.cloud_area_fraction ?? null (already 0-100, no conversion)
  //   symbolCondition: classifyMetNoSymbol(next_1_hours.summary.symbol_code ?? next_6_hours.summary.symbol_code ?? "")
  //   isForecast: true
  // issuedAt: data.properties?.meta?.updated_at ?? null
  // try/catch degrades to { observations: [], issuedAt: null } — same best-effort rule as SMHI/Open-Meteo
}
```

Same `FORECAST_HOURS` per-window cap already used by `openMeteoProvider.ts` (24 / 24×7 / 0) reused
here so all three sources cap their forecast reach identically.

## `src/services/weatherApi.ts`

### `MultiSourceForecastEntry.source` — gains `"met-no"`

```ts
export interface MultiSourceForecastEntry {
  source: "smhi" | "open-meteo" | "met-no";
  observations: WeatherObservation[];
  issuedAt?: string | null;
}
```

### `getMultiSourceForecast` — fetches all three concurrently

```ts
export async function getMultiSourceForecast(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<MultiSourceForecastEntry[]> {
  const [smhiResult, openMeteoResult, metNoResult] = await Promise.allSettled([
    (async () => { /* unchanged SMHI branch */ })(),
    openMeteoProvider.getForecastOnly(location, window),
    metNoProvider.getForecastOnly(location, window),
  ]);

  const entries: MultiSourceForecastEntry[] = [];
  if (smhiResult.status === "fulfilled" && smhiResult.value.observations.length > 0) {
    entries.push({ source: "smhi", ...smhiResult.value });
  }
  if (openMeteoResult.status === "fulfilled" && openMeteoResult.value.length > 0) {
    entries.push({ source: "open-meteo", observations: openMeteoResult.value, issuedAt: null });
  }
  if (metNoResult.status === "fulfilled" && metNoResult.value.observations.length > 0) {
    entries.push({ source: "met-no", ...metNoResult.value });
  }
  return entries;
}
```

## `src/components/weatherIcons.tsx`

```tsx
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Moon, Sun, Wind, type LucideIcon } from "lucide-react";

export const WEATHER_ICONS: Record<WeatherCondition, WeatherIconInfo> = {
  "clear-day": { Icon: Sun, label: "Clear" },
  "clear-night": { Icon: Moon, label: "Clear" },
  cloudy: { Icon: Cloud, label: "Cloudy" },
  rainy: { Icon: CloudRain, label: "Rain" },
  windy: { Icon: Wind, label: "Windy" },
  snowy: { Icon: CloudSnow, label: "Snow" },
  thunderstorm: { Icon: CloudLightning, label: "Thunderstorm" },
  foggy: { Icon: CloudFog, label: "Fog" },
  sleet: { Icon: CloudDrizzle, label: "Sleet" },
};
```

## `src/index.css`

### Three new `--wx-*` variables per theme

```css
/* :root (midnight, default) */
--wx-thunderstorm: #f6c453; /* amber-gold, distinct from --wx-sun's lighter tone */
--wx-fog: #9aa3b5cc;        /* muted, closer to --wx-cloud but visually distinct */
--wx-sleet: #8fb8dd;        /* between --wx-rain and --wx-snow */

/* bright theme overrides */
--wx-thunderstorm: #b8860b;
--wx-fog: #6b7280;
--wx-sleet: #4a7fa8;

/* glass theme overrides */
--wx-thunderstorm: #fbbf24;
--wx-sleet: #93c5fd;
--wx-fog: #a9b6d9;
```

### New color rules alongside the existing `.weather-condition-*` block

```css
.weather-condition-thunderstorm svg { color: var(--wx-thunderstorm); }
.weather-condition-foggy svg { color: var(--wx-fog); }
.weather-condition-sleet svg { color: var(--wx-sleet); }
```

## `src/components/WeeklyForecastStrip.tsx`

```tsx
// Before:
<div className="weekly-forecast-day" key={day.bucketEnd}>
  ...
  {iconInfo ? <iconInfo.Icon aria-hidden="true" size={28} /> : <span aria-hidden="true">—</span>}

// After:
<div className={["weekly-forecast-day", condition !== null ? `weather-condition-${condition}` : null].filter(Boolean).join(" ")} key={day.bucketEnd}>
  ...
  {iconInfo ? <iconInfo.Icon aria-hidden="true" size={28} /> : <span aria-hidden="true">—</span>}
```

## `src/components/timelineData.ts`

### `TimelineRowPoint.combined` → also carries a count

```ts
export interface TimelineRowPoint {
  // ...existing fields...
  /** True when 2+ sources contributed to this point's blended value (020/021). */
  combined?: boolean;
  /** How many sources contributed, when combined is true (022, research.md §6). */
  combinedSourceCount?: number;
}
```

`mergeMultiSourceIntoTimelinePoints` sets `point.combinedSourceCount = perSourceAverages.length`
alongside the existing `point.combined = true`.

## `src/components/WeatherIconOverview.tsx`

### `LineRow`'s `(avg)` suffix — states the count when > 2

```tsx
{point.combined
  ? `${formatRowValue(row, point.value)} (avg${point.combinedSourceCount && point.combinedSourceCount > 2 ? ` of ${point.combinedSourceCount}` : ""})`
  : ...}
```

## `src/components/ObservationChart.tsx`

Extends the existing `showCombinedForecast && multiSourceForecast.map(...)` per-source-`<Line>`
pattern (already source-count-agnostic, unchanged) to:
- The 7-day Temperature `ComposedChart` (currently only has it on 24-hour)
- The Rain tab's precipitation metric (per-source `<Line>` on the `precip` axis alongside the
  existing bars)
- The Wind tab's wind-speed metric

Each addition reuses `sourceKey(i)`, `seriesColor`, `seriesDash`, and `SOURCE_LABELS` exactly as
the existing Temperature/24h block does — `SOURCE_LABELS` gains a `"met-no": "MET Norway"` entry.

## `src/services/format.ts`

### `dataSourceDisclosure` — `combined: boolean` → `contributingForecastSourceNames: string[]`

```ts
export function dataSourceDisclosure(
  series: { primarySource?: "smhi" | "open-meteo"; forecastFromFallbackSource?: boolean; forecastIssuedAt?: string | null },
  lastUpdated: string | null,
  contributingForecastSourceNames: string[]
): string | null {
  if (series.primarySource === undefined) return null;
  const observedLabel = series.primarySource === "smhi" ? "SMHI observations" : "Open-Meteo observations";
  const forecastLabel =
    contributingForecastSourceNames.length > 1
      ? `${contributingForecastSourceNames.join(" + ")} forecast`
      : "Forecast";
  const freshnessTime = series.forecastIssuedAt ?? lastUpdated;
  const freshness = freshnessTime
    ? ` · ${forecastLabel} updated ${new Date(freshnessTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "";
  return `${observedLabel}${freshness}`;
}
```

## `src/components/Footer.tsx` / `src/App.tsx`

```tsx
// Footer.tsx
interface FooterProps {
  series: ObservationSeries | null;
  lastUpdated: string | null;
  contributingForecastSourceNames: string[]; // replaces combinedForecast: boolean
}

// App.tsx call site
const SOURCE_DISPLAY_NAMES: Record<MultiSourceForecastEntry["source"], string> = {
  smhi: "SMHI", "open-meteo": "Open-Meteo", "met-no": "MET Norway",
};
<Footer
  series={series}
  lastUpdated={lastUpdated}
  contributingForecastSourceNames={multiSourceForecast.map((e) => SOURCE_DISPLAY_NAMES[e.source])}
/>
```

## Validation Rules

- `symbolCondition` is only ever set from a genuine source-provided symbol code — never inferred
  or fabricated when a source doesn't supply one for that observation (FR-011).
- The footer's forecast-source list names only sources that genuinely returned non-empty forecast
  observations for the current fetch, never a source that failed or returned nothing (FR-011,
  mirrors 021's existing rule).
- `combinedSourceCount` is only ever the real count of sources whose per-period average
  contributed to the blend, matching `perSourceAverages.length` exactly.
