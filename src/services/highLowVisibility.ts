import { DEFAULT_HIGH_LOW_VISIBLE, type HighLowVisibility } from "../models/types";

const STORAGE_KEY = "weather-app:high-low-visible:v1";

export function getHighLowVisibility(): HighLowVisibility {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true" || stored === "false") {
      return stored === "true";
    }
  } catch {
    // localStorage unavailable — fall through to default
  }

  return DEFAULT_HIGH_LOW_VISIBLE;
}

export function setHighLowVisibility(visible: HighLowVisibility): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(visible));
  } catch {
    // Best-effort; preference simply won't persist in this browser session.
  }
}
