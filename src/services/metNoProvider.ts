import type { ObservationWindow, WeatherObservation } from "../models/types";
import type { WeatherCondition } from "./weatherCondition";

const BASE_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";

// Same per-window forecast reach as openMeteoProvider.ts, so all three sources cap identically
// (022-met-forecast-source, research.md §1).
const FORECAST_HOURS: Record<ObservationWindow, number> = {
  "last-24-hours": 24,
  "last-7-days": 24 * 7,
  "last-30-days": 0,
};

interface MetNoInstantDetails {
  air_temperature?: number;
  wind_speed?: number;
  wind_from_direction?: number;
  relative_humidity?: number;
  cloud_area_fraction?: number;
}

interface MetNoTimeSeriesEntry {
  time: string;
  data: {
    instant?: { details?: MetNoInstantDetails };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
    next_6_hours?: { summary?: { symbol_code?: string } };
  };
}

interface MetNoResponse {
  properties?: {
    meta?: { updated_at?: string };
    timeseries?: MetNoTimeSeriesEntry[];
  };
}

export interface MetNoForecastResult {
  observations: WeatherObservation[];
  issuedAt: string | null;
}

// MET Norway's forecast endpoint is documented to accept and cache by coordinate; rounding also
// avoids the same class of malformed-URL issue found in SMHI's forecast API
// (021-dashboard-polish-round-six follow-up, research.md §1).
function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * Classifies MET Norway's own string-based weather-symbol code into this app's WeatherCondition
 * enum via substring matching against the ~30 published base names (022-met-forecast-source,
 * research.md §3) rather than an exhaustive lookup table of all ~100 day/night/polartwilight
 * variants. Returns null for a code this doesn't recognize, so callers fall back to the existing
 * threshold-based classification rather than guessing.
 */
export function classifyMetNoSymbol(code: string): WeatherCondition | null {
  if (code.includes("thunder")) return "thunderstorm";
  if (code.includes("fog")) return "foggy";
  if (code.includes("sleet")) return "sleet";
  if (code.includes("snow")) return "snowy";
  if (code.includes("rain")) return "rainy";
  if (code.includes("clearsky")) return code.includes("night") ? "clear-night" : "clear-day";
  if (code.includes("cloud") || code.includes("fair")) return "cloudy";
  return null;
}

async function fetchTimeSeries(
  location: { latitude: number; longitude: number }
): Promise<{ timeseries: MetNoTimeSeriesEntry[]; issuedAt: string | null }> {
  const lat = roundCoordinate(location.latitude);
  const lon = roundCoordinate(location.longitude);
  try {
    const response = await fetch(`${BASE_URL}?lat=${lat}&lon=${lon}`);
    if (!response.ok) return { timeseries: [], issuedAt: null };
    const data = (await response.json()) as MetNoResponse;
    return {
      timeseries: data.properties?.timeseries ?? [],
      issuedAt: data.properties?.meta?.updated_at ?? null,
    };
  } catch {
    // Forecast is a best-effort addition — degrade to "no forecast" rather than failing
    // the whole multi-source fetch, matching smhiProvider.ts/openMeteoProvider.ts's rule.
    return { timeseries: [], issuedAt: null };
  }
}

/**
 * MET Norway's forecast-only observations for a location (022-met-forecast-source, US1) — a
 * third independent source alongside SMHI and Open-Meteo, fetched the same
 * unconditional-no-coverage-gate way openMeteoProvider.getForecastOnly already is (MET Norway's
 * locationforecast service covers any global lat/lon, unlike SMHI's station-based coverage).
 */
export async function getForecastOnly(
  location: { latitude: number; longitude: number },
  window: ObservationWindow
): Promise<MetNoForecastResult> {
  const forecastHoursNeeded = FORECAST_HOURS[window];
  if (forecastHoursNeeded === 0) return { observations: [], issuedAt: null };

  const { timeseries, issuedAt } = await fetchTimeSeries(location);
  if (timeseries.length === 0) return { observations: [], issuedAt: null };

  const now = Date.now();
  const observations: WeatherObservation[] = timeseries
    .filter((entry) => Date.parse(entry.time) > now)
    .slice(0, forecastHoursNeeded)
    .map((entry) => {
      const details = entry.data.instant?.details;
      const symbolCode = entry.data.next_1_hours?.summary?.symbol_code ?? entry.data.next_6_hours?.summary?.symbol_code;
      return {
        timestamp: entry.time,
        temperature: details?.air_temperature ?? null,
        precipitation: entry.data.next_1_hours?.details?.precipitation_amount ?? null,
        windSpeed: details?.wind_speed ?? null,
        windDirection: details?.wind_from_direction ?? null,
        cloudCoverPercent: details?.cloud_area_fraction ?? null,
        relativeHumidity: details?.relative_humidity ?? null,
        symbolCondition: symbolCode !== undefined ? classifyMetNoSymbol(symbolCode) : null,
        isForecast: true,
      };
    });

  return { observations, issuedAt };
}
