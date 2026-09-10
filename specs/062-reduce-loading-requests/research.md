# Phase 0 Research: Reduce Loading Requests

## 1. What's actually redundant today (confirmed by reading the code, not just the user's description)

**Decision**: Scope this feature to `useObservationData.ts`'s own request pattern — do not touch
any provider (`smhiProvider.ts`/`openMeteoProvider.ts`/`metNoProvider.ts`) internals.

**Rationale**: Traced every fetch the app makes on a typical visit:

- The 3-day and 7-day Overview tabs already share one fetch (`window === "last-7-days"` for both;
  "3-day" is a pure client-side display resolution of that same data — confirmed via
  `015-overview-3day-resolution-fix`'s existing test "does not fetch again when switching between
  'Last 3 days' and 'Last 7 days'"). Nothing to fix here.
- The Details view's nearby-station comparison fetch is already gated behind
  `includeNearbyStations`, only flipped true once Details is opened
  (`025-reduce-api-requests`). Nothing to fix here either.
- The actual redundancy: `useObservationData`'s main effect (lines ~120-136 before this feature)
  runs `Promise.all([getObservations(window), getMultiSourceForecast(window),
  window !== "last-7-days" ? getObservations("last-7-days") : null])` on **every** re-run of its
  dependency array — which includes `window`. So switching from 24h→7d re-issues
  `getObservations(location, "last-7-days")` even though the very same call already ran (and its
  result is sitting unused in `weeklySeries`) from the initial 24h load. Switching back 7d→24h
  likewise re-issues `getObservations(location, "last-24-hours")` and
  `getMultiSourceForecast(location, "last-24-hours")`, even though those exact calls, for the same
  location, already ran moments earlier.
- Separately: all three pieces (`series`, `multiSourceForecast`, `weeklySeries`) are only written
  to state after `Promise.all` resolves *all three* — so the slowest of the three (typically
  `getMultiSourceForecast`, which is itself three provider calls) holds back the other two from
  ever appearing early.

**Alternatives considered**: Widening provider requests (e.g. always fetch Open-Meteo's 8-day
range and slice client-side for the 24h tab, matching how SMHI's/MET Norway's forecast endpoints
already return a window-independent payload) — rejected for this feature. It would compound nicely
with the hook-level cache below, but touches three provider modules' request shapes for a benefit
this spec doesn't require (FR-002 only requires not re-fetching data *already held* for the current
location — it doesn't require pre-fetching a wider range than requested). Left as a natural
follow-up, not bundled into this change.

## 2. Decoupling the three pieces so each renders independently (US1)

**Decision**: Replace the single `Promise.all([...]).then(([primary, multi, weekly]) => { ...three
setters... })` with three independent promise chains, each calling only its own setter when it
resolves. `setIsRefreshing(false)` moves to a `Promise.allSettled([...]).finally(...)`-style join
of all three (still needed as one combined "is anything still in flight" signal, but decoupled from
which one resolved first) — `isRefreshing`'s existing contract ("true while a window-only refetch
is in flight") doesn't change, only how quickly individual data appears while it's true.

**Rationale**: Directly satisfies FR-001 — nothing about *what* gets fetched changes, only *when*
each already-independent piece of data is allowed to reach the screen. `series`,
`multiSourceForecast`, and `weeklySeries` are already rendered by independent parts of the UI (the
Overview's timeline uses `series`; the Today card's forecast blending uses `multiSourceForecast`;
the 7-day strip uses `weeklySeries`), so there's no correctness reason they need to arrive together
— that was an accident of using one `Promise.all`, not a requirement.

**Alternatives considered**: Using three separate `useEffect`s (like the existing
`nearbyStations`/`uvRiskHours`/`warnings` effects already do) instead of three promise chains
inside one effect — rejected because `series` and `weeklySeries` need to share the *same*
location-change/window-change/refresh-tick reset logic and the new per-window cache (§3), which is
simplest to keep colocated in one effect rather than duplicated across three.

## 3. Reusing already-fetched data across a window switch (US2)

**Decision**: A `useRef` holding a small cache — `{ locationKey, refreshGeneration, byWindow: Map<
ObservationWindow, { series: ObservationSeries; multiSource: MultiSourceForecastEntry[] } > }` —
populated after each successful fetch and consulted before issuing a new one. The cache is
considered valid only when both `locationKey` matches the current location and `refreshGeneration`
matches the current `refreshTick` (059-periodically-auto-refresh's existing 15-minute/visibility
counter) — so a genuine location change or a genuine periodic refresh always bypasses the cache and
fetches fresh (FR-006, and the staleness bound already promised by 059), while a pure window switch
(same location, same refresh generation) consults it first.

Cache **writes** happen unconditionally whenever a fetch resolves — even if that particular effect
run has since been superseded by another window/location change (its own `cancelled` flag only
gates the `setState` calls, not the cache write). This directly satisfies the spec's Edge Cases
note: a request already in flight when the user switches views again is still allowed to complete
and populate its data, so switching back to that view moments later is an instant cache hit rather
than yet another fetch.

**Rationale**: `weeklySeries` was already, in effect, a single-entry version of this cache (it
already stays populated with 7-day data across window switches) — this generalizes that same idea
to cover the 24h/30d entries too, rather than inventing a new mechanism.

**Alternatives considered**:
- A time-based TTL cache (e.g. "reuse data fetched within the last N seconds") independent of
  `refreshTick` — rejected; it would either duplicate 059's own 15-minute freshness policy with a
  second, separately-tuned number, or invite the two to drift out of sync. Piggybacking on the
  existing `refreshTick` generation keeps exactly one staleness policy in the codebase.
- A module-level cache shared across hook instances (e.g. keyed by lat/lon in a plain object
  outside the hook, like `smhiProvider.ts`'s `stationListCache`) — rejected; `useObservationData`
  is only ever mounted once per app instance (there's one `App.tsx` call site), so a `useRef` is
  simpler and needs no manual eviction-across-locations logic beyond what the hook's existing
  location-change reset already does.

## 4. Nearby-station lazy loading (US3)

**Decision**: No code change. Add one integration-level regression test asserting a visit that
never opens Details issues zero `getNearbyStationSeries` calls, and opening Details for the first
time issues exactly one.

**Rationale**: Confirmed via `src/hooks/useObservationData.ts`'s existing separate effect
(`includeNearbyStations` gate, unchanged by §2/§3 above) and via the existing unit test
"never calls getNearbyStationSeries when includeNearbyStations is false" — this is already
correct; the spec's User Story 3 exists purely to guarantee it doesn't regress while §2/§3's
changes land in the same file.

**Alternatives considered**: None — there's no design decision to make for something already
correct; only a coverage gap (no existing *integration*-level test exercises this through the real
`App`/`WeatherIconOverview` wiring, only through the hook in isolation) worth closing.
