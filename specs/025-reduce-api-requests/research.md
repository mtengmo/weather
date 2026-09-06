# Research: Reduce API Requests & Hide 0% Rain Chance

## §1 — Nearby-station data is fetched eagerly regardless of view (US1 / FR-001-003)

**Decision (confirmed via code review)**: `useObservationData.ts` is called exactly once, in
`App.tsx`, independent of which view (`overview`/`graph`/`details`/`map`) is currently active. Its
single `Promise.all` always includes `getNearbyStationSeries(location, window, nearbyStationCount)`
— fetched on every location/window/count change regardless of whether the Details/graph view (the
only consumer of `nearbyStations`, confirmed via `grep` — `ObservationChart.tsx` and
`ObservationDetails.tsx` are the only two components that read it) has ever been opened.

**Fix**: Split nearby-station fetching into its own effect with its own trigger condition — fetch
only once a "Details/graph opened" flag becomes true (tracked in `App.tsx`, set the first time
`view` becomes `"graph"` or `"details"` and never reset), independent of the primary
series/weekly-series/multi-source-forecast fetch, which the Overview needs immediately and
unconditionally. Once the flag is true, subsequent location/window/count changes continue to
refresh nearby-station data normally (FR-003 — no unnecessary re-fetch, but also no stale data
once the feature is in active use).

**Rationale**: Confirmed via live measurement (both `npm run dev` and a production
`npm run build && npm run preview`, ruling out React StrictMode's dev-only effect
double-invocation as a confound) that a fresh Overview load issues 57 weather-data requests, and
that nearby-station data (default 4 comparison stations × 6 parameters, each independently
resolving its own nearest station and fetching its own value series) accounts for roughly 40 of
them — by far the largest single contributor. Deferring it until first use directly addresses the
literal request ("the details page don't need to be loaded at start").

**Alternatives considered**: Reducing the default `nearbyStationCount` from 4 — rejected; that
changes a user-facing preference/default unrelated to the actual complaint (fetch timing, not
fetch quantity-when-shown), and the user never asked for fewer comparison stations, only for them
not to load before they're needed.

## §2 — `getMultiSourceForecast`'s SMHI branch re-fetches the entire observation pipeline (US2 / FR-004)

**Decision (confirmed via code review)**: `weatherApi.ts`'s `getMultiSourceForecast` SMHI branch
calls `smhiProvider.getObservations(location, window)` — the *full* function, which fetches all
six observation parameters (temperature, precipitation, wind, cloud, wind direction, gust) each
via their own station lookup and value fetch — and then discards everything except
`observations.filter(o => o.isForecast)`. Every one of those six parameters' station-value fetches
is wasted work in this specific call site, duplicating requests the primary series's own
`getObservations` call (for the same location and window) already made.

**Fix**: Add `smhiProvider.getForecastOnly(location, window)`, mirroring the existing shape of
`openMeteoProvider.getForecastOnly`/`metNoProvider.getForecastOnly` — internally just
`fetchForecastTimeSeries` + `buildForecastHourlySeries`, the same two functions
`getObservations` already calls for its own forecast portion, with none of the six observation
parameter fetches. `getMultiSourceForecast`'s SMHI branch calls this instead of the full
`getObservations`, keeping its existing `isSmhiCovered` gate unchanged (SMHI's forecast is a
grid-point fetch with no station concept of its own, but the existing gate keeps this source's
forecast-blending eligibility consistent with its own primary-series coverage rule, which is an
intentional design choice from earlier rounds, not something this fix should alter).

**Rationale**: A minimal, purely-additive fix — no existing caller of `getObservations` changes;
one new function, one call-site swap. Directly satisfies FR-004 (no duplicate identical requests)
for the specific confirmed duplication source, and reduces total request volume as a side effect.

**Alternatives considered**: Adding a general-purpose request-level cache/deduplication layer
(e.g., memoizing `fetchStationValues` by parameter+station+period for the duration of one page
load) — considered as a more general solution, but rejected as broader-scoped than what the
confirmed duplication source requires; the targeted fix above eliminates the actual redundant
fetches without adding a new caching mechanism to maintain.

## §3 — Hiding a genuine 0% chance of rain (US3 / FR-005-006)

**Decision (confirmed via code review)**: The Rain row's chance-of-rain rendering
(`WeatherIconOverview.tsx`) currently renders whenever `point.chanceOfRain !== null &&
point.chanceOfRain !== undefined`, with no check for the value being genuinely `0`.

**Fix**: Extend the condition to also require `point.chanceOfRain > 0`.

**Rationale**: The smallest possible change satisfying FR-005/FR-006 — the existing gap-vs-zero
indistinguishability (both currently render nothing extra) is preserved exactly as documented in
the spec's own Assumptions, since a missing reading was already indistinguishable from a genuine
0% before this change, and remains so after.
