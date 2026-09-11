import { deriveWeatherCondition, isNight, type WeatherCondition, type WeatherConditionInput } from "../services/weatherCondition";
import { WEATHER_ICONS } from "./weatherIcons";

export interface SmhiSymbolIconEntry {
  src: string;
  label: string;
}

/** One label per SMHI `symbol_code` (1-27), matching SMHI's own documented meanings
 *  (043-smhi-27-symbol-icons, research.md §2). These labels are kept even though several codes now
 *  share one combined artwork (063-replace-weather-icons, research.md §4) — the label is still the
 *  only thing that distinguishes e.g. "Light rain showers" (8) from "Light rain" (18) once both
 *  render the same `rain-light` image. */
const SMHI_SYMBOL_LABELS: Record<number, string> = {
  1: "Clear sky",
  2: "Nearly clear sky",
  3: "Variable cloudiness",
  4: "Halfclear sky",
  5: "Cloudy sky",
  6: "Overcast",
  7: "Fog",
  8: "Light rain showers",
  9: "Moderate rain showers",
  10: "Heavy rain showers",
  11: "Thunderstorm",
  12: "Light sleet showers",
  13: "Moderate sleet showers",
  14: "Heavy sleet showers",
  15: "Light snow showers",
  16: "Moderate snow showers",
  17: "Heavy snow showers",
  18: "Light rain",
  19: "Moderate rain",
  20: "Heavy rain",
  21: "Thunder",
  22: "Light sleet",
  23: "Moderate sleet",
  24: "Heavy sleet",
  25: "Light snowfall",
  26: "Moderate snowfall",
  27: "Heavy snowfall",
};

/** The 12 consolidated, recognizable weather types the new character artwork was generated for
 *  (063-replace-weather-icons, data-model.md) — together they cover all 27 SMHI codes. Sourced
 *  directly from `docs/weathericons/sheet-manifest.json`'s `code_mapping`. */
export type WeatherType =
  | "clear"
  | "nearly-clear"
  | "variable"
  | "cloudy"
  | "overcast"
  | "fog"
  | "rain-light"
  | "rain-heavy"
  | "thunder"
  | "sleet"
  | "snow-light"
  | "snow-heavy";

/** Inverse of `sheet-manifest.json`'s `code_mapping` — every one of the 27 SMHI codes maps to
 *  exactly one of the 12 `WeatherType`s. */
export const SMHI_CODE_TO_WEATHER_TYPE: Record<number, WeatherType> = {
  1: "clear",
  2: "nearly-clear",
  3: "variable",
  4: "variable",
  5: "cloudy",
  6: "overcast",
  7: "fog",
  8: "rain-light",
  9: "rain-light",
  10: "rain-heavy",
  11: "thunder",
  12: "sleet",
  13: "sleet",
  14: "sleet",
  15: "snow-light",
  16: "snow-light",
  17: "snow-heavy",
  18: "rain-light",
  19: "rain-light",
  20: "rain-heavy",
  21: "thunder",
  22: "sleet",
  23: "sleet",
  24: "sleet",
  25: "snow-light",
  26: "snow-light",
  27: "snow-heavy",
};

/** The 6 temperature bands the new character artwork was generated for
 *  (063-replace-weather-icons, data-model.md) — distinct from `weatherCharacterIcons.ts`'s own
 *  5-band `TempBand` (061-cartoon-weather-companion is a separate feature with its own boundaries,
 *  spec.md Assumptions). */
export type IconTempBand = "frozen" | "cold" | "nearzero" | "mild" | "warm" | "hot";

/** `< -20` -> frozen; `[-20,-5)` -> cold; `[-5,5)` -> nearzero; `[5,15)` -> mild; `[15,25)` -> warm;
 *  `>= 25` -> hot. A boundary value belongs to the warmer band (spec.md Edge Cases). */
export function mapTemperatureToIconBand(celsius: number): IconTempBand {
  if (celsius < -20) return "frozen";
  if (celsius < -5) return "cold";
  if (celsius < 5) return "nearzero";
  if (celsius < 15) return "mild";
  if (celsius < 25) return "warm";
  return "hot";
}

/** Applies the fallback `sheet-manifest.json` documents for the 20 combinations that were never
 *  generated because they don't occur in nature (rain during a deep freeze, snow in warm/hot
 *  weather) — both fall back to that band's `sleet` artwork (spec.md FR-005). */
export function resolveWeatherTypeForBand(type: WeatherType, band: IconTempBand): WeatherType {
  const isColdBand = band === "frozen" || band === "cold";
  const isWarmBand = band === "mild" || band === "warm" || band === "hot";
  if ((type === "rain-light" || type === "rain-heavy") && isColdBand) return "sleet";
  if ((type === "snow-light" || type === "snow-heavy") && isWarmBand) return "sleet";
  return type;
}

/** Every generated character-artwork file (063-replace-weather-icons), bulk-imported rather than
 *  listed as 124 individual named imports (the scale here is meaningfully larger than this
 *  codebase's usual per-file-import convention, e.g. the 25-31 entries in this same file's
 *  previous version or in `weatherCharacterIcons.ts`). Filenames follow
 *  `weather_{type}_{day|night}_{band}.png` exactly, per `docs/weathericons/splitting-guide.md`. */
const artworkModules = import.meta.glob<string>("../assets/weather-icons-v2/*.png", {
  eager: true,
  import: "default",
});

const FILENAME_PATTERN = /weather_(.+)_(day|night)_([a-z]+)\.png$/;

/** Every `(WeatherType, IconTempBand)` combination the source art actually covers — 10 of the 12
 *  types × all 6 bands, minus the 2 rain types × 2 cold bands and the 2 snow types × 3 warm bands
 *  the fallback rule above covers instead (124 total day+night images). Deliberately `Partial` —
 *  a miss here means `resolveWeatherTypeForBand` should have been applied first, never a missing
 *  file (data-model.md). */
export const WEATHER_TYPE_ARTWORK: Partial<Record<WeatherType, Partial<Record<IconTempBand, { day: string; night: string }>>>> = {};

for (const [path, src] of Object.entries(artworkModules)) {
  const match = FILENAME_PATTERN.exec(path);
  if (!match) continue;
  const [, type, row, band] = match as unknown as [string, WeatherType, "day" | "night", IconTempBand];
  const forType = (WEATHER_TYPE_ARTWORK[type] ??= {});
  const forBand = (forType[band] ??= { day: "", night: "" });
  forBand[row] = src;
}

/** A resolved icon, either character artwork or a fallback lucide icon component — exactly one
 *  of `src`/`Icon` is set, never both (043-smhi-27-symbol-icons, contracts/smhi-symbol-icons.md;
 *  artwork source replaced 063-replace-weather-icons). */
export type ResolvedConditionIcon =
  | { kind: "smhi-symbol"; src: string; label: string }
  | { kind: "condition"; Icon: (typeof WEATHER_ICONS)[keyof typeof WEATHER_ICONS]["Icon"]; label: string };

/** Best-fit SMHI code for a period/condition that has no `symbol_code` of its own — real station
 *  observations never carry one (SMHI's own observation API has no such field; it's forecast-only),
 *  so this lets those periods still show character artwork instead of a lucide icon. `windy` alone
 *  keeps the lucide fallback below — none of the 12 weather types represents wind
 *  (063-replace-weather-icons, research.md §5). Every other condition maps to the code that best
 *  matches it visually. */
const CONDITION_SMHI_FALLBACK: Partial<Record<WeatherCondition, number>> = {
  "clear-day": 1, // Clear sky
  "clear-night": 1, // Clear sky (night variant selected by resolveFromParts when it's actually night)
  "partly-cloudy": 3, // Variable cloudiness
  cloudy: 5, // Cloudy sky
  "light-rain": 18, // Light rain
  "heavy-rain": 20, // Heavy rain
  "light-snow": 25, // Light snowfall
  "heavy-snow": 26, // Moderate snowfall
  thunderstorm: 11, // Thunderstorm
  foggy: 7, // Fog
  sleet: 23, // Moderate sleet
};

/** Default temperature band used only when no temperature reading is available at all
 *  (063-replace-weather-icons, US3/FR-006) — the icon still renders rather than being omitted. */
const DEFAULT_ICON_TEMP_BAND: IconTempBand = "nearzero";

/** Shared second step of both resolvers below: SMHI's own `symbol_code` wins when present and
 *  recognized; otherwise falls back to `CONDITION_SMHI_FALLBACK`'s best-fit code for the given
 *  (already-derived or freshly-derived) `WeatherCondition`, or the existing `WEATHER_ICONS` lucide
 *  icon when no such fallback exists (`windy`) or the condition itself couldn't be classified. Once
 *  a code is resolved, it's mapped to one of the 12 weather types, banded by temperature (falling
 *  back to `DEFAULT_ICON_TEMP_BAND` when temperature is `null`), and run through
 *  `resolveWeatherTypeForBand`'s never-occurs-in-nature fallback before the matching day/night
 *  artwork is looked up (063-replace-weather-icons, research.md §7). The fallback branch picks its
 *  own night variant from `condition === "clear-night"` directly rather than `isNightNow` — unlike
 *  a real hourly timestamp, `isNightNow` reflects whatever moment the page happened to load, which
 *  is meaningless for a whole-day column (its `condition` is always `"clear-day"`, never
 *  `"clear-night"`, by the existing no-timestamp-passed rule in `timelineData.ts`) — using it here
 *  previously showed the moon on whole-day columns whenever the app was open at night, regardless
 *  of that day's actual weather (056-fix-night-moon). */
function resolveFromParts(
  smhiSymbolCode: number | null | undefined,
  condition: WeatherCondition | null,
  isNightNow: boolean,
  temperatureCelsius: number | null
): ResolvedConditionIcon | null {
  let code: number | undefined;
  let label: string | undefined;
  let useNightVariant = isNightNow;

  if (smhiSymbolCode != null && SMHI_SYMBOL_LABELS[smhiSymbolCode] !== undefined) {
    code = smhiSymbolCode;
    label = SMHI_SYMBOL_LABELS[smhiSymbolCode];
  } else if (condition !== null) {
    // Reached both when no code was given at all, and when an unrecognized/out-of-range code was
    // given (e.g. a future SMHI code this app doesn't know yet) — same best-fit fallback either way.
    const fallbackCode = CONDITION_SMHI_FALLBACK[condition];
    if (fallbackCode !== undefined) {
      code = fallbackCode;
      label = WEATHER_ICONS[condition].label;
      useNightVariant = condition === "clear-night";
    }
  }

  if (code !== undefined && label !== undefined) {
    const weatherType = SMHI_CODE_TO_WEATHER_TYPE[code];
    const band = temperatureCelsius === null ? DEFAULT_ICON_TEMP_BAND : mapTemperatureToIconBand(temperatureCelsius);
    const resolvedType = resolveWeatherTypeForBand(weatherType, band);
    const artwork = WEATHER_TYPE_ARTWORK[resolvedType]?.[band];
    if (artwork) {
      return { kind: "smhi-symbol", src: useNightVariant ? artwork.night : artwork.day, label };
    }
  }

  if (condition === null) return null;

  const { Icon, label: conditionLabel } = WEATHER_ICONS[condition];
  return { kind: "condition", Icon, label: conditionLabel };
}

/** Resolves a period's icon from raw weather-condition inputs (temperature, precipitation, etc.)
 *  plus an optional SMHI `symbol_code` — for consumers that haven't already derived a
 *  `WeatherCondition` themselves (e.g. `ObservationDetails`'s per-observation table). Never
 *  throws; returns `null` only when `deriveWeatherCondition` itself has too little data to
 *  classify the period (same as today). */
export function resolveConditionIcon(
  input: WeatherConditionInput & { smhiSymbolCode?: number | null }
): ResolvedConditionIcon | null {
  const { smhiSymbolCode, ...conditionInput } = input;
  const isNightNow = input.timestamp !== undefined && isNight(input.timestamp);
  return resolveFromParts(smhiSymbolCode, deriveWeatherCondition(conditionInput), isNightNow, input.temperature);
}

/** Resolves a period's icon when a `WeatherCondition` has already been derived upstream (e.g.
 *  `TimelinePeriod.condition`, computed once in `timelineData.ts`) — avoids recomputing
 *  `deriveWeatherCondition` a second time at render. `isNightNow` selects the night artwork when
 *  true; defaults to `false` for any caller with no timestamp handy. `temperatureCelsius` selects
 *  the artwork's temperature band, falling back to a sensible default when `null`
 *  (063-replace-weather-icons, US3). */
export function resolveConditionIconFromCondition(
  smhiSymbolCode: number | null | undefined,
  condition: WeatherCondition | null,
  isNightNow: boolean = false,
  temperatureCelsius: number | null = null
): ResolvedConditionIcon | null {
  return resolveFromParts(smhiSymbolCode, condition, isNightNow, temperatureCelsius);
}
