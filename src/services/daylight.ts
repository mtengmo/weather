import { getSunTimes } from "./sunMoon";

/**
 * Day/night for icon selection, from the real sunrise/sunset at the viewed location.
 *
 * Whole-hour rule: the first full hour after the event flips. Sunset 16:24 -> night art from
 * 17:00; sunrise 07:30 -> day art from 08:00. Falls back to the fixed 06:00-20:00 local-clock
 * rule when no location is set, or on a polar day/night date with no sunrise/sunset.
 */

export const FALLBACK_NIGHT_START_HOUR = 20;
export const FALLBACK_NIGHT_END_HOUR = 6;

const HOUR_MS = 3600_000;

interface DaylightLocation {
  latitude: number;
  longitude: number;
}

let activeLocation: DaylightLocation | null = null;
const windowCache = new Map<string, { dayStartMs: number; nightStartMs: number } | null>();

/** Sets the location whose sunrise/sunset drives `isNight`. Idempotent; pass null to clear. */
export function setDaylightLocation(location: DaylightLocation | null): void {
  if (
    activeLocation?.latitude === location?.latitude &&
    activeLocation?.longitude === location?.longitude
  ) {
    return;
  }
  activeLocation = location ? { latitude: location.latitude, longitude: location.longitude } : null;
  windowCache.clear();
}

function ceilToHour(ms: number): number {
  return Math.ceil(ms / HOUR_MS) * HOUR_MS;
}

/** Daylight window (epoch ms) for the local calendar date of `date`, or null when unknown. */
function daylightWindow(date: Date): { dayStartMs: number; nightStartMs: number } | null {
  if (!activeLocation) return null;
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const cached = windowCache.get(key);
  if (cached !== undefined) return cached;

  const { sunrise, sunset } = getSunTimes(
    activeLocation,
    new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  );
  const window =
    sunrise !== null && sunset !== null
      ? { dayStartMs: ceilToHour(Date.parse(sunrise)), nightStartMs: ceilToHour(Date.parse(sunset)) }
      : null;
  windowCache.set(key, window);
  return window;
}

export function isNight(timestamp: string): boolean {
  const date = new Date(timestamp);
  const window = daylightWindow(date);
  if (window) {
    const ms = date.getTime();
    return ms < window.dayStartMs || ms >= window.nightStartMs;
  }
  const hour = date.getHours();
  return hour < FALLBACK_NIGHT_END_HOUR || hour >= FALLBACK_NIGHT_START_HOUR;
}
