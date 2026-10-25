export type HomeViewPreference = "overview" | "sea";

export const DEFAULT_HOME_VIEW_PREFERENCE: HomeViewPreference = "overview";
const STORAGE_KEY = "weather-app:last-home-view:v1";

export function getHomeViewPreference(): HomeViewPreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "overview" || stored === "sea") return stored;
  } catch {
    // localStorage unavailable — fall through to default
  }
  return DEFAULT_HOME_VIEW_PREFERENCE;
}

export function setHomeViewPreference(preference: HomeViewPreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Best-effort; preference simply won't persist.
  }
}
