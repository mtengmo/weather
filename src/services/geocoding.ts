import { appLanguage } from "./timeFormat";

const BASE_URL = "https://nominatim.openstreetmap.org/reverse";

// Nominatim's public-instance usage policy requires a descriptive User-Agent identifying
// the calling application (006-forecast-now-marker, research.md §6).
const USER_AGENT = "vader.tengmo.com weather-history-app (reverse geocoding for unnamed stations)";

// Most-specific-first: prefer whichever populated-place field Nominatim actually returned.
const ADDRESS_FIELD_PREFERENCE = ["city", "town", "village", "suburb", "municipality", "county"] as const;

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  municipality?: string;
  county?: string;
}

interface NominatimReverseResponse {
  address?: NominatimAddress;
}

const CACHE_PREFIX = "vader.placeName.v1:";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Nominatim's public usage policy allows at most one request per second. */
const MIN_REQUEST_GAP_MS = 1100;

// Never persist a placeholder: these are the "no name" labels the app itself shows.
const PLACEHOLDER_NAMES = new Set(["unnamed station", "namnlös station", "unknown", "okänd plats"]);

function normaliseLanguage(): string {
  return appLanguage();
}

export function isPlaceholderName(value: string | null | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return !v || PLACEHOLDER_NAMES.has(v);
}

/** Cache key: coordinates rounded to 3 decimals (~110 m) plus the language, so a name resolved in
 *  Swedish is never served to an English reader. */
export function placeNameCacheKey(location: { latitude: number; longitude: number }, language: string): string {
  return `${CACHE_PREFIX}${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}:${language}`;
}

function readCache(key: string, now: number): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { name?: unknown; savedAt?: unknown };
    if (typeof entry.name !== "string" || typeof entry.savedAt !== "number") return null;
    if (now - entry.savedAt > CACHE_TTL_MS || isPlaceholderName(entry.name)) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.name;
  } catch {
    return null; // storage blocked or corrupt entry: behave as a miss
  }
}

function writeCache(key: string, name: string, now: number): void {
  if (isPlaceholderName(name)) return;
  try {
    localStorage.setItem(key, JSON.stringify({ name, savedAt: now }));
  } catch {
    // storage blocked or full: the cache is an optimisation only
  }
}

let lastRequestAt = 0;

async function waitForRequestSlot(): Promise<void> {
  const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
  // Reserve the slot synchronously so concurrent callers queue behind each other.
  lastRequestAt = Math.max(Date.now(), lastRequestAt + MIN_REQUEST_GAP_MS);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

/** Test hook: forget the request spacing state. */
export function resetGeocodingThrottleForTests(): void {
  lastRequestAt = 0;
}

/**
 * Reverse-geocodes a coordinate to a short place name, for use only when a station's own
 * name is unavailable (005's "Unnamed station" case). Returns null on any failure so callers
 * fall back to their existing placeholder text (006-forecast-now-marker). Results are cached in
 * localStorage (3-decimal coordinates + language, 30 days) and consulted before the network;
 * failures are logged, never swallowed silently, and never cached.
 */
export async function reverseGeocode(
  location: { latitude: number; longitude: number }
): Promise<string | null> {
  const language = normaliseLanguage();
  const key = placeNameCacheKey(location, language);
  const cached = readCache(key, Date.now());
  if (cached !== null) return cached;

  try {
    await waitForRequestSlot();
    const params = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
      format: "jsonv2",
      // City level: without it Nominatim may answer with the nearest building's suburb.
      zoom: "10",
      "accept-language": language,
    });
    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) {
      console.warn(`Reverse geocoding failed: HTTP ${response.status}`);
      return null;
    }

    const data = (await response.json()) as NominatimReverseResponse;
    const address = data.address;
    if (!address) return null;

    for (const field of ADDRESS_FIELD_PREFERENCE) {
      const value = address[field]?.trim();
      if (value && !isPlaceholderName(value)) {
        writeCache(key, value, Date.now());
        return value;
      }
    }
    return null;
  } catch (error) {
    console.warn("Reverse geocoding failed", error);
    return null;
  }
}
