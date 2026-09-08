/** One of twelve recognizable weather conditions, or the input didn't have enough data
 * (007-weather-icon-overview; thunderstorm/foggy/sleet added 022-met-forecast-source;
 * light/heavy rain and snow replace the previous flat "rainy"/"snowy" values,
 * 032-dashboard-polish-round-seven, US5; "partly-cloudy" splits off the lighter half of the
 * previous single "cloudy" bucket, 038-granular-weather-icons-and-graph-header, US1). */
export type WeatherCondition =
  | "clear-day"
  | "clear-night"
  | "partly-cloudy"
  | "cloudy"
  | "light-rain"
  | "heavy-rain"
  | "windy"
  | "light-snow"
  | "heavy-snow"
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
  /** Percent (0-100) chance of precipitation for this period, when available
   * (038-granular-weather-icons-and-graph-header, US1). `undefined`/absent preserves the
   * existing amount-only classification (e.g. for observed/historical data, which has no
   * forecast probability); present-and-low suppresses an *amount-based* rain/snow
   * classification — see the low-confidence guard below. Has no effect on a symbol-code-based
   * classification, which is already a source's own confident categorical judgment. */
  chanceOfRain?: number | null;
}

// Beaufort scale "Fresh Breeze" boundary — a recognizable everyday reference point
// (research.md §2).
const WINDY_THRESHOLD_MS = 8;
// Conventional midpoint between "clear" and "any cloud cover" — also the light/heavy cloud
// boundary before 038 split "cloudy" into two tiers; now specifically the clear/partly-cloudy
// boundary.
const CLOUDY_THRESHOLD_PERCENT = 50;
// Splits the former single "cloudy" range into "partly-cloudy" (50-79%) and "cloudy" (80-100%,
// now specifically meaning heavily overcast) — 038-granular-weather-icons-and-graph-header, US1,
// research.md.
const OVERCAST_THRESHOLD_PERCENT = 80;
// Below this, an amount-based (non-symbol-code) rain/snow classification is skipped even when a
// small forecast amount is present — a low stated chance of rain means the forecast itself isn't
// confident enough to show as rain (038-granular-weather-icons-and-graph-header, US1: reported
// live as "chance is 7% ... in reality its not a rain forecast").
const LOW_CONFIDENCE_CHANCE_OF_RAIN_PERCENT = 20;
const FREEZING_CELSIUS = 0;
// Standard light/heavy hourly rain-rate boundary, applied uniformly across every period
// granularity this function is called with (same "fixed constant, no per-granularity scaling"
// pattern already established by WINDY_THRESHOLD_MS/CLOUDY_THRESHOLD_PERCENT above) — used only
// when no symbol-code intensity is available (032-dashboard-polish-round-seven, US5,
// research.md §6).
const PRECIPITATION_HEAVY_THRESHOLD_MM = 2.5;
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
  "light-rain",
  "heavy-rain",
  "light-snow",
  "heavy-snow",
]);

/**
 * Derives a single WeatherCondition from one period's values, evaluated in a fixed priority
 * order (contracts/weather-condition.md, extended 022-met-forecast-source research.md §3;
 * light/heavy rain+snow added 032-dashboard-polish-round-seven, US5; low-confidence rain/snow
 * guard and partly-cloudy/cloudy split added 038-granular-weather-icons-and-graph-header, US1):
 * no-data -> symbol-code storm/fog/sleet/light-or-heavy-rain/light-or-heavy-snow ->
 * precipitation-amount-threshold light-or-heavy snow/rain (skipped when a low chance-of-rain
 * says not to) -> windy -> symbol-code cloudy/partly-cloudy/clear -> cloud-cover-percent
 * partly-cloudy/cloudy -> clear (day/night). Returns null when there isn't enough data to
 * classify the period, reusing the same gap-detection rule already used elsewhere in the app
 * (`temperature === null && precipitation === null`).
 */
export function deriveWeatherCondition(input: WeatherConditionInput): WeatherCondition | null {
  const { temperature, precipitation, windSpeed, cloudCoverPercent, timestamp, symbolCondition, chanceOfRain } =
    input;

  if (temperature === null && precipitation === null) return null;

  if (symbolCondition != null && SYMBOL_PRECIPITATION_CONDITIONS.has(symbolCondition)) {
    return symbolCondition;
  }

  if (precipitation !== null && precipitation > 0) {
    const heavy = precipitation >= PRECIPITATION_HEAVY_THRESHOLD_MM;
    // A heavy amount is trusted regardless of chance-of-rain — the guard exists to catch
    // "small amount, low confidence" forecasts specifically, not to override a source's own
    // high-confidence heavy-precipitation prediction (research.md, spec.md Assumptions).
    const lowConfidence =
      !heavy && chanceOfRain != null && chanceOfRain < LOW_CONFIDENCE_CHANCE_OF_RAIN_PERCENT;
    if (!lowConfidence) {
      if (temperature !== null && temperature <= FREEZING_CELSIUS) {
        return heavy ? "heavy-snow" : "light-snow";
      }
      return heavy ? "heavy-rain" : "light-rain";
    }
  }

  if (windSpeed !== null && windSpeed >= WINDY_THRESHOLD_MS) return "windy";

  if (
    symbolCondition === "cloudy" ||
    symbolCondition === "partly-cloudy" ||
    symbolCondition === "clear-day" ||
    symbolCondition === "clear-night"
  ) {
    return symbolCondition;
  }

  if (cloudCoverPercent !== null) {
    if (cloudCoverPercent >= OVERCAST_THRESHOLD_PERCENT) return "cloudy";
    if (cloudCoverPercent >= CLOUDY_THRESHOLD_PERCENT) return "partly-cloudy";
  }

  return timestamp !== undefined && isNight(timestamp) ? "clear-night" : "clear-day";
}
