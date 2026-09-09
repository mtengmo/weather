import { deriveWeatherCondition, type WeatherCondition, type WeatherConditionInput } from "../services/weatherCondition";
import { WEATHER_ICONS } from "./weatherIcons";

import clear from "../assets/weather-icons/01-clear.png";
import nearlyClear from "../assets/weather-icons/02-nearly-clear.png";
import variableCloudiness from "../assets/weather-icons/03-variable-cloudiness.png";
import halfclear from "../assets/weather-icons/04-halfclear.png";
import cloudy from "../assets/weather-icons/05-cloudy.png";
import overcast from "../assets/weather-icons/06-overcast.png";
import fog from "../assets/weather-icons/07-fog.png";
import lightRainShowers from "../assets/weather-icons/08-light-rain-showers.png";
import moderateRainShowers from "../assets/weather-icons/09-moderate-rain-showers.png";
import heavyRainShowers from "../assets/weather-icons/10-heavy-rain-showers.png";
import thunderstorm from "../assets/weather-icons/11-thunderstorm.png";
import lightSleetShowers from "../assets/weather-icons/12-light-sleet-showers.png";
import moderateSleetShowers from "../assets/weather-icons/13-moderate-sleet-showers.png";
import heavySleetShowers from "../assets/weather-icons/14-heavy-sleet-showers.png";
import lightSnowShowers from "../assets/weather-icons/15-light-snow-showers.png";
import moderateSnowShowers from "../assets/weather-icons/16-moderate-snow-showers.png";
import heavySnowShowers from "../assets/weather-icons/17-heavy-snow-showers.png";
import lightRain from "../assets/weather-icons/18-light-rain.png";
import moderateRain from "../assets/weather-icons/19-moderate-rain.png";
import heavyRain from "../assets/weather-icons/20-heavy-rain.png";
import thunder from "../assets/weather-icons/21-thunder.png";
import lightSleet from "../assets/weather-icons/22-light-sleet.png";
import moderateSleet from "../assets/weather-icons/23-moderate-sleet.png";
import heavySleet from "../assets/weather-icons/24-heavy-sleet.png";
import lightSnowfall from "../assets/weather-icons/25-light-snowfall.png";
import moderateSnowfall from "../assets/weather-icons/26-moderate-snowfall.png";
import heavySnowfall from "../assets/weather-icons/27-heavy-snowfall.png";

export interface SmhiSymbolIconEntry {
  src: string;
  label: string;
}

/** One entry per SMHI `symbol_code` (1-27), matching SMHI's own documented meanings
 *  (043-smhi-27-symbol-icons, research.md §2). Artwork sourced from the user-supplied
 *  `docs/logos/smhi_symbols_ver2.png` reference sheet, cropped to bare icons (no number/caption)
 *  this session — expected to be replaced with revised artwork later; only the file each entry
 *  points at needs to change then, not this table's structure (FR-005). */
export const SMHI_SYMBOL_ICONS: Record<number, SmhiSymbolIconEntry> = {
  1: { src: clear, label: "Clear sky" },
  2: { src: nearlyClear, label: "Nearly clear sky" },
  3: { src: variableCloudiness, label: "Variable cloudiness" },
  4: { src: halfclear, label: "Halfclear sky" },
  5: { src: cloudy, label: "Cloudy sky" },
  6: { src: overcast, label: "Overcast" },
  7: { src: fog, label: "Fog" },
  8: { src: lightRainShowers, label: "Light rain showers" },
  9: { src: moderateRainShowers, label: "Moderate rain showers" },
  10: { src: heavyRainShowers, label: "Heavy rain showers" },
  11: { src: thunderstorm, label: "Thunderstorm" },
  12: { src: lightSleetShowers, label: "Light sleet showers" },
  13: { src: moderateSleetShowers, label: "Moderate sleet showers" },
  14: { src: heavySleetShowers, label: "Heavy sleet showers" },
  15: { src: lightSnowShowers, label: "Light snow showers" },
  16: { src: moderateSnowShowers, label: "Moderate snow showers" },
  17: { src: heavySnowShowers, label: "Heavy snow showers" },
  18: { src: lightRain, label: "Light rain" },
  19: { src: moderateRain, label: "Moderate rain" },
  20: { src: heavyRain, label: "Heavy rain" },
  21: { src: thunder, label: "Thunder" },
  22: { src: lightSleet, label: "Light sleet" },
  23: { src: moderateSleet, label: "Moderate sleet" },
  24: { src: heavySleet, label: "Heavy sleet" },
  25: { src: lightSnowfall, label: "Light snowfall" },
  26: { src: moderateSnowfall, label: "Moderate snowfall" },
  27: { src: heavySnowfall, label: "Heavy snowfall" },
};

/** A resolved icon, either an SMHI-code image or a fallback lucide icon component — exactly one
 *  of `src`/`Icon` is set, never both (043-smhi-27-symbol-icons, contracts/smhi-symbol-icons.md). */
export type ResolvedConditionIcon =
  | { kind: "smhi-symbol"; src: string; label: string }
  | { kind: "condition"; Icon: (typeof WEATHER_ICONS)[keyof typeof WEATHER_ICONS]["Icon"]; label: string };

/** Shared second step of both resolvers below: SMHI's own `symbol_code` wins when present and
 *  recognized (one of 27 distinct icons); otherwise falls back to the given (already-derived or
 *  freshly-derived) `WeatherCondition`, via the existing `WEATHER_ICONS` lookup — unchanged from
 *  today for every non-SMHI-forecast period (043-smhi-27-symbol-icons, US1/US2,
 *  contracts/smhi-symbol-icons.md). */
function resolveFromParts(
  smhiSymbolCode: number | null | undefined,
  condition: WeatherCondition | null
): ResolvedConditionIcon | null {
  if (smhiSymbolCode != null) {
    const entry = SMHI_SYMBOL_ICONS[smhiSymbolCode];
    if (entry) {
      return { kind: "smhi-symbol", src: entry.src, label: entry.label };
    }
  }

  if (condition === null) return null;
  const { Icon, label } = WEATHER_ICONS[condition];
  return { kind: "condition", Icon, label };
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
  return resolveFromParts(smhiSymbolCode, deriveWeatherCondition(conditionInput));
}

/** Resolves a period's icon when a `WeatherCondition` has already been derived upstream (e.g.
 *  `TimelinePeriod.condition`, computed once in `timelineData.ts`) — avoids recomputing
 *  `deriveWeatherCondition` a second time at render. */
export function resolveConditionIconFromCondition(
  smhiSymbolCode: number | null | undefined,
  condition: WeatherCondition | null
): ResolvedConditionIcon | null {
  return resolveFromParts(smhiSymbolCode, condition);
}
