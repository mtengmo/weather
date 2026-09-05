export function formatValue(value: number | null, decimals = 1): string {
  if (value === null) return "—";
  return value.toFixed(decimals);
}

/**
 * A short, always-visible statement of which provider(s) supplied a series' data
 * (013-overview-default-and-layout, FR-013/FR-014). Returns null when `primarySource` is
 * absent (e.g. a test fixture predating this field) — no note renders rather than a
 * misleading placeholder.
 */
export function dataSourceNote(series: {
  primarySource?: "smhi" | "open-meteo";
  forecastFromFallbackSource?: boolean;
}): string | null {
  if (series.primarySource === undefined) return null;
  if (series.primarySource === "open-meteo") return "Data: Open-Meteo";
  return series.forecastFromFallbackSource ? "Data: SMHI (forecast: Open-Meteo)" : "Data: SMHI";
}

/**
 * The footer's data-source/freshness disclosure — a longer-form sibling of `dataSourceNote`.
 * Names only the *observation* source (still meaningful: SMHI, or its Open-Meteo fallback),
 * plus a single forecast freshness time, rather than naming a "forecast source" at all
 * (020-dashboard-polish-round-five, US6/FR-009 — the forecast is now always potentially a
 * cross-source average, so a single source name would be misleading). Freshness prefers the
 * source's own "as of" time (`series.forecastIssuedAt`, e.g. SMHI's own `referenceTime`) when
 * available, otherwise the app's own last-fetch time (`lastUpdated`) — never omitted when a
 * forecast is shown, since one of the two is always present once a fetch has completed.
 *
 * `combined` names both forecast sources when the forecast genuinely blends them
 * (021-dashboard-polish-round-six, US2/FR-003 — the per-period `(avg)` marker already existed,
 * but the footer never confirmed blending was happening at all).
 */
export function dataSourceDisclosure(
  series: {
    primarySource?: "smhi" | "open-meteo";
    forecastFromFallbackSource?: boolean;
    forecastIssuedAt?: string | null;
  },
  lastUpdated: string | null,
  combined: boolean
): string | null {
  if (series.primarySource === undefined) return null;
  const observedLabel = series.primarySource === "smhi" ? "SMHI observations" : "Open-Meteo observations";
  const forecastLabel = combined ? "SMHI + Open-Meteo forecast" : "Forecast";
  const freshnessTime = series.forecastIssuedAt ?? lastUpdated;
  const freshness = freshnessTime
    ? ` · ${forecastLabel} updated ${new Date(freshnessTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "";
  return `${observedLabel}${freshness}`;
}

const COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** Converts a wind direction in degrees to an 8-point compass abbreviation, for the Today card
 *  (018-dashboard-visual-redesign, research.md §5). */
export function directionToCompass(degrees: number): string {
  const index = Math.round(degrees / 45) % 8;
  return COMPASS_POINTS[index];
}
