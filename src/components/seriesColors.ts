// Index 0 is always the primary (selected) location; 1-5 are nearby comparison stations.
export const SERIES_COLORS = [
  "#2563eb", // primary — blue
  "#dc2626", // red
  "#16a34a", // green
  "#d97706", // amber
  "#7c3aed", // violet
  "#0891b2", // cyan
];

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

// Distinguishes series by more than color alone (accessibility) — index 0 (primary) is solid.
const SERIES_DASH_PATTERNS = [undefined, "5 3", "1 3", "8 3 1 3", "2 2", "6 2 1 2"];

export function seriesDash(index: number): string | undefined {
  return SERIES_DASH_PATTERNS[index % SERIES_DASH_PATTERNS.length];
}
