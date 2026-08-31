# Contract: SMHI Provider (`services/smhiProvider.ts`)

Internal module contract for the SMHI-specific half of the dual-provider setup (per [research.md](../research.md) §1, §1b). Used only by `services/weatherApi.ts` (see [contracts/weather-service.md](./weather-service.md)) — never called directly by UI code.

## Functions

```ts
function isCovered(location: Pick<Location, "latitude" | "longitude">): Promise<boolean>

function getObservations(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<ObservationSeries> // throws on any failure — caller (weatherApi.ts) catches and falls back

function getNearestStations(
  location: Pick<Location, "latitude" | "longitude">,
  count: number
): Promise<{ id: string; displayName: string; distanceKm: number; latitude: number; longitude: number }[]>
```

### `isCovered(location)`

1. Fetches and caches (in-memory, once per page session) the SMHI station list for parameter `1` (`GET /api/version/1.0/parameter/1.json`).
2. Computes the haversine distance from `location` to every `active: true` station.
3. Returns `true` if the nearest active station is within **50 km**, else `false`.
4. On a station-list fetch failure, returns `false` (treat as not covered — `weatherApi.ts` will use Open-Meteo).

### `getObservations(location, window)`

Preconditions: `isCovered(location)` has already resolved `true` for this location (caller's responsibility — this function does not re-check).

1. Finds the nearest active station reporting parameter `1` (temperature) and, independently, the nearest active station reporting parameter `7` (precipitation) — they are not always the same station.
2. Maps `window` to an SMHI `period`: `"last-24-hours"` → `latest-day`; `"last-7-days"` → `latest-months` (trimmed client-side to the trailing 168 hourly points relative to now, mirroring the Open-Meteo provider's trimming approach).
3. Fetches `GET /api/version/1.0/parameter/{1|7}/station/{stationId}/period/{period}/data.json` for both parameters.
4. Builds the full expected hourly timestamp sequence for the window (every hour, oldest → newest, ending at the current hour). For each expected hour, looks up a matching SMHI `value` entry (matched by `date`, rounded to the hour); if none exists, that hour's `temperature`/`precipitation` is `null` (SMHI omits missing hours rather than marking them — see research.md §1) — this is how FR-010 gap semantics are produced from SMHI's data shape.
5. Parses each present `value.value` string to a number (SMHI values are strings, e.g. `"13.6"`).
6. Returns `{ location, window, observations, status: "ready" }`.

### Error handling

| Condition | Result |
|---|---|
| Station-list or data fetch fails (network/HTTP error) | Throws — `weatherApi.ts` catches this and falls back to Open-Meteo per its contract |
| No active station found for a parameter within the location's area (rare once `isCovered` is true, but possible near the coverage edge) | Throws — same fallback behavior |
| Station has some hours missing | Not an error — handled as gaps per step 4 above |

### Postconditions

- Returned `WeatherObservation.temperature`/`precipitation` are in the same units as Open-Meteo's output (Celsius, millimeters) — SMHI's raw units already match, so no conversion is needed here.
- Never returns `status: "unavailable"` itself — a failure is always a thrown error, so the fallback decision stays entirely in `weatherApi.ts` (single place that decides "give up" vs. "try the other provider").

### `getNearestStations(location, count)`

Supports [contracts/weather-service.md](./weather-service.md)'s `getNearbyStationSeries` for User Story 4 (FR-020). Preconditions: same as `getObservations` — caller has already confirmed `isCovered(location)`.

1. Reuses the same cached station list as `isCovered`/`getObservations` (parameter `1`'s station list — precipitation-only stations are not used as comparison-series anchors, matching the "primary station" convention already used for the location's own series).
2. Computes haversine distance from `location` to every `active: true` station, sorts ascending, and returns the nearest `count` (a plain array slice — no distance threshold here, unlike `isCovered`'s 50 km cutoff, since these are always at least as close as whatever satisfied that threshold).
3. Returns fewer than `count` entries only if fewer than `count` active stations exist at all (extremely unlikely given SMHI's station density, but not an error if it happens — spec Edge Cases: show however many exist).
4. Never throws for "too few stations" — only for a station-list fetch failure, which the caller (`getNearbyStationSeries`) treats as "resolve to `[]`," not a thrown error (see [contracts/weather-service.md](./weather-service.md)).
