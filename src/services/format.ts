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
