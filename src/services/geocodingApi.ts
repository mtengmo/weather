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
  }[];
}

export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({ name: trimmed, count: "5", language: "en", format: "json" });
  const response = await fetch(`${BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Geocoding request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoGeocodingResponse;

  return (data.results ?? []).map((r) => ({
    latitude: r.latitude,
    longitude: r.longitude,
    displayName: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
  }));
}
