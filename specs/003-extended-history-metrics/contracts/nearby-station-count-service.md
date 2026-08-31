# Contract: Nearby-Station Count Preference (`services/nearbyStationCount.ts`)

New internal module contract, following the exact shape of `001-weather-history-locations`'s `theme-service.md` (`services/theme.ts`).

```ts
type NearbyStationCount = 0 | 1 | 2 | 3 | 4;

function getNearbyStationCountPreference(): NearbyStationCount

function setNearbyStationCountPreference(count: NearbyStationCount): void
```

### `getNearbyStationCountPreference()`

- Reads a persisted choice from `localStorage` (key `weather-app:nearby-station-count:v1`) if present and a valid integer `0`-`4`; otherwise returns `4` (FR-007a's default). Never throws — falls back to `4` if `localStorage` is unavailable or the stored value is invalid/out-of-range (e.g., a stale `5` from before this feature, per data-model.md's validation rules).

### `setNearbyStationCountPreference(count)`

- Persists `count` to `localStorage`. Best-effort: if `localStorage` is unavailable, the call is a no-op (in-memory selection still applies for the current session, consistent with `setThemePreference`'s existing best-effort behavior).

### `useNearbyStationCountPreference()` hook

- Follows the exact shape of `useThemePreference()`/`useUnitPreference()`: reads the persisted value on mount, exposes `{ count, setCount }`, and calls `setNearbyStationCountPreference` whenever `setCount` is invoked.

## Consumers

- `App.tsx` holds the current count via this hook and passes it to `useObservationData` (which forwards it to `weatherApi.getNearbyStationSeries`, per the [weather-metrics-service.md](./weather-metrics-service.md) contract) and to a new `NearbyStationCountControl` component (the dropdown, FR-007).
- Changing the count re-triggers the observation-data fetch for the current location/window (same re-fetch mechanism `useObservationData` already uses for location/window changes) — switching count is not expected to be instant like a theme swap, since it changes what's fetched, not just what's displayed (unlike theme/unit, which are pure display preferences over already-fetched data).

## Postconditions

- After `setNearbyStationCountPreference(count)` followed by a reload, `getNearbyStationCountPreference()` returns `count`.
- Selecting `0` results in zero nearby-station network requests for any subsequent fetch (research.md §5) — verified via the [weather-metrics-service.md](./weather-metrics-service.md) contract's `count === 0` short-circuit.
