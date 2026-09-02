/**
 * One shared feels-like formula applied regardless of which provider sourced a point
 * (008-timeline-dashboard-redesign, research.md §3) — avoids a "feels like" that quietly
 * means something different for SMHI-sourced vs. Open-Meteo-sourced periods.
 */

const COLD_THRESHOLD_CELSIUS = 10;
const WARM_THRESHOLD_CELSIUS = 27;
// Below this, wind has negligible chilling effect — matches the US National Weather
// Service's own wind chill formula's stated validity range.
const WIND_CHILL_MIN_KMH = 4.8;

// US National Weather Service wind chill formula (public, non-proprietary).
function windChillCelsius(tempC: number, windSpeedMs: number): number {
  const windKmh = windSpeedMs * 3.6;
  if (windKmh <= WIND_CHILL_MIN_KMH) return tempC;
  const v16 = Math.pow(windKmh, 0.16);
  return 13.12 + 0.6215 * tempC - 11.37 * v16 + 0.3965 * tempC * v16;
}

// NWS's own simplified heat index estimate (their initial approximation, ahead of the full
// Rothfusz regression) — sufficient for a "feels warmer" indication, not medical precision.
function heatIndexCelsius(tempC: number, relativeHumidity: number): number {
  const tempF = (tempC * 9) / 5 + 32;
  const hiF = 0.5 * (tempF + 61.0 + (tempF - 68.0) * 1.2 + relativeHumidity * 0.094);
  return ((hiF - 32) * 5) / 9;
}

export interface FeelsLikeInput {
  temperature: number | null;
  windSpeed: number | null;
  relativeHumidity: number | null;
}

/**
 * Derives a feels-like temperature from raw metric-unit values (Celsius, m/s, %) — the
 * caller converts for display, this does not (contracts/feels-like.md). Returns null only
 * when temperature itself is null.
 */
export function deriveFeelsLike(input: FeelsLikeInput): number | null {
  const { temperature, windSpeed, relativeHumidity } = input;
  if (temperature === null) return null;

  if (temperature <= COLD_THRESHOLD_CELSIUS && windSpeed !== null) {
    return windChillCelsius(temperature, windSpeed);
  }
  if (temperature >= WARM_THRESHOLD_CELSIUS && relativeHumidity !== null) {
    return heatIndexCelsius(temperature, relativeHumidity);
  }
  return temperature;
}
