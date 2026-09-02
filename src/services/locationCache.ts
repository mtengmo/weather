import type { Location } from "../models/types";

const STORAGE_KEY = "weather-app:last-location:v1";

export function getCachedLocation(): Location | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (
      typeof parsed?.latitude === "number" &&
      typeof parsed?.longitude === "number" &&
      typeof parsed?.displayName === "string" &&
      (parsed?.source === "current-position" || parsed?.source === "favorite")
    ) {
      return parsed as Location;
    }
    return null;
  } catch {
    return null;
  }
}

export function setCachedLocation(location: Location): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Best-effort; the location simply won't persist in this browser session.
  }
}
