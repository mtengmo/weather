/**
 * Rain-bar scale per timeline view.
 *
 * Height is LINEAR against a fixed, absolute ceiling (never "relative to the largest bar in
 * view", which made 0.7 mm look huge on a dry day). Colour carries one meaning only: the value
 * is above the ceiling (overflow). Intensity is already readable from the height, so extra
 * colour steps would just repeat it and fail for colour-blind users.
 *
 *  - 24h:   mm in the hour, full bar = 5 mm/h. Sweden is dry (roughly 500-800 mm a year), so a
 *           5 mm hour is already a proper downpour.
 *  - 3-day: parts of a day are 2-11 h long, so the bar shows the AVERAGE mm/h of the bucket
 *           (total / hours). Steady rain then looks the same in a 2 h lunch and a 9 h night.
 *           Full bar = 2.5 mm/h. The label still shows the bucket total.
 *  - 7-day: daily total, full bar = 20 mm (the WMO/ETCCDI "very heavy precipitation day").
 *
 * All ceilings are in mm; displayed inches are converted back first.
 */
export type RainMode = "last-24-hours" | "last-3-days" | "last-7-days";

export const RAIN_CEILINGS: Record<RainMode, number> = {
  "last-24-hours": 5, // mm per hour
  "last-3-days": 2.5, // average mm per hour over the bucket
  "last-7-days": 20, // mm per day
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
  /** True when the value is strictly above the ceiling. */
  overflow: boolean;
  /** True for exactly no rain: draw no bar at all. */
  dry: boolean;
  /** 3-day view only: the average mm/h the height is based on. */
  ratePerHour: number | null;
}

export function rainBar(mm: number, mode: RainMode, bucketHours?: number): RainBar {
  const rate = mode === "last-3-days" ? mm / (bucketHours && bucketHours > 0 ? bucketHours : FALLBACK_BUCKET_HOURS) : null;
  const measure = rate ?? mm;
  const ratio = measure / RAIN_CEILINGS[mode];
  return {
    heightPercent: Math.min(1, Math.max(0, ratio)) * 100,
    overflow: ratio > 1,
    dry: mm <= 0,
    ratePerHour: rate,
  };
}
