/**
 * Fixed cold-to-hot color scale for temperature charts (037-header-controls-and-chart-fixes,
 * US6) — replaces a single flat line color with one that reflects the actual value. Evenly
 * stepped every 5°C so band edges line up with the temperature chart's own degree-scale
 * gridlines (WeatherIconOverview's buildTicks).
 */
export interface TemperatureBand {
  /** Inclusive upper bound in °C; `null` for the open-ended hottest band. */
  maxC: number | null;
  label: string;
  color: string;
}

export const TEMPERATURE_BANDS: TemperatureBand[] = [
  { maxC: -15, label: "Very cold", color: "#327EAE" },
  { maxC: -10, label: "Cold", color: "#4FA3C7" },
  { maxC: -5, label: "Frost", color: "#82C4D8" },
  { maxC: 0, label: "Around freezing", color: "#D9EEF2" },
  { maxC: 5, label: "Cool", color: "#A8D5C0" },
  { maxC: 10, label: "Mild", color: "#73BE8C" },
  { maxC: 15, label: "Pleasant", color: "#C7D86A" },
  { maxC: 20, label: "Warm", color: "#F2D45C" },
  { maxC: 25, label: "Hot", color: "#F2A344" },
  { maxC: 30, label: "Very hot", color: "#E8663D" },
  { maxC: null, label: "Extreme heat", color: "#C93636" },
];

/** The band a given temperature falls into — first band whose `maxC` it's at or below,
 *  the last (open-ended) band otherwise. */
export function bandForTemperature(value: number): TemperatureBand {
  for (const band of TEMPERATURE_BANDS) {
    if (band.maxC === null || value <= band.maxC) return band;
  }
  // Unreachable — the last band always has maxC: null — but keeps this function total.
  return TEMPERATURE_BANDS[TEMPERATURE_BANDS.length - 1];
}

export interface GradientStop {
  /** Percent, 0-100. */
  offset: number;
  color: string;
}

/**
 * Vertical gradient stops for an `objectBoundingBox` `<linearGradient>` (y1=0 y2=1) applied to
 * a temperature line's own rendered path: offset 0% is the line's topmost point (its maximum
 * value), 100% is its bottommost (its minimum value) — SVG geometry already gives a `<path>`
 * this bounding box, so no axis-scale access is needed. Produces hard (duplicate-offset) edges
 * at each band boundary within `[min, max]` rather than a smooth blend, coloring the line in
 * discrete flat-colored segments per band.
 */
export function buildGradientStops(min: number, max: number): GradientStop[] {
  const range = max - min || 1;
  const offsetFor = (value: number): number => {
    const raw = ((max - value) / range) * 100;
    return Math.min(100, Math.max(0, raw));
  };

  // Boundaries strictly between min and max, hottest first (ascending offset == descending
  // temperature) so stops come out in the non-decreasing-offset order SVG expects.
  const boundaries = TEMPERATURE_BANDS.map((b) => b.maxC)
    .filter((maxC): maxC is number => maxC !== null && maxC > min && maxC < max)
    .sort((a, b) => b - a);

  const stops: GradientStop[] = [{ offset: 0, color: bandForTemperature(max).color }];

  for (const boundary of boundaries) {
    const offset = offsetFor(boundary);
    // Leaving the hotter band (values > boundary) and entering the colder one (values <=
    // boundary, which is exactly what bandForTemperature(boundary) itself resolves to).
    stops.push({ offset, color: bandForTemperature(boundary + 0.0001).color });
    stops.push({ offset, color: bandForTemperature(boundary).color });
  }

  stops.push({ offset: 100, color: bandForTemperature(min).color });

  return stops;
}
