const BASE_URL = "https://nominatim.openstreetmap.org/reverse";

// Nominatim's public-instance usage policy requires a descriptive User-Agent identifying
// the calling application (006-forecast-now-marker, research.md §6).
const USER_AGENT = "weather.tengmo.com weather-history-app (reverse geocoding for unnamed stations)";

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

/**
 * Reverse-geocodes a coordinate to a short place name, for use only when a station's own
 * name is unavailable (005's "Unnamed station" case). Returns null on any failure —
 * network error, non-ok response, or a response with no usable address field — so callers
 * fall back to their existing placeholder text rather than treating this as an error
 * (006-forecast-now-marker).
 */
export async function reverseGeocode(
  location: { latitude: number; longitude: number }
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
      format: "jsonv2",
    });
    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as NominatimReverseResponse;
    const address = data.address;
    if (!address) return null;

    for (const field of ADDRESS_FIELD_PREFERENCE) {
      const value = address[field];
      if (value?.trim()) return value;
    }
    return null;
  } catch {
    return null;
  }
}
