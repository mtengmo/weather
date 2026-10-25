import { useEffect, useState } from "react";
import { fetchMarineForecast, type MarineHour } from "../services/seaForecast";
import { SEA_METRICS, fetchSeaObservation, type SeaMetric, type SeaObservation } from "../services/seaObservations";

export type SeaSourceStatus = "loading" | "ready" | "error";

export interface SeaData {
  marineStatus: SeaSourceStatus;
  marineHours: MarineHour[];
  observationsStatus: SeaSourceStatus;
  observations: Partial<Record<SeaMetric, SeaObservation | null>>;
}

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: SeaData }>();

const LOADING: SeaData = { marineStatus: "loading", marineHours: [], observationsStatus: "loading", observations: {} };

const cacheKey = (lat: number, lon: number) => `${lat.toFixed(3)},${lon.toFixed(3)}`;

/** Test hook: drops the module-level cache. */
export function clearSeaDataCache(): void {
  cache.clear();
}

/** Marine forecast + SMHI observations for a point, fetched in parallel and cached for 10 minutes. */
export function useSeaData(lat: number | undefined, lon: number | undefined): SeaData {
  const [state, setState] = useState<{ key: string | null; data: SeaData }>({ key: null, data: LOADING });
  const key = lat === undefined || lon === undefined ? null : cacheKey(lat, lon);

  useEffect(() => {
    if (key === null || lat === undefined || lon === undefined) return;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < TTL_MS) {
      setState({ key, data: cached.data });
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    let data: SeaData = LOADING;
    const publish = (next: Partial<SeaData>) => {
      if (signal.aborted) return;
      data = { ...data, ...next };
      setState({ key, data });
      // Only fully successful results are cached, so a failed source is retried on the next visit.
      if (data.marineStatus === "ready" && data.observationsStatus === "ready") {
        cache.set(key, { at: Date.now(), data });
      }
    };
    setState({ key, data: LOADING });

    fetchMarineForecast(lat, lon, signal).then(
      (r) => publish({ marineStatus: "ready", marineHours: r.hours }),
      () => publish({ marineStatus: "error", marineHours: [] })
    );

    Promise.allSettled(SEA_METRICS.map((m) => fetchSeaObservation(m, lat, lon, signal))).then((results) => {
      const observations: SeaData["observations"] = {};
      let failed = 0;
      results.forEach((r, i) => {
        if (r.status === "fulfilled") observations[SEA_METRICS[i]] = r.value;
        else failed++;
      });
      publish({ observations, observationsStatus: failed === results.length ? "error" : "ready" });
    });

    return () => controller.abort();
  }, [key, lat, lon]);

  return state.key === key ? state.data : LOADING;
}
