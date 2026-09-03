const BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";

export interface PlaceCandidate {
  latitude: number;
  longitude: number;
  displayName: string;
}

interface OpenMeteoGeocodingResponse {
  results?: {
    latitude: number;
    longitude: number;
    name: string;
    admin1?: string;
    country?: string;
    country_code?: string;
  }[];
}

// Most users and the app's best data coverage (SMHI) are in the Nordics — a soft preference,
// not a filter: everything else stays fully searchable/selectable (014, FR-012).
const NORDIC_COUNTRY_CODES = new Set(["SE", "NO", "DK", "FI", "IS"]);

export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({ name: trimmed, count: "5", language: "en", format: "json" });
  const response = await fetch(`${BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Geocoding request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoGeocodingResponse;

  const candidates = (data.results ?? []).map((r, index) => ({
    latitude: r.latitude,
    longitude: r.longitude,
    displayName: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    isNordic: NORDIC_COUNTRY_CODES.has(r.country_code ?? ""),
    index, // stable-sort guard
  }));

  return candidates
    .sort((a, b) => (a.isNordic === b.isNordic ? a.index - b.index : a.isNordic ? -1 : 1))
    .map(({ isNordic: _isNordic, index: _index, ...candidate }) => candidate);
}
