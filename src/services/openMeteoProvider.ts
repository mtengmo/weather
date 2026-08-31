import type { ObservationSeries, ObservationWindow, WeatherObservation } from "../models/types";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

const WINDOW_HOURS: Record<ObservationWindow, number> = {
  "last-24-hours": 24,
  "last-7-days": 24 * 7,
  "last-30-days": 24 * 30,
};

interface OpenMeteoHourlyResponse {
  hourly?: {
    time: string[];
    temperature_2m: (number | null)[];
    precipitation: (number | null)[];
    wind_speed_10m: (number | null)[];
    cloud_cover: (number | null)[];
  };
}

function pastDaysFor(window: ObservationWindow): number {
  if (window === "last-24-hours") return 2;
  if (window === "last-7-days") return 8;
  return 31;
}

export async function getObservations(
  location: Pick<import("../models/types").Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<ObservationSeries> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly: "temperature_2m,precipitation,wind_speed_10m,cloud_cover",
    wind_speed_unit: "ms",
    past_days: String(pastDaysFor(window)),
    forecast_days: "1",
    timezone: "UTC",
  });

  const baseLocation = {
    latitude: location.latitude,
    longitude: location.longitude,
    displayName: "",
    source: "current-position" as const,
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}?${params.toString()}`);
  } catch {
    return { location: baseLocation, window, observations: [], status: "unavailable" };
  }

  if (!response.ok) {
    return { location: baseLocation, window, observations: [], status: "unavailable" };
  }

  let data: OpenMeteoHourlyResponse;
  try {
    data = (await response.json()) as OpenMeteoHourlyResponse;
  } catch {
    return { location: baseLocation, window, observations: [], status: "unavailable" };
  }

  if (!data.hourly) {
    return { location: baseLocation, window, observations: [], status: "unavailable" };
  }

  const { time, temperature_2m, precipitation, wind_speed_10m, cloud_cover } = data.hourly;
  const now = Date.now();

  const all: WeatherObservation[] = time.map((timestamp, i) => ({
    timestamp,
    temperature: temperature_2m[i] ?? null,
    precipitation: precipitation[i] ?? null,
    windSpeed: wind_speed_10m?.[i] ?? null,
    cloudCoverPercent: cloud_cover?.[i] ?? null,
  }));

  const elapsed = all.filter((o) => Date.parse(o.timestamp) <= now);
  const hoursNeeded = WINDOW_HOURS[window];
  const observations = elapsed.slice(Math.max(0, elapsed.length - hoursNeeded));

  return { location: baseLocation, window, observations, status: "ready" };
}
