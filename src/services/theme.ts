import { DEFAULT_THEME, type Theme } from "../models/types";

const STORAGE_KEY = "weather-app:theme-preference:v1";
const VALID_THEMES: Theme[] = ["midnight", "ivory", "glass"];

export function getThemePreference(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (VALID_THEMES as string[]).includes(stored)) {
      return stored as Theme;
    }
  } catch {
    // localStorage unavailable — fall through to default
  }

  return DEFAULT_THEME;
}

export function setThemePreference(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Best-effort; preference simply won't persist in this browser session.
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}
