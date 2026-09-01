# Phase 0 Research: Forecast "Now" Marker & Availability Resilience

## 1. Drawing the "now" marker on a category-axis chart

**Decision**: Use Recharts' `<ReferenceLine x={boundaryValue} />`, where `boundaryValue` is the exact string value already used as the chart's X-axis `dataKey` for the last observed row (i.e., the same row `chartData.ts`'s existing `bridgeForecastBoundary` (005) already duplicates into both the observed and forecast data keys so the two segments visually connect).

**Rationale**: Verified directly against the installed `recharts` package's type definitions (`node_modules/recharts/types/cartesian/ReferenceLine.d.ts`), which document exactly this usage (`<ReferenceLine x="Monday" />` for a category/band axis) — `ReferenceLine` accepts a data-domain value, not a pixel offset, and Recharts resolves it against the same category scale the `<XAxis dataKey="timestamp">`/`dataKey="bucketEnd"` already uses. Since every one of this app's charts uses a category (string) X-axis keyed off `timestamp` (hourly) or `bucketEnd` (daily) — never a continuous numeric time scale — an exact-string match against an existing row's value is the only reliable way to position it; interpolating a "between two categories" position is not what `ReferenceLine` does for category axes.

**Where the value comes from**: The boundary row is already computed today by `bridgeForecastBoundary` (005) — the row immediately before the first `isForecast: true` point — but that function only mutates rows in place and returns nothing. This feature adds a small, separate, reusable lookup (not a change to `bridgeForecastBoundary`'s existing contract) that scans the same underlying array (`WeatherObservation[]` for hourly charts, `DailyAggregate[]` for daily charts) for the first forecast-flagged item and returns the *previous* item's `timestamp`/`bucketEnd`, or `null` if there's no forecast at all (index 0 is forecast, or no forecast present) — `null` means "don't render the marker," directly satisfying FR-003.

**Alternatives considered**:
- *Switch the X-axis to a continuous `type="number"` time scale so the marker can sit at an exact timestamp between two points*: Rejected — a much larger change touching every chart's axis configuration, tick formatting, and bar/line positioning (bars in particular rely on category-axis banding for their width); far more risk for a purely cosmetic improvement.
- *Render the marker as a styled `<Line>` data series instead of `<ReferenceLine>`*: Rejected — `ReferenceLine` is Recharts' purpose-built primitive for exactly this ("mark a specific X or Y value"), needs no synthetic per-row data, and doesn't participate in the legend/tooltip the way a `<Line>` series would (which would be a confusing extra legend entry for something that isn't really a data series).

## 2. Detecting "the primary source's forecast is missing" and falling back

**Decision**: After `weatherApi.getObservations` receives a successful result from SMHI (the primary source when a location is SMHI-covered), check whether the window expects a forecast at all (`window !== "last-30-days"`, mirroring both providers' existing `FORECAST_HOURS`/window-gating from 005) and whether the returned `observations` contain zero `isForecast: true` points. If both are true, call a new forecast-only fetch against Open-Meteo (the secondary source) and append its forecast-tagged points onto the SMHI result's `observations`, leaving everything else (the SMHI-sourced observed points, `location.displayName`, `status`) untouched.

**Rationale**: SMHI's forecast fetch (added in 005, `smhiProvider.ts`) is a single grid-point request that returns all four tracked metrics together in one response — so "the forecast fetch failed or returned nothing" is naturally an all-or-nothing event per request already (network error, non-2xx response, or an empty `timeSeries`), which lines up exactly with the Clarifications' "all-or-nothing per location" answer without needing to track per-metric forecast provenance. This keeps the fallback trigger to one clear, cheap check (`observations.some(o => o.isForecast)`) rather than inventing a new "forecast fetch status" field.

**What "keep observed, swap forecast only" (Clarifications) means concretely**: The SMHI-sourced `ObservationSeries` returned by `smhiProvider.getObservations` is reused as-is — only its `observations` array gets the secondary source's forecast points appended (replacing the empty/absent SMHI forecast points, of which there are none to remove). The location's `displayName` (and thus the station identity a user sees, per 005) is never touched by this fallback, satisfying the Clarifications' "station identity preserved" answer directly.

**Alternatives considered**:
- *Track a `forecastStatus` field per provider call and thread it through*: Rejected for the availability question itself — the presence/absence of `isForecast: true` points in the result already fully answers "did this location get a forecast." (Note: the *newer* FR-007 requirement, added after this decision, does need one small piece of provenance — see §5 below — but that's a narrower "was the fallback used at all" flag, not a general per-provider status field threaded everywhere.)
- *Retry SMHI's forecast fetch a second time before falling back*: Considered but rejected as unnecessary complexity for this feature — a single retry-with-backoff strategy is a general resilience concern better handled uniformly (if ever) rather than special-cased here; falling straight to the secondary source is simpler and still satisfies the spec (SC-002).

## 3. Exposing a forecast-only fetch from the secondary provider

**Decision**: Refactor `openMeteoProvider.ts`'s existing `getObservations` (005) so its forecast-extraction logic (the `upcoming`/`forecastObservations` slice at the end of the function) is reusable as a separate exported function, e.g. one that returns just the forecast-tagged `WeatherObservation[]` for a location+window, without needing to also re-fetch/re-return the observed portion the fallback path doesn't need.

**Rationale**: 005 already built and tested the exact parsing (`OpenMeteoHourlyResponse` shape, `forecast_days` sizing per window, the `isForecast` tagging) needed here — this is a refactor for reuse, not new integration work. Keeping it a single HTTP call (rather than two) also matches how the existing `getObservations` already fetches both halves in one request.

**Alternatives considered**:
- *Duplicate the fetch+parse logic in `weatherApi.ts`*: Rejected — violates the existing module boundary where provider-response parsing lives inside each provider module, not in the orchestration layer (`weatherApi.ts` today only ever calls provider functions, never parses a raw response itself).

## 4. The "forecast unavailable for this location" message

**Decision**: Reuse the existing `error-banner`/`role="alert"` treatment already used for "Weather data is unavailable for this location" (in `ObservationChart.tsx`) and for per-metric unavailability, with distinct wording, shown when the current window expects a forecast (`window !== "last-30-days"`) but the loaded series has zero `isForecast` points anywhere in `observations` — i.e., after the fallback in research §2 was already attempted and still came back empty.

**Rationale**: Matches the Assumptions in spec.md ("follows the same visual/alert treatment... recognizable as the same category of state") and reuses an existing, tested UI pattern (`ObservationChart.tsx` already conditionally renders banner text based on `series`/`metric` state) rather than introducing a new visual language for this one case.

**Alternatives considered**:
- *Show it only in the details table, not the chart*: Rejected — the chart is where a user would first look for the forecast continuation (per 005 and this feature's own P1 story), so that's where its absence needs to be explained.

## 5. Flagging that a forecast came from the fallback source (FR-007)

**Decision**: `weatherApi.getObservations` marks the `ObservationSeries` it returns with a single boolean-ish signal — whether the forecast portion came from the fallback path in §2 — and `ObservationChart.tsx` renders a small, non-hover-dependent cue (e.g., a suffix on the forecast series' legend/tooltip name, consistent with how 005 already suffixes forecast series names with `" (forecast)"`) when that signal is set. The signal is not persisted or fetched — it's set exactly once, at the point in `weatherApi.ts` where the fallback in §2 either did or didn't run.

**Rationale**: This is new since the spec was extended after the original research pass — FR-004/FR-004a (§2) established *that* a forecast-only fallback happens, but didn't need to expose *which* source supplied it anywhere the UI could see. FR-007 now does. The smallest change that satisfies it is one small field carried on the already-returned `ObservationSeries` (or threaded alongside it) — not a general "which provider supplied every point" model, since per the Clarifications the fallback is all-or-nothing per location, so a single location-level flag is sufficient and exactly matches the granularity FR-007 asks for ("communicate *that* it came from elsewhere," not per-point provenance — spec Assumptions).

**Where it surfaces in the UI**: Reusing 005's existing forecast-series naming pattern (`${location.displayName} (forecast)`) is the lowest-risk place to add a further cue (e.g., `${location.displayName} (forecast, alt. source)`) since it already renders in the chart legend without requiring a hover — satisfying FR-007's "discoverable without hovering" bar the same way 005's own forecast labeling already does for the observed/forecast distinction itself.

**Alternatives considered**:
- *A separate banner/note element near the chart*: Considered — more prominent, but risks visual clutter stacking on top of the existing unavailable-data banners (§4) for what's a comparatively minor "just so you know" cue; the legend-label approach is consistent with how 005 already handles a similar-weight distinction (observed vs. forecast) without a separate banner.
- *Show it only in a tooltip*: Rejected outright by FR-007 ("discoverable without hovering").

## 6. Reverse geocoding an unnamed station's coordinates (FR-008–FR-010)

**Decision**: Use OpenStreetMap's public Nominatim reverse-geocoding endpoint, `GET https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=jsonv2`, with a descriptive `User-Agent` header identifying the app (required by Nominatim's usage policy for its public instance). On success, build a short place name from the response's `address` object (preferring the most specific populated-place field available — city/town/village — with a broader fallback such as county if none of those are present); on any failure (network error, non-ok response, no usable address field), return `null` so the caller keeps the existing "Unnamed station" text (FR-010).

**Rationale**: Verified live during planning — a real request for a Stockholm coordinate returned a structured `address` object (`city`, `suburb`, `municipality`, `county`, etc.) suitable for building a concise label, confirming the approach is viable without guesswork. Nominatim is free, requires no API key or account, and needs no new client library (a plain `fetch`, matching how this app already talks to SMHI and Open-Meteo) — consistent with the project's existing "call open, free HTTP APIs directly" pattern rather than introducing a paid/keyed geocoding service.

**Usage-policy compliance**: The public Nominatim instance requires a maximum of ~1 request/second and a descriptive `User-Agent` or `Referer` for attribution/contact purposes. This feature triggers at most one reverse-geocoding call per unnamed-station resolution (only when 005's station-name lookup already returned nothing usable) — not on a timer, not per chart render — so it's inherently far under any rate concern without needing explicit throttling logic.

**"Approximate, not confirmed" presentation (FR-009)**: The resolved name is a *place* name (e.g., a town or suburb the coordinate falls within), not the weather station's own name — the station itself may still genuinely have no published name. The UI must present it in a way that doesn't imply otherwise (exact wording/styling is a `/speckit-tasks`-level decision — e.g., a prefix like "near " or a distinct label style already available in the app's existing station-naming display).

**Alternatives considered**:
- *A different geocoding provider (Google/Mapbox/etc.)*: Rejected — all require an API key and/or billing account, a materially bigger integration and operational surface (secrets management, cost) for what's a "nice to have" label on an edge case; Nominatim needs none of that.
- *Only resolve down to country/region level to minimize specificity concerns*: Rejected — the spec (Edge Cases) explicitly accepts whatever Nominatim returns as-is rather than trying to judge or constrain its specificity; picking the most specific available populated-place field is simplest and most useful by default.
- *Cache resolved names client-side to avoid re-querying on every app load for the same coordinate*: Worth doing as a straightforward implementation detail (e.g., alongside the existing browser-storage-backed preference hooks) but not load-bearing for this plan — even without caching, the call only happens once per session per unnamed station, well within Nominatim's usage policy.
