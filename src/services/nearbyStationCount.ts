import { DEFAULT_NEARBY_STATION_COUNT, type NearbyStationCount } from "../models/types";

const STORAGE_KEY = "weather-app:nearby-station-count:v1";
const VALID_COUNTS: NearbyStationCount[] = [0, 1, 2, 3, 4];

export function getNearbyStationCountPreference(): NearbyStationCount {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = Number(stored);
      if ((VALID_COUNTS as number[]).includes(parsed)) {
        return parsed as NearbyStationCount;
      }
    }
  } catch {
    // localStorage unavailable — fall through to default
  }

  return DEFAULT_NEARBY_STATION_COUNT;
}

export function setNearbyStationCountPreference(count: NearbyStationCount): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(count));
  } catch {
    // Best-effort; preference simply won't persist in this browser session.
  }
}
