const BASE_URL = "https://opendata-download-ocobs.smhi.se/api/version/latest/parameter";
export const SEA_WEATHER_URL = "https://www.smhi.se/vader/vader-till-havs/hav--och-kustvader";

/** SMHI oceanographic observation parameters we show. */
export type SeaMetric = "waterLevel" | "waveHeight" | "seaTemperature";

export const SEA_METRIC_PARAMETER: Record<SeaMetric, number> = {
  waterLevel: 12,
  waveHeight: 1,
  seaTemperature: 5,
};

export const SEA_METRICS: SeaMetric[] = ["waterLevel", "waveHeight", "seaTemperature"];

export interface SeaStation {
  key: string;
  name: string;
  distanceKm: number;
}

export interface SeaPoint {
  time: number;
  value: number;
}

export interface SeaObservation {
  metric: SeaMetric;
  station: SeaStation;
  points: SeaPoint[];
}

interface RawStation {
  key: string;
  title: string;
  summary: string;
  active?: boolean;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function nearestStation(stations: RawStation[], latitude: number, longitude: number): SeaStation | null {
  let best: SeaStation | null = null;
  for (const s of stations) {
    if (s.active === false) continue;
    const m = /Latitud:\s*(-?[\d.]+)\s*Longitud:\s*(-?[\d.]+)/.exec(s.summary);
    if (!m) continue;
    const d = distanceKm(latitude, longitude, Number(m[1]), Number(m[2]));
    if (!best || d < best.distanceKm) {
      best = { key: s.key, name: s.title.split(" - ").slice(1).join(" - ") || s.title, distanceKm: d };
    }
  }
  return best;
}

/** Latest-day readings from the nearest active station for a metric; null if none reports data. */
export async function fetchSeaObservation(
  metric: SeaMetric,
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<SeaObservation | null> {
  const parameter = SEA_METRIC_PARAMETER[metric];
  const listRes = await fetch(`${BASE_URL}/${parameter}.json`, { signal });
  if (!listRes.ok) throw new Error(`SMHI sea stations: ${listRes.status}`);
  const list = (await listRes.json()) as { station?: RawStation[] };
  const station = nearestStation(list.station ?? [], latitude, longitude);
  if (!station) return null;

  const dataRes = await fetch(`${BASE_URL}/${parameter}/station/${station.key}/period/latest-day/data.json`, { signal });
  if (!dataRes.ok) throw new Error(`SMHI sea data: ${dataRes.status}`);
  const data = (await dataRes.json()) as { value?: { date: number; value: number | string }[] };
  const all = (data.value ?? [])
    .map((v) => ({ time: v.date, value: Number(v.value) }))
    .filter((p) => Number.isFinite(p.value));
  // Minute values for water level: thin to roughly 150 points.
  const step = Math.max(1, Math.floor(all.length / 150));
  const points = all.filter((_, i) => i % step === 0 || i === all.length - 1);
  return { metric, station, points };
}
