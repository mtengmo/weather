const STORAGE_KEY = "weather-app:combine-forecast-sources:v1";

export function getCombineForecastSourcesPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setCombineForecastSourcesPreference(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Best-effort; the preference simply won't persist in this browser session.
  }
}
