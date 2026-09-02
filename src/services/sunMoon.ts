/**
 * Sunrise/sunset and moon phase, computed purely locally from lat/lon/date — no network
 * call, no new dependency (008-timeline-dashboard-redesign, research.md §4).
 */

export type MoonPhase =
  | "new"
  | "waxing-crescent"
  | "first-quarter"
  | "waxing-gibbous"
  | "full"
  | "waning-gibbous"
  | "last-quarter"
  | "waning-crescent";

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
// Standard sunrise/sunset zenith: 90 degrees + ~50' atmospheric refraction + the sun's own
// angular radius (~16') — the conventional "top of the sun touches the horizon" definition.
const ZENITH_DEGREES = 90.833;

function dayOfYearUTC(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const oneDayMs = 24 * 3600_000;
  return Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / oneDayMs) + 1;
}

/**
 * The classic "Sunrise/Sunset Algorithm" (Almanac for Computers, 1990 — the same public-
 * domain equations underlying most independent sunrise/sunset implementations, including
 * NOAA's own calculator's lineage). Returns hours (UTC, may be fractional) or null when the
 * given latitude has no sunrise/sunset on this date (polar day/night — a real case for this
 * app's SMHI-covered northern-Sweden locations).
 */
function calcSunUtcHours(date: Date, latitude: number, longitude: number, isSunrise: boolean): number | null {
  const dayOfYear = dayOfYearUTC(date);
  const lngHour = longitude / 15;
  const t = isSunrise ? dayOfYear + (6 - lngHour) / 24 : dayOfYear + (18 - lngHour) / 24;

  const meanAnomaly = 0.9856 * t - 3.289;

  let sunTrueLong =
    meanAnomaly +
    1.916 * Math.sin(meanAnomaly * RAD) +
    0.02 * Math.sin(2 * meanAnomaly * RAD) +
    282.634;
  sunTrueLong = ((sunTrueLong % 360) + 360) % 360;

  let rightAscension = DEG * Math.atan(0.91764 * Math.tan(sunTrueLong * RAD));
  rightAscension = ((rightAscension % 360) + 360) % 360;
  // Right ascension must be in the same quadrant as the true longitude.
  const longitudeQuadrant = Math.floor(sunTrueLong / 90) * 90;
  const raQuadrant = Math.floor(rightAscension / 90) * 90;
  rightAscension = (rightAscension + (longitudeQuadrant - raQuadrant)) / 15;

  const sinDeclination = 0.39782 * Math.sin(sunTrueLong * RAD);
  const cosDeclination = Math.cos(Math.asin(sinDeclination));

  const cosHourAngle =
    (Math.cos(ZENITH_DEGREES * RAD) - sinDeclination * Math.sin(latitude * RAD)) /
    (cosDeclination * Math.cos(latitude * RAD));

  if (cosHourAngle > 1 || cosHourAngle < -1) return null; // no sunrise/sunset this date

  let hourAngle = isSunrise ? 360 - DEG * Math.acos(cosHourAngle) : DEG * Math.acos(cosHourAngle);
  hourAngle = hourAngle / 15;

  const localMeanTime = hourAngle + rightAscension - 0.06571 * t - 6.622;
  const utcHours = ((localMeanTime - lngHour) % 24 + 24) % 24;
  return utcHours;
}

function utcHoursToIso(date: Date, utcHours: number): string {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  result.setUTCMinutes(Math.round(utcHours * 60));
  return result.toISOString();
}

/**
 * Sunrise/sunset for the given date at the given location. Either field is null when that
 * date has no sunrise/sunset at this latitude (polar day/night).
 */
export function getSunTimes(
  location: { latitude: number; longitude: number },
  date: Date
): { sunrise: string | null; sunset: string | null } {
  const sunriseHours = calcSunUtcHours(date, location.latitude, location.longitude, true);
  const sunsetHours = calcSunUtcHours(date, location.latitude, location.longitude, false);
  return {
    sunrise: sunriseHours !== null ? utcHoursToIso(date, sunriseHours) : null,
    sunset: sunsetHours !== null ? utcHoursToIso(date, sunsetHours) : null,
  };
}

const SYNODIC_MONTH_DAYS = 29.53059;
// A commonly-cited reference new moon (2000-01-06 18:14 UTC) — only the remainder after
// dividing by the synodic month matters, so any correct reference date works.
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14);

const MOON_PHASES: MoonPhase[] = [
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
  "full",
  "waning-gibbous",
  "last-quarter",
  "waning-crescent",
];

/**
 * The moon phase for the given date, via the standard synodic-month day-counting
 * approximation (research.md §4) — accurate to about +/-1 day, sufficient to name a phase.
 */
export function getMoonPhase(date: Date): MoonPhase {
  const daysSinceKnownNewMoon = (date.getTime() - KNOWN_NEW_MOON_UTC) / 86_400_000;
  const age = (((daysSinceKnownNewMoon % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS);
  const phaseIndex = Math.round((age / SYNODIC_MONTH_DAYS) * 8) % 8;
  return MOON_PHASES[phaseIndex];
}
