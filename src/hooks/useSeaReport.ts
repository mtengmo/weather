import { useEffect, useState } from "react";
import { buildSeaReport, fetchSeaReport, type SeaReportRaw, type SeaReportView } from "../services/seaReport";

export type SeaReportState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; report: SeaReportView };

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; raw: SeaReportRaw }>();

/** Test hook: drops the module-level cache. */
export function clearSeaReportCache(): void {
  cache.clear();
}

/** SMHI's sjörapport for a point, in the given UI language, cached for 10 minutes per language. */
export function useSeaReport(lat: number, lon: number, language: "sv" | "en"): SeaReportState {
  const [state, setState] = useState<{ key: string; value: SeaReportState } | null>(null);
  const key = `${language}|${lat.toFixed(3)},${lon.toFixed(3)}`;

  useEffect(() => {
    const cached = cache.get(language);
    if (cached && Date.now() - cached.at < TTL_MS) {
      setState({ key, value: { status: "ready", report: buildSeaReport(cached.raw, lat, lon, language) } });
      return;
    }
    const controller = new AbortController();
    fetchSeaReport(language, controller.signal).then(
      (raw) => {
        if (controller.signal.aborted) return;
        cache.set(language, { at: Date.now(), raw });
        setState({ key, value: { status: "ready", report: buildSeaReport(raw, lat, lon, language) } });
      },
      () => {
        if (!controller.signal.aborted) setState({ key, value: { status: "error" } });
      }
    );
    return () => controller.abort();
  }, [key, lat, lon, language]);

  return state && state.key === key ? state.value : { status: "loading" };
}
