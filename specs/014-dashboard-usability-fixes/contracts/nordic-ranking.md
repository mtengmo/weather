# Contract: Nordic-First Search Ranking (User Story 6)

## `src/services/geocodingApi.ts`

```ts
interface OpenMeteoGeocodingResponse {
  results?: {
    latitude: number;
    longitude: number;
    name: string;
    admin1?: string;
    country?: string;
    country_code?: string; // NEW — already present in Open-Meteo's response, now read
  }[];
}

const NORDIC_COUNTRY_CODES = new Set(["SE", "NO", "DK", "FI", "IS"]);

export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  // ...existing fetch/parse unchanged...
  const candidates = (data.results ?? []).map((r) => ({
    latitude: r.latitude,
    longitude: r.longitude,
    displayName: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    isNordic: NORDIC_COUNTRY_CODES.has(r.country_code ?? ""), // internal only, not exported
  }));

  return candidates
    .map((c, index) => ({ ...c, index })) // stable-sort guard
    .sort((a, b) => (a.isNordic === b.isNordic ? a.index - b.index : a.isNordic ? -1 : 1))
    .map(({ isNordic: _isNordic, index: _index, ...candidate }) => candidate);
}
```

`PlaceCandidate`'s exported shape (`latitude`/`longitude`/`displayName`) is unchanged — the
internal `isNordic`/`index` fields used only for sorting are stripped before returning.

## No changes to

- `PlaceSearch.tsx` — it already renders `searchPlaces`'s results in whatever order they arrive;
  no rendering change needed, the reordering happens entirely inside `searchPlaces`.
