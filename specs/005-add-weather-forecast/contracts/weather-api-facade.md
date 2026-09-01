# Contract: `src/services/weatherApi.ts` façade (internal)

This app has no server of its own; the only "interface" other code depends on is this module's exported functions, which the rest of the app (hooks, components) already treats as the seam between "what data looks like" and "where it came from" (SMHI vs. Open-Meteo). This feature extends the contract's *data*, not its *shape* — existing callers (`useObservationData`) keep working unmodified.

## `getObservations(location, window) -> Promise<ObservationSeries>`

**Change**: `ObservationSeries.observations` may now extend past the current moment, with trailing points carrying `isForecast: true` (see data-model.md). Whether it does depends on window:

| `window` | Forecast included? |
|---|---|
| `"last-24-hours"` | Yes — hourly forecast points appended after the most recent observed hour, up to 24h ahead (spec FR-001). |
| `"last-7-days"` | Yes — the caller (chart layer) aggregates the returned observations into daily buckets via `toDailyAggregates`/`buildHighLowAverageDailyRows`, which now also marks forecast buckets (spec FR-002). |
| `"last-30-days"` | No — out of scope for this feature (spec Assumptions: horizon capped at 24h/7d); returns observed-only data exactly as today. |

**Unchanged**: return type, error/`status` semantics (`"unavailable"` still means the whole series failed to load), and behavior for locations outside forecast coverage — see below.

**New failure mode**: a location with observed-data coverage but no forecast coverage from either provider. Per spec FR-009, this must NOT flip `status` to `"unavailable"` (observed data is still fine) — it must surface as an absence of forecast points (no trailing `isForecast: true` entries), letting the existing per-metric "unavailable" messaging in `ObservationChart.tsx` express it, consistent with how a metric with no observed readings is handled today (`isMetricAvailable`).

## `getNearbyStationSeries(location, window, count) -> Promise<NearbyStationSeries[]>`

**Unchanged** — per spec FR-006, forecast is explicitly out of scope for nearby comparison stations in this iteration. This function's contract, including its return shape, is untouched by this feature.

## Provider modules behind the façade (`smhiProvider.ts`, `openMeteoProvider.ts`)

Not part of the app's public contract (not imported outside `weatherApi.ts`), but both must independently satisfy the `getObservations` contract above when acting as the active provider for a given location, per the existing SMHI-primary/Open-Meteo-fallback selection in `weatherApi.ts` (unchanged selection logic — `isSmhiCovered` continues to gate on observation coverage, not forecast coverage, per research.md §1–3).
