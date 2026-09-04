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

/** The footer's "SMHI observations · Open-Meteo forecast"-style disclosure
 *  (018-dashboard-visual-redesign, FR-013) — a longer-form sibling of `dataSourceNote`,
 *  reusing the same fields. */
export function dataSourceDisclosure(series: {
  primarySource?: "smhi" | "open-meteo";
  forecastFromFallbackSource?: boolean;
}): string | null {
  if (series.primarySource === undefined) return null;
  const observedLabel = series.primarySource === "smhi" ? "SMHI observations" : "Open-Meteo observations";
  const forecastSource = series.forecastFromFallbackSource
    ? series.primarySource === "smhi"
      ? "Open-Meteo"
      : "SMHI"
    : series.primarySource === "smhi"
      ? "SMHI"
      : "Open-Meteo";
  return `${observedLabel} · ${forecastSource} forecast`;
}

const COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** Converts a wind direction in degrees to an 8-point compass abbreviation, for the Today card
 *  (018-dashboard-visual-redesign, research.md §5). */
export function directionToCompass(degrees: number): string {
  const index = Math.round(degrees / 45) % 8;
  return COMPASS_POINTS[index];
}
