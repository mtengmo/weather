import type { ObservationSeries, ObservationWindow, WeatherObservation } from "../models/types";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

const WINDOW_HOURS: Record<ObservationWindow, number> = {
  "last-24-hours": 24,
  "last-7-days": 24 * 7,
  "last-30-days": 24 * 30,
};

// How many hours of forecast to keep after "now", per window (005-add-weather-forecast;
// last-30-days is out of scope for forecast per spec Assumptions).
const FORECAST_HOURS: Record<ObservationWindow, number> = {
  "last-24-hours": 24,
  "last-7-days": 24 * 7,
  "last-30-days": 0,
};

interface OpenMeteoHourlyResponse {
  hourly?: {
    time: string[];
    temperature_2m: (number | null)[];
    precipitation: (number | null)[];
    wind_speed_10m: (number | null)[];
    cloud_cover: (number | null)[];
    wind_direction_10m?: (number | null)[];
    wind_gusts_10m?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
    precipitation_probability?: (number | null)[];
  };
}

function pastDaysFor(window: ObservationWindow): number {
  if (window === "last-24-hours") return 2;
  if (window === "last-7-days") return 8;
  return 31;
}

// How many days of forecast to request, per window (005-add-weather-forecast).
// last-30-days is out of scope for forecast (spec Assumptions) — request the
// minimum (1) so today's own hours are still present as before.
function forecastDaysFor(window: ObservationWindow): number {
  if (window === "last-24-hours") return 2;
  if (window === "last-7-days") return 8;
  return 1;
}

/**
 * Fetches and parses the raw hourly points (both past and upcoming) for a location+window.
 * Returns `null` on any failure (network error, non-ok response, malformed/empty body) so
 * callers can each apply their own fallback (006-forecast-now-marker: shared by
 * `getObservations` and `getForecastOnly` rather than duplicating the fetch+parse).
 */
async function fetchHourlyPoints(
  location: Pick<import("../models/types").Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<WeatherObservation[] | null> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly:
      "temperature_2m,precipitation,wind_speed_10m,cloud_cover,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,precipitation_probability",
    wind_speed_unit: "ms",
    past_days: String(pastDaysFor(window)),
    forecast_days: String(forecastDaysFor(window)),
    timezone: "UTC",
  });

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}?${params.toString()}`);
  } catch {
    return null;
  }

  if (!response.ok) return null;

  let data: OpenMeteoHourlyResponse;
  try {
    data = (await response.json()) as OpenMeteoHourlyResponse;
  } catch {
    return null;
  }

  if (!data.hourly) return null;

  const {
    time,
    temperature_2m,
    precipitation,
    wind_speed_10m,
    cloud_cover,
    wind_direction_10m,
    wind_gusts_10m,
    relative_humidity_2m,
    precipitation_probability,
  } = data.hourly;

  return time.map((timestamp, i) => ({
    timestamp,
    temperature: temperature_2m[i] ?? null,
    precipitation: precipitation[i] ?? null,
    windSpeed: wind_speed_10m?.[i] ?? null,
    cloudCoverPercent: cloud_cover?.[i] ?? null,
    windDirection: wind_direction_10m?.[i] ?? null,
    windGust: wind_gusts_10m?.[i] ?? null,
    relativeHumidity: relative_humidity_2m?.[i] ?? null,
    chanceOfRain: precipitation_probability?.[i] ?? null,
  }));
}

export async function getObservations(
  location: Pick<import("../models/types").Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<ObservationSeries> {
  const baseLocation = {
    latitude: location.latitude,
    longitude: location.longitude,
    displayName: "",
    source: "current-position" as const,
  };

  const all = await fetchHourlyPoints(location, window);
  if (all === null) {
    return { location: baseLocation, window, observations: [], status: "unavailable" };
  }

  const now = Date.now();

  const elapsed = all.filter((o) => Date.parse(o.timestamp) <= now);
  const hoursNeeded = WINDOW_HOURS[window];
  const observations = elapsed.slice(Math.max(0, elapsed.length - hoursNeeded));

  const forecastHoursNeeded = FORECAST_HOURS[window];
  const upcoming = all
    .filter((o) => Date.parse(o.timestamp) > now)
    .map((o) => ({ ...o, isForecast: true as const }));
  const forecastObservations = upcoming.slice(0, forecastHoursNeeded);

  return {
    location: baseLocation,
    window,
    observations: [...observations, ...forecastObservations],
    status: "ready",
  };
}

/**
 * A forecast-only counterpart to `getObservations` (006-forecast-now-marker) — used by
 * `weatherApi.ts`'s forecast-only fallback when SMHI has observed data but no forecast for
 * a location. Returns just the forecast-tagged points, or `[]` on any failure.
 */
export async function getForecastOnly(
  location: Pick<import("../models/types").Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<WeatherObservation[]> {
  const all = await fetchHourlyPoints(location, window);
  if (all === null) return [];

  const now = Date.now();
  const forecastHoursNeeded = FORECAST_HOURS[window];
  const upcoming = all
    .filter((o) => Date.parse(o.timestamp) > now)
    .map((o) => ({ ...o, isForecast: true as const }));
  return upcoming.slice(0, forecastHoursNeeded);
}
