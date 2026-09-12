import { DEFAULT_LANGUAGE_PREFERENCE, type LanguagePreference } from "../models/types";

const STORAGE_KEY = "weather-app:language-preference:v1";
const VALID_LANGUAGE_PREFERENCES: LanguagePreference[] = ["auto", "en", "sv"];

export function getLanguagePreference(): LanguagePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (VALID_LANGUAGE_PREFERENCES as string[]).includes(stored)) {
      return stored as LanguagePreference;
    }
  } catch {
    // localStorage unavailable — fall through to default
  }

  return DEFAULT_LANGUAGE_PREFERENCE;
}

export function setLanguagePreference(preference: LanguagePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Best-effort; preference simply won't persist in this browser session.
  }
}
