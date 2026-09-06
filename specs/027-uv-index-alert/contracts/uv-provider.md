# Contract: `smhiProvider.getUvIndex` / `weatherApi.getUvRisk`

## `smhiProvider.getUvIndex(location, window): Promise<Set<number>>`

Fetches STRÅNG parameter 116 for `location`, covering the same trailing period `window` implies
(matching `WINDOW_HOURS`), converts each hourly irradiance value to UV Index
(`value / 25`), and returns the set of hour-bucket keys (`Math.floor(epochMs / 3600_000)`) whose
UV Index is `>= 6`.

**Preconditions**: none — caller decides whether to call this at all (coverage gating is the
caller's responsibility, matching every other `smhiProvider` function's own convention of doing
one job and letting `weatherApi.ts` orchestrate).

**Postconditions**:
- Never throws — a fetch/parse failure resolves to an empty `Set`, matching every other
provider's "degrade to empty, never fail the caller" convention (e.g.
`fetchForecastTimeSeries`'s own `catch`).
- Only contains hour keys for genuinely analysed (past/current) data — STRÅNG publishes no
future values, so no future hour key is ever present.

## `weatherApi.getUvRisk(location, window): Promise<Set<number>>`

**Preconditions**: none.

**Postconditions**:
- Returns an empty `Set` immediately (no fetch attempted) when `location` is outside
`smhiProvider.isCovered`'s coverage radius — mirrors the existing `isSmhiCovered` gate already
used by `getObservations`/`getNearbyStationSeries`.
- Otherwise delegates to `smhiProvider.getUvIndex`, itself already non-throwing.

## `TimelinePeriod.uvRisk`

**Contract**: `true` if and only if at least one hour in `[periodStart, periodEnd)` is a member
of the `Set<number>` returned by `getUvRisk` for the currently loaded location/window. `false`
in every other case (no data, future period, out of coverage, fetch failure) — never
`null`/`undefined`.

## `ConditionRow` rendering

**Contract**: When `period.uvRisk === true`, the existing condition-icon cell renders one
additional small badge element (an accessible label mentioning "High UV", appended to the cell's
existing `aria-label`) alongside the existing condition icon/label — no other element, row, or
layout change. When `period.uvRisk === false`, the cell's rendered output is byte-identical to
today's (pre-feature) output.
