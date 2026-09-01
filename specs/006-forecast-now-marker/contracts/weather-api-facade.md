# Contract: `src/services/weatherApi.ts` façade (internal) — extended

Extends 005's contract of the same name. Existing callers (`useObservationData`) keep working unmodified — this is a behavior change inside `getObservations`, not a shape change.

## `getObservations(location, window) -> Promise<ObservationSeries>`

**New behavior**: when the location is SMHI-covered and SMHI's fetch succeeds, but the window expects a forecast (`"last-24-hours"` | `"last-7-days"`) and the result's `observations` contain zero `isForecast: true` points, the façade now attempts Open-Meteo's forecast-only fetch (see `openMeteoProvider` contract below) and appends whatever it returns onto the SMHI result's `observations` before returning — the SMHI-sourced observed points, `location`, and `status` are otherwise untouched (spec Clarifications: "keep observed, swap forecast only"). When this path is taken and yields at least one forecast point, the returned `ObservationSeries` also carries `forecastFromFallbackSource: true` (data-model.md) so the UI can render FR-007's source-mismatch indicator; it's absent/`false` whenever SMHI's own forecast was used directly, and equally absent when the fallback ran but still found nothing (that case is expressed by the Forecast-Unavailable state below, not this flag).

**Still unchanged from 005**: the existing whole-series fallback (SMHI observed fetch itself throwing → use Open-Meteo entirely) is untouched and takes priority — this new forecast-only fallback only applies when SMHI's *observed* fetch succeeded.

**New failure mode, now resolved**: 005's contract left "a location with observed-data coverage but no forecast coverage from either provider" as a case the caller must express via metric-unavailable messaging. This feature resolves it more specifically: after the fallback above is attempted and still yields zero `isForecast` points (for a window that expects one), the caller (`ObservationChart.tsx`) shows the new distinct "forecast unavailable for this location" message (FR-005) rather than relying on the existing per-metric messaging, which was never a precise fit for "no forecast at all."

**Unchanged**: `getNearbyStationSeries`'s contract — nearby comparison stations remain out of forecast scope entirely (spec Assumptions), so this feature does not touch it.

## `openMeteoProvider` — new export

A forecast-only counterpart to the existing `getObservations`, extracting just the pattern already built in 005 (`forecast_days` sizing, `isForecast` tagging) without also re-returning the observed portion the fallback path in `weatherApi.ts` doesn't need. Not part of the app's public contract in the sense of being called from components — like the rest of the provider modules, it's only ever invoked through `weatherApi.ts`.

**Behavior**: same network call, coordinate handling, and window-based sizing as `getObservations`; returns `WeatherObservation[]` (the forecast-tagged subset only) or `[]` on any failure (network error, non-ok response, malformed body) — mirroring the existing "degrade to empty rather than throw" pattern used throughout the forecast code added in 005, so a failure here just means the fallback found nothing either (leading to the FR-005 message), not an unhandled error.
