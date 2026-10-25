import type { SeaMetric, SeaPoint } from "./seaObservations";

const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";

export type SeaForecast = Record<SeaMetric, SeaPoint[]>;

/** Hourly marine model data from yesterday to 7 days ahead. Sea level is converted from m to cm. */
export async function fetchSeaForecast(latitude: number, longitude: number, signal?: AbortSignal): Promise<SeaForecast> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: "wave_height,sea_level_height_msl,sea_surface_temperature",
    past_days: "1",
    forecast_days: "7",
    timeformat: "unixtime",
  });
  const res = await fetch(`${MARINE_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Open-Meteo marine: ${res.status}`);
  const body = (await res.json()) as {
    hourly?: {
      time: number[];
      wave_height: (number | null)[];
      sea_level_height_msl: (number | null)[];
      sea_surface_temperature: (number | null)[];
    };
  };
  const h = body.hourly;
  const series = (values: (number | null)[] | undefined, scale = 1): SeaPoint[] =>
    (h && values ? h.time.map((t, i) => ({ time: t * 1000, value: values[i] })) : [])
      .filter((p): p is { time: number; value: number } => p.value !== null)
      .map((p) => ({ time: p.time, value: p.value * scale }));
  return {
    waterLevel: series(h?.sea_level_height_msl, 100),
    waveHeight: series(h?.wave_height),
    seaTemperature: series(h?.sea_surface_temperature),
  };
}
