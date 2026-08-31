# Contract: Geocoding Service (`services/geocodingApi.ts`)

Internal module contract for resolving free-text place search input to coordinates + a canonical display name (Open-Meteo Geocoding API, per [research.md](../research.md) §3).

## Function: `searchPlaces`

```ts
function searchPlaces(query: string): Promise<PlaceCandidate[]>

interface PlaceCandidate {
  latitude: number;
  longitude: number;
  displayName: string; // canonical name, e.g. "Stockholm, Sweden"
}
```

### Preconditions

- `query` is a non-empty, trimmed string (caller/UI responsibility to avoid firing on empty input).

### Behavior

1. Sends `query` to the geocoding provider.
2. Maps each result to a `PlaceCandidate` with a canonical `displayName` suitable for storing on a `FavoritePlace`.
3. Returns results in the provider's relevance order; UI presents them as a disambiguation list when more than one candidate is returned.

### Error / edge handling

| Condition | Result |
|---|---|
| No matches found | Resolves with `[]` — UI shows "no places found" |
| Network failure | Rejects with an error — UI shows a retry-able error state, distinct from "no matches" |

### Postconditions

- Returned `latitude`/`longitude` are always within valid ranges (provider-guaranteed); no further validation needed by the caller before passing into `getObservations` or persisting as a `FavoritePlace`.
