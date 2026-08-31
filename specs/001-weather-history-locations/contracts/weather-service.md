# Contract: Weather Observation Service (`services/weatherApi.ts`)

Internal module contract between the UI layer and the historical-weather providers (SMHI + Open-Meteo, per [research.md](../research.md) §1, §1b — revised 2026-08-30). This is the boundary the rest of the app codes against: `ObservationChart.tsx`/`ObservationDetails.tsx` and every other caller only ever call `getObservations` (and, for the chart, `getNearbyStationSeries`), never a provider module directly, so which provider actually answered a given request is an implementation detail.

## Function: `getObservations`

```ts
function getObservations(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow // "last-24-hours" | "last-7-days"
): Promise<ObservationSeries>
```

### Preconditions

- `latitude` ∈ [-90, 90], `longitude` ∈ [-180, 180] (caller's responsibility; this module does not re-validate).

### Behavior (orchestration)

1. Determines whether `location` is within SMHI's station coverage per [contracts/smhi-provider.md](./smhi-provider.md) (nearest active station within 50 km).
2. **If covered**: calls `smhiProvider.getObservations(location, window)`. If that call succeeds with a usable series, returns it. If it fails (network error, no station data, request error), falls through to step 3 instead of surfacing an error — the user asked for SMHI *with* a fallback, not SMHI-or-nothing.
3. **If not covered, or SMHI failed**: calls `openMeteoProvider.getObservations(location, window)` and returns its result.
4. Both provider modules independently satisfy points 4–6 below (hourly mapping, gap preservation, `status` semantics) — `weatherApi.ts` itself does no additional transformation, it only selects which provider's result to return.
5. Maps `window` to each provider's own request parameters (SMHI: `latest-day` for 24h, `latest-months` trimmed to 168 points for 7d, per [contracts/smhi-provider.md](./smhi-provider.md); Open-Meteo: `past_days=1`/`past_days=7` as before).
6. Every returned hourly slot is a `WeatherObservation`. Any slot a provider has no reading for MUST be mapped to `{ temperature: null, precipitation: null }` — never defaulted to `0` (FR-010) — regardless of which provider produced the series.
7. Returns an `ObservationSeries` with `status: "ready"` on success (from either provider).

### Error / edge handling

| Condition | Result |
|---|---|
| Location outside SMHI coverage | Open-Meteo used directly (no SMHI request attempted) |
| Location in SMHI coverage, SMHI request fails or times out | Silently falls back to Open-Meteo for that request; no error surfaced to the UI for this case alone |
| Both SMHI (if attempted) and Open-Meteo fail | Resolves with `status: "unavailable"`, `observations: []` — caller renders the "no data" state (spec Edge Cases: offline / no cached data) |
| Either provider responds but with an empty/partial series | Resolves with `status: "ready"`, gaps represented as `null` fields per point 6 above (not a thrown error) |
| Invalid coordinates (out of range) | Rejects with an error; UI layer is expected to prevent this via upstream validation, not user-facing here |

### Postconditions

- `observations` is ordered oldest → newest.
- `observations.length` matches the expected point count for the window when `status === "ready"` and the provider returned a full series (24 points for last-24-hours, 168 for last-7-days at hourly granularity); partial/gapped series may be shorter or contain `null` fields but the module does not silently drop points to "fix" length.
- Callers cannot distinguish (and must not need to) whether a `"ready"` series came from SMHI or Open-Meteo — the contract is provider-agnostic by design.

## Function: `getNearbyStationSeries`

```ts
function getNearbyStationSeries(
  location: Pick<Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<NearbyStationSeries[]>
```

Used only by `ObservationChart.tsx` for User Story 4 (FR-020/FR-021). See [contracts/smhi-provider.md](./smhi-provider.md) for the underlying nearest-stations lookup.

### Behavior

1. Determines SMHI coverage the same way `getObservations` does (research.md §1b). **If not covered, returns `[]` immediately** — no request is made, satisfying FR-021 with no error state.
2. **If covered**: finds up to 5 nearest active stations (excluding the one already used for the location's own series, if any) via `smhiProvider.getNearestStations(location, 5)`.
3. Fetches each station's `ObservationSeries` for `window` in parallel (`Promise.all`), independently — one station's fetch failure does not fail the others; a station whose fetch fails is simply omitted from the result (not included as an `"unavailable"` entry, since FR-021's "no error" framing extends to individual failed comparison stations too).
4. Returns the successfully-fetched `NearbyStationSeries[]`, ordered nearest → farthest, length 0–5.

### Postconditions

- Never throws — a total failure (e.g., station-list fetch fails) resolves to `[]`, same as "not covered."
- Each returned `NearbyStationSeries.series` independently follows `getObservations`'s gap rules (FR-022) — no cross-series gap-filling or interpolation.
