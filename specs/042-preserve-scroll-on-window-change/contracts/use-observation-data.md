# Contract: `useObservationData`'s data-retention behavior across window changes

## Primary fetch effect (`src/hooks/useObservationData.ts`, ~line 56-85)

**Contract**: On every effect run (triggered by a change to `location`'s coordinates,
`window`, or first mount):

1. Compare the incoming `location`'s coordinates to the previously-fetched location (tracked
   internally, `research.md` §3).
2. **If the location differs from the previous fetch (or there is no previous fetch yet)**: reset
   `series` to `null` and, when applicable, `weeklySeries` to `null` — unchanged from today's
   behavior. This is a genuine "starting over" case; showing stale data for a different location
   would be actively wrong.
3. **If the location is the same as the previous fetch (a window-only change)**: do NOT reset
   `series`/`weeklySeries` to `null`. Leave the previous values in place. Set `isRefreshing` to
   `true` for the duration of the fetch.
4. In both cases, once `Promise.all([...])` resolves (and the effect hasn't been cancelled by a
   newer run), replace `series`/`weeklySeries`/`multiSourceForecast`/`lastUpdated` with the new
   values and set `isRefreshing` to `false`.
5. Never throws; a fetch failure still resolves the promise (existing `getObservations` contract
   returns a `{status: "unavailable"}` series rather than rejecting) — unaffected by this change.

## Consumers (`WeatherIconOverview.tsx`, `ObservationChart.tsx`, `ObservationDetails.tsx`)

**Contract**: No required changes. Each view's existing `{series === null && <p>Loading…</p>}`
block continues to mean "no data yet for the current location" — it simply renders less often now
(only on a genuine location change/first load), which is the desired behavior. A view MAY read the
new `isRefreshing` flag to show a small in-place indicator (e.g. reduced opacity on the
timeline/chart) while a window-only refetch is in flight, but this is optional and not required by
any functional requirement in `spec.md`.
