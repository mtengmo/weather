# Phase 1 Data Model: Replace Weather Icons With Character Artwork

## `WeatherType` (new union type, in `smhiSymbolIcons.ts`)

```ts
type WeatherType =
  | "clear" | "nearly-clear" | "variable" | "cloudy" | "overcast" | "fog"
  | "rain-light" | "rain-heavy"
  | "thunder"
  | "sleet"
  | "snow-light" | "snow-heavy";
```

12 values, taken verbatim from `sheet-manifest.json`'s `code_mapping` keys.

## `SMHI_CODE_TO_WEATHER_TYPE` (new lookup, in `smhiSymbolIcons.ts`)

```ts
const SMHI_CODE_TO_WEATHER_TYPE: Record<number, WeatherType>
```

27 entries (one per existing SMHI code), the inverse of `sheet-manifest.json`'s `code_mapping`
(e.g. codes 8, 9, 18, 19 all map to `"rain-light"`).

## `IconTempBand` (new union type, in `smhiSymbolIcons.ts`)

```ts
type IconTempBand = "frozen" | "cold" | "nearzero" | "mild" | "warm" | "hot";
```

6 values. Distinct from `weatherCharacterIcons.ts`'s own `TempBand` (5 values, different
boundaries) — the two features intentionally don't share a temperature-banding scheme
(spec.md Assumptions).

## `mapTemperatureToIconBand` (new function, in `smhiSymbolIcons.ts`)

```ts
function mapTemperatureToIconBand(celsius: number): IconTempBand
```

`< -20` → `frozen`; `[-20, -5)` → `cold`; `[-5, 5)` → `nearzero`; `[5, 15)` → `mild`;
`[15, 25)` → `warm`; `>= 25` → `hot`. A boundary value belongs to the warmer band, matching this
app's existing convention (spec.md Edge Cases).

## `WEATHER_TYPE_ARTWORK` (new lookup, in `smhiSymbolIcons.ts`)

```ts
const WEATHER_TYPE_ARTWORK: Partial<Record<WeatherType, Record<IconTempBand, { day: string; night: string }>>>
```

Populated only for the 124 combinations that actually have generated artwork (10 of the 12 types ×
all 6 bands, minus `rain-light`/`rain-heavy` at `frozen`/`cold` and `snow-light`/`snow-heavy` at
`mild`/`warm`/`hot` — 20 combinations × 2 (day/night) = the 20 missing from 144 that make 124).
`Partial` because those 20 combinations are deliberately absent — resolved at lookup time by §
below, never by a placeholder entry in this table.

## `resolveWeatherTypeForBand` (new function, in `smhiSymbolIcons.ts`)

```ts
function resolveWeatherTypeForBand(type: WeatherType, band: IconTempBand): WeatherType
```

Applies spec.md FR-005's fallback: `rain-light`/`rain-heavy` at `frozen`/`cold` → `sleet`;
`snow-light`/`snow-heavy` at `mild`/`warm`/`hot` → `sleet`; every other combination is returned
unchanged. Mirrors `sheet-manifest.json`'s own documented `fallback` rule exactly.

## Validation rules

- `SMHI_CODE_TO_WEATHER_TYPE` has exactly 27 entries (codes 1-27) — every existing code maps to
  exactly one of the 12 weather types.
- After `resolveWeatherTypeForBand` is applied, `WEATHER_TYPE_ARTWORK[type][band]` is always
  defined — no code path can reach a lookup miss.
- `ResolvedConditionIcon`'s existing two-variant shape (`data-model.md` from 043-smhi-27-symbol-icons)
  is unchanged: `{kind: "smhi-symbol", src, label} | {kind: "condition", Icon, label}`. Only the
  `"smhi-symbol"` variant's `src` now comes from `WEATHER_TYPE_ARTWORK` instead of the old
  `SMHI_SYMBOL_ICONS`/`NIGHT_VARIANT_ICONS` tables; `label` is unchanged (research.md §4).

## `TimelinePeriod` (existing type, `src/components/timelineData.ts`) — one field added

```diff
 export interface TimelinePeriod {
   key: string;
   label: string;
   isForecast: boolean;
   condition: WeatherCondition | null;
   uvRisk: boolean;
   smhiSymbolCode?: number | null;
+  /** The period's own temperature reading, for the icon's temperature-band selection
+   *  (063-replace-weather-icons). `null` when unavailable — resolved to a default band rather
+   *  than omitting the icon (research.md §8). Populated the same way `smhiSymbolCode` already is:
+   *  only ever set by the two builder functions in this file, from the same source value each
+   *  already reads for condition derivation. */
+  temperature: number | null;
 }
```

## State transitions

None — this is a pure rendering/asset-selection concern layered on data the app already computes,
same as 061-cartoon-weather-companion's own data model.
