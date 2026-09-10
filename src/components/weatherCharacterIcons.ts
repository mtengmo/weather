import type { WeatherCondition } from "../services/weatherCondition";

import characterDryFrozen from "../assets/weather-characters/character_dry_frozen.png";
import characterDryCold from "../assets/weather-characters/character_dry_cold.png";
import characterDryMild from "../assets/weather-characters/character_dry_mild.png";
import characterDryWarm from "../assets/weather-characters/character_dry_warm.png";
import characterDryHot from "../assets/weather-characters/character_dry_hot.png";
import characterRainFrozen from "../assets/weather-characters/character_rain_frozen.png";
import characterRainCold from "../assets/weather-characters/character_rain_cold.png";
import characterRainMild from "../assets/weather-characters/character_rain_mild.png";
import characterRainWarm from "../assets/weather-characters/character_rain_warm.png";
import characterRainHot from "../assets/weather-characters/character_rain_hot.png";
import characterThunderFrozen from "../assets/weather-characters/character_thunder_frozen.png";
import characterThunderCold from "../assets/weather-characters/character_thunder_cold.png";
import characterThunderMild from "../assets/weather-characters/character_thunder_mild.png";
import characterThunderWarm from "../assets/weather-characters/character_thunder_warm.png";
import characterThunderHot from "../assets/weather-characters/character_thunder_hot.png";
import characterSleetFrozen from "../assets/weather-characters/character_sleet_frozen.png";
import characterSleetCold from "../assets/weather-characters/character_sleet_cold.png";
import characterSleetMild from "../assets/weather-characters/character_sleet_mild.png";
import characterSleetWarm from "../assets/weather-characters/character_sleet_warm.png";
import characterSleetHot from "../assets/weather-characters/character_sleet_hot.png";
import characterSnowFrozen from "../assets/weather-characters/character_snow_frozen.png";
import characterSnowCold from "../assets/weather-characters/character_snow_cold.png";
import characterSnowMild from "../assets/weather-characters/character_snow_mild.png";
import characterSnowWarm from "../assets/weather-characters/character_snow_warm.png";
import characterSnowHot from "../assets/weather-characters/character_snow_hot.png";

/** The five precipitation categories the cartoon companion's clothing is drawn for
 *  (061-cartoon-weather-companion, matches docs/weathericons/vaderikoner-promptguide.md). */
export type PrecipCategory = "dry" | "rain" | "thunder" | "sleet" | "snow";

/** The five temperature bands the companion's clothing is drawn for, same source as
 *  `PrecipCategory` above. */
export type TempBand = "frozen" | "cold" | "mild" | "warm" | "hot";

/** One pre-produced illustration per (precipitation category, temperature band) combination —
 *  25 total, cropped from the user-supplied reference sheet via
 *  `docs/weathericons/split_character_sheet.py` (061-cartoon-weather-companion, data-model.md). */
export const CHARACTER_ICONS: Record<PrecipCategory, Record<TempBand, string>> = {
  dry: {
    frozen: characterDryFrozen,
    cold: characterDryCold,
    mild: characterDryMild,
    warm: characterDryWarm,
    hot: characterDryHot,
  },
  rain: {
    frozen: characterRainFrozen,
    cold: characterRainCold,
    mild: characterRainMild,
    warm: characterRainWarm,
    hot: characterRainHot,
  },
  thunder: {
    frozen: characterThunderFrozen,
    cold: characterThunderCold,
    mild: characterThunderMild,
    warm: characterThunderWarm,
    hot: characterThunderHot,
  },
  sleet: {
    frozen: characterSleetFrozen,
    cold: characterSleetCold,
    mild: characterSleetMild,
    warm: characterSleetWarm,
    hot: characterSleetHot,
  },
  snow: {
    frozen: characterSnowFrozen,
    cold: characterSnowCold,
    mild: characterSnowMild,
    warm: characterSnowWarm,
    hot: characterSnowHot,
  },
};

/** Maps a `WeatherCondition` to the precipitation category its companion clothing is keyed by
 *  (research.md §4). `windy` has no dedicated art — falls back to `dry`, per spec.md's Edge Cases
 *  (documented fallback, not an omission). */
export function mapConditionToPrecipCategory(condition: WeatherCondition): PrecipCategory {
  switch (condition) {
    case "light-rain":
    case "heavy-rain":
      return "rain";
    case "thunderstorm":
      return "thunder";
    case "sleet":
      return "sleet";
    case "light-snow":
    case "heavy-snow":
      return "snow";
    default:
      return "dry";
  }
}

/** Maps a Celsius reading to the temperature band its companion clothing is keyed by
 *  (research.md §4). A boundary value belongs to the warmer of its two adjacent bands, matching
 *  spec.md's Edge Cases resolution. */
export function mapTemperatureToBand(celsius: number): TempBand {
  if (celsius < -20) return "frozen";
  if (celsius < 0) return "cold";
  if (celsius < 15) return "mild";
  if (celsius < 25) return "warm";
  return "hot";
}

/** Resolves the character illustration for the given condition/temperature, or `null` when either
 *  input is unavailable (FR-005 — the character is omitted rather than showing a broken image;
 *  US3's high/low-midpoint temperature fallback is applied by the caller before this is invoked,
 *  research.md §5). */
export function resolveCharacterIcon(
  condition: WeatherCondition | null,
  temperatureCelsius: number | null
): string | null {
  if (condition === null || temperatureCelsius === null) return null;
  const precipCategory = mapConditionToPrecipCategory(condition);
  const tempBand = mapTemperatureToBand(temperatureCelsius);
  return CHARACTER_ICONS[precipCategory][tempBand];
}
