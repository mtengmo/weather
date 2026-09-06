/** One of nine recognizable weather conditions, or the input didn't have enough data
 * (007-weather-icon-overview; thunderstorm/foggy/sleet added 022-met-forecast-source). */
export type WeatherCondition =
  | "clear-day"
  | "clear-night"
  | "cloudy"
  | "rainy"
  | "windy"
  | "snowy"
  | "thunderstorm"
  | "foggy"
  | "sleet";

export interface WeatherConditionInput {
  temperature: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  cloudCoverPercent: number | null;
  /** ISO 8601 timestamp — required to distinguish clear-day from clear-night. Omit for a
   * daily/whole-day period, which always resolves to clear-day when clear (research.md §3). */
  timestamp?: string;
  /** A condition already classified from a source's own official weather-symbol code for this
   * period (022-met-forecast-source, research.md §3) — takes precedence over the threshold-based
   * rules below except for the windy-speed override, since symbol codes carry no wind signal.
   * Absent/null when no contributing observation in this period had a symbol code. */
  symbolCondition?: WeatherCondition | null;
}

// Beaufort scale "Fresh Breeze" boundary — a recognizable everyday reference point
// (research.md §2).
const WINDY_THRESHOLD_MS = 8;
// Conventional midpoint between "partly" and "mostly" cloudy.
const CLOUDY_THRESHOLD_PERCENT = 50;
const FREEZING_CELSIUS = 0;
// Fixed local-clock-hour day/night rule (research.md §3) — not sunrise/sunset calculation.
const NIGHT_START_HOUR = 20;
const NIGHT_END_HOUR = 6;

function isNight(timestamp: string): boolean {
  const hour = new Date(timestamp).getHours();
  return hour < NIGHT_END_HOUR || hour >= NIGHT_START_HOUR;
}

const SYMBOL_PRECIPITATION_CONDITIONS: ReadonlySet<WeatherCondition> = new Set([
  "thunderstorm",
  "foggy",
  "sleet",
]);

/**
 * Derives a single WeatherCondition from one period's values, evaluated in a fixed priority
 * order (contracts/weather-condition.md, extended 022-met-forecast-source research.md §3):
 * no-data -> symbol-code storm/fog/sleet -> snowy -> rainy -> windy -> symbol-code cloudy/clear
 * -> cloudy -> clear (day/night). Returns null when there isn't enough data to classify the
 * period, reusing the same gap-detection rule already used elsewhere in the app
 * (`temperature === null && precipitation === null`).
 */
export function deriveWeatherCondition(input: WeatherConditionInput): WeatherCondition | null {
  const { temperature, precipitation, windSpeed, cloudCoverPercent, timestamp, symbolCondition } = input;

  if (temperature === null && precipitation === null) return null;

  if (symbolCondition != null && SYMBOL_PRECIPITATION_CONDITIONS.has(symbolCondition)) {
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
