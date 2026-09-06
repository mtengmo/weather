const STORAGE_KEY = "weather-app:dismissed-warnings:v1";

/** Reads the set of dismissed warning ids from localStorage — empty on any parse failure or
 *  when the key is absent, never throws (032-dashboard-polish-round-seven, US4). */
export function getDismissedWarningIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function addDismissedWarningId(id: string, current: Set<string>): Set<string> {
  const next = new Set(current);
  next.add(id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Best-effort; the dismissal simply won't persist in this browser session.
  }
  return next;
}
