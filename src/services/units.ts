import type { UnitSystem } from "../models/types";

const STORAGE_KEY = "weather-app:unit-preference:v1";

export function getUnitPreference(): UnitSystem {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "metric" || stored === "imperial") {
      return stored;
    }
  } catch {
    // localStorage unavailable — fall through to the default
  }

  return "metric";
}

export function setUnitPreference(system: UnitSystem): void {
  try {
    localStorage.setItem(STORAGE_KEY, system);
  } catch {
    // Best-effort; preference simply won't persist in this browser session.
  }
}

export function convertTemperature(celsius: number | null, to: UnitSystem): number | null {
  if (celsius === null) return null;
  return to === "imperial" ? (celsius * 9) / 5 + 32 : celsius;
}

export function convertPrecipitation(mm: number | null, to: UnitSystem): number | null {
  if (mm === null) return null;
  return to === "imperial" ? mm / 25.4 : mm;
}

export function convertWindSpeed(ms: number | null, to: UnitSystem): number | null {
  if (ms === null) return null;
  return to === "imperial" ? ms * 2.23694 : ms;
}
