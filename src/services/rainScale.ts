/**
 * Rain-bar scale per timeline view. One series: snow is the same precipitation (water
 * equivalent), so it is drawn in this row too and the condition icons above say what fell.
 *
 * Height is LINEAR against a fixed, absolute ceiling (never "relative to the largest bar in
 * view"). Colour is the intensity class, anchored to SMHI's published classes
 * (smhi.se/kunskapsbanken/meteorologi/nederbord/nederbordsintensitet): light rain <= 0.5 mm/h,
 * moderate 0.5-4 mm/h, heavy > 4 mm/h, heavy showers 10-50 mm/h. For a whole day, SMHI's lowest
 * large-rainfall alert amount is 35 mm/24 h and ~40 mm/day is often experienced as a cloudburst.
 * The 3-day and 7-day bands below are derived from those (not published by SMHI).
 *
 *  - 24h:   mm in the hour. Bar is full at 4 mm/h, the start of SMHI's "heavy rain".
 *  - 3-day: parts of a day are 2-11 h long, so the bar uses the AVERAGE mm/h of the bucket
 *           (total / hours); the label still shows the total. Full at 2 mm/h.
 *  - 7-day: daily total, full at 20 mm.
 *
 * A bar above its ceiling stays at full height and gets a cap. All bounds are in mm; displayed
 * inches are converted back first.
 */
export type RainMode = "last-24-hours" | "last-3-days" | "last-7-days";
export type RainLevel = 1 | 2 | 3 | 4;

interface RainScale {
  /** Measure (mm, or mm/h for the 3-day view) that fills the bar. */
  ceiling: number;
  /** Lower bounds of levels 2, 3 and 4 in the same measure. */
  bounds: readonly [number, number, number];
}

export const RAIN_SCALES: Record<RainMode, RainScale> = {
  "last-24-hours": { ceiling: 4, bounds: [0.5, 4, 10] }, // mm per hour
  "last-3-days": { ceiling: 2, bounds: [0.5, 2, 4] }, // average mm per hour in the bucket
  "last-7-days": { ceiling: 20, bounds: [1, 10, 35] }, // mm per day
};

/** Bucket length assumed when a 3-day point does not carry its own (nominal average part-of-day). */
const FALLBACK_BUCKET_HOURS = 4;

const MM_PER_INCH = 25.4;

/** Converts a displayed value (mm or in) back to mm. */
export function toMm(value: number, unitLabel: string): number {
  return unitLabel === "in" ? value * MM_PER_INCH : value;
}

export interface RainBar {
  /** 0-100, linear against the view's ceiling and clipped at 100. */
  heightPercent: number;
  /** True when the value is strictly above the ceiling (bar clipped, cap shown). */
  overflow: boolean;
  /** True for exactly no rain: draw no bar at all. */
  dry: boolean;
  /** Intensity class 1 (light) to 4 (very heavy). */
  level: RainLevel;
  /** 3-day view only: the average mm/h the bar is based on. */
  ratePerHour: number | null;
}

export function rainBar(mm: number, mode: RainMode, bucketHours?: number): RainBar {
  const { ceiling, bounds } = RAIN_SCALES[mode];
  const rate = mode === "last-3-days" ? mm / (bucketHours && bucketHours > 0 ? bucketHours : FALLBACK_BUCKET_HOURS) : null;
  const measure = rate ?? mm;
  const ratio = measure / ceiling;
  const level: RainLevel = measure >= bounds[2] ? 4 : measure >= bounds[1] ? 3 : measure >= bounds[0] ? 2 : 1;
  return {
    heightPercent: Math.min(1, Math.max(0, ratio)) * 100,
    overflow: ratio > 1,
    dry: mm <= 0,
    level,
    ratePerHour: rate,
  };
}
