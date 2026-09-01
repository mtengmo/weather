# Phase 0 Research: Add Weather Forecast

## 1. SMHI forecast API — which endpoint, and a live breaking change to account for

**Decision**: Use SMHI's current point-forecast API, category `snow1g`, version `1` — i.e.
`https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/{lon}/lat/{lat}/data.json`.

**Rationale**: This app already treats SMHI as its primary data source for observations (`src/services/smhiProvider.ts`), and SMHI publishes a companion point-forecast API on the same open-data platform. However, the long-standing forecast endpoint (`category/pmp3g/version/2`, commonly referenced in older integrations and tutorials) was **deprecated by SMHI on 2026-03-31** and now returns HTTP 404 — corroborated independently by the Home Assistant and MagicMirror projects' own integration-breakage issues, both citing the same cutover date. SMHI's replacement is `snow1g` version `1`, on the same host, with a **flat, human-readable parameter response** (e.g. `air_temperature`, `wind_speed`) replacing the old nested `parameters[]` array of short codes (e.g. `t`, `ws`), and `referenceTime` replacing the removed `approvedtime.json` endpoint.

**Alternatives considered**:
- *Keep targeting `pmp3g/version/2`*: Rejected — confirmed dead (404) as of this feature's research date; would ship broken on day one.
- *Skip SMHI forecast entirely, forecast via Open-Meteo only*: Rejected — breaks the spec's "same stations" requirement (FR-001/002) and the existing SMHI-primary/Open-Meteo-fallback pattern users already get for observations; would silently change data source identity between the observed and forecast halves of the same chart.

**Risk flagged for implementation**: SMHI's open-data forecast API has changed at least once in this app's lifetime and may again. Implementation tasks must verify the live response shape against a real request before wiring parameter extraction (do not hardcode field names purely from third-party migration write-ups) and should isolate the raw-response parsing behind the existing `smhiProvider.ts` module boundary so a future SMHI change stays a one-file fix, matching how `nearestActiveStations`/`fetchStationValues` already isolate the observation API's shape.

## 2. SMHI forecast parameter mapping and shape quirks

**Decision**: Map SMHI forecast parameters to the app's existing four metrics as: `air_temperature` → temperature, `wind_speed` → windSpeed, a precipitation-amount parameter → precipitation, and a total-cloud-cover parameter → cloudCoverPercent — confirmed at implementation time against a live response (see risk above), reusing the existing `WeatherObservation` shape rather than inventing forecast-specific fields.

**Rationale**: Keeps forecast points structurally identical to observed points (same four metrics, same units after conversion), which is what makes "same series" (FR-003) and reusing the existing hourly/daily row builders (FR-002, Assumptions) possible without a parallel data model.

**Alternatives considered**:
- *Introduce a separate `ForecastObservation` type with provider-native field names*: Rejected — would force every consumer (chart, daily aggregation, details table) to branch on observed-vs-forecast shape instead of just an `isForecast` flag, contradicting the spec's "same serie data" requirement.

**Noted quirk to carry into design**: SMHI's precipitation figures are not simple per-hour instantaneous values — near-term forecast hours report a roughly hourly precipitation amount, but the reporting interval widens further into the forecast (documented as growing to 3h, 6h, then 12h buckets later in the ~10-day horizon). Since this feature only needs 24h (hourly) and 7d (daily-aggregated) horizons, both fall inside or are naturally bucketed to a granularity coarser than where this quirk would visibly distort results — the existing `toDailyAggregates` daily-bucketing already re-aggregates to 24h buckets regardless of source interval, so this is absorbed rather than requiring special handling, but hourly-view rendering just past 24h (if ever extended) would need explicit interval-aware handling later.

**Forecast horizon**: ~10 days from SMHI, comfortably covering this feature's 7-day requirement (FR-002).

### Addendum (T001 — verified against a live response, 2026-09-01)

A live `GET .../category/snow1g/version/1/geotype/point/lon/18.0686/lat/59.3293/data.json` call confirmed:

- **No station id needed** — this is a lat/lon grid-point API, unlike the observation endpoints. `smhiProvider.ts`'s forecast fetch does not need `nearestActiveStations`/a station key at all; it calls the endpoint directly with the location's coordinates.
- **Top-level shape**: `{ referenceTime, geometry: { coordinates: [lon, lat] }, timeSeries: [{ time, intervalParametersStartTime, data: {...} }, ...] }`. `time` is the interval's end (valid) timestamp — use this as the point's timestamp, matching how observation timestamps are already hour-aligned.
- **Confirmed field mapping**: `air_temperature` (°C, no conversion) → temperature; `wind_speed` (m/s, no conversion) → windSpeed; `precipitation_amount_mean` (mm, per-interval total) → precipitation.
- **Cloud cover is on a 0–8 octas scale, not 0–100**: `cloud_area_fraction` ranges 0–8 in the live response (confirmed min 0 / max 8 across a full response) — unlike the observation-side SMHI parameter 16, which is already 0–100. Forecast cloud cover MUST be converted: `cloudCoverPercent = cloud_area_fraction * 12.5`.
- **Interval width confirmed to grow over the horizon**: hourly (1h) from the first entry through roughly hour 56 (comfortably past this feature's 24h need), then 2h, 6h (through ~day 7), then 12h (day 8–10). Since `precipitation_amount_mean` is each interval's own total and intervals are contiguous/non-overlapping, summing whatever entries fall into a given calendar day for `toDailyAggregates` still yields a correct daily total regardless of interval width — no special-casing needed for the 7-day view.
- **Response size**: ~80 `timeSeries` entries for the full ~10-day horizon.

This confirms and slightly corrects §2 above (cloud cover conversion was not yet known) and removes the assumption that a station id is required.

## 3. Open-Meteo forecast — no new API needed

**Decision**: Extend the existing Open-Meteo call (`src/services/openMeteoProvider.ts`) by raising `forecast_days` from its current value of `1` to `8` (today + 7 full days) and removing the `elapsed = all.filter((o) => Date.parse(o.timestamp) <= now)` trim that currently discards everything at/after "now", instead tagging points relative to `now` as observed or forecast.

**Rationale**: Open-Meteo's `/v1/forecast` endpoint already natively returns both recent history (`past_days`) and upcoming forecast (`forecast_days`) in one response — the app is already calling this exact endpoint for historical data and simply discarding the forward-looking rows it doesn't yet use. No new endpoint, host, or client code path is needed for the fallback provider; this is the lowest-risk part of the feature.

**Alternatives considered**:
- *Add a second Open-Meteo call specifically for forecast*: Rejected — unnecessary; the single call already returns both halves.

## 4. Rendering a single series with a solid-observed / dotted-forecast split in Recharts

**Decision**: Per metric, keep one logical series but render it as **two `<Line>` (or `<Bar>`, for precipitation) elements sharing the same color and `name`**: one fed a `...` data key that is `null` for all points at/after the observed/forecast boundary (rendered solid, exactly as today), and one fed a sibling `...Forecast` data key that is `null` before the boundary and populated from the boundary point onward (rendered with `strokeDasharray`), with the boundary point duplicated into both keys so the two segments visually connect without a gap. `connectNulls={false}` (already used throughout) keeps each half from bridging its own nulls.

**Rationale**: This is a standard, low-risk Recharts pattern (two same-color series over a shared X domain, one dashed) that requires no custom shape/renderer code and fits the existing row-builder architecture in `chartData.ts`, which already emits one key per logical series (`seriesKey(i)`) per row. It reuses the app's existing dashed-line mechanism (`strokeDasharray`, already used for nearby-station identity and for high/low lines) rather than introducing a new visual primitive — satisfying the spec's FR-004 default (dotted forecast segment) and Assumptions note that this differs semantically from the existing per-station dash convention while reusing the same drawing primitive.

**Alternatives considered**:
- *Custom `<Line>` `shape`/segment renderer that switches stroke style mid-line based on point index*: Rejected — Recharts does not support per-segment `strokeDasharray` within a single `<Line>` without a fully custom path renderer; meaningfully more code and risk for the same visual outcome.
- *Background shading (`<ReferenceArea>`) marking the forecast region instead of/in addition to a dotted line*: Considered as a secondary/complementary treatment — spec's FR-004 already resolved to dotted-line-only as the default (see spec Assumptions); a `ReferenceArea` overlay remains a straightforward additive option if user feedback later asks for it, without changing the two-series data shape decided here.
- *Two entirely separate `<ComposedChart>`s (historical, forecast) side by side*: Rejected outright by the spec (FR-003: "not a separate series").

## 5. Where the observed/forecast boundary lives, given a moving "now"

**Decision**: Compute the boundary at render/row-build time (not at fetch time) as `Date.now()` compared per-point, inside the same `chartData.ts` row builders that already assemble rows — not baked into the fetched data itself.

**Rationale**: The spec's edge cases explicitly call out a chart left open across the boundary as time passes. Provider responses are fetched once per `useObservationData` effect run (on mount/location/window change, not on a timer); baking a fixed boundary into fetched data would make an already-open chart increasingly wrong as real time moves past it. Recomputing at render time is cheap (a single `Date.now()` comparison per row) and keeps the fix scoped to the presentation layer without adding a new polling/refetch mechanism — consistent with the plan's Constraints (reuse existing pipeline, no new refresh mechanism per spec Assumptions).

**Alternatives considered**:
- *Tag each point as observed/forecast once, at fetch time, and trust that flag*: Rejected — would go stale exactly in the scenario the spec calls out as an edge case, and provides no benefit over a cheap runtime comparison.

## 6. Current-position station naming

**Decision**: When `useGeolocation` resolves a position, source `Location.displayName` from the same "nearest active station" lookup the app already performs for observations (`smhiProvider.nearestActiveStations`/`getNearestStations`), reusing the existing `"Unnamed station"` fallback text (`004-chart-styling-fixes`) when the resolved station has no usable name — rather than inventing a new naming/geocoding path.

**Rationale**: The app already resolves and displays real station names for the up-to-4 nearby comparison stations; extending that same lookup to also name the primary current-position series reuses an existing, tested code path and keeps "the name of the station actually powering this data" as the single naming source of truth across the whole app, per spec FR-008 and Assumptions.

**Alternatives considered**:
- *Reverse-geocode the coordinates to a place name (e.g. "Stockholm") via a geocoding API*: Rejected — introduces a new third-party dependency/API for a cosmetic label, and would name the *place* rather than the *station actually supplying the data*, which is less precise for a weather app where the station identity matters (users comparing station data already see station names, not place names, per FR-008 rationale in spec.md).
