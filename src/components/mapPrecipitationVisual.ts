// mm of forecast precipitation at/above which the circle reaches its maximum visual intensity —
// chosen as a "heavy rain" reference point, not a strict physical threshold
// (031-map-precipitation-overlay, research.md §3).
const MAX_VISUAL_MM = 5;
const MIN_RADIUS = 8;
const MAX_RADIUS = 24;
const MIN_OPACITY = 0.15;
const MAX_OPACITY = 0.55;

/** Maps a positive mm reading to a capped, monotonically increasing radius/opacity pair — never
 *  called for a zero/absent reading, which renders no circle at all (FR-003). Kept in its own
 *  module (not `MapView.tsx`) so that component file only exports the component, per this
 *  project's React Fast Refresh convention. */
export function precipitationVisualIntensity(mm: number): { radius: number; opacity: number } {
  const t = Math.min(mm, MAX_VISUAL_MM) / MAX_VISUAL_MM;
  return {
    radius: MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS),
    opacity: MIN_OPACITY + t * (MAX_OPACITY - MIN_OPACITY),
  };
}
