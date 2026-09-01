# Quickstart: Validate Forecast "Now" Marker & Availability Resilience

Manual + automated validation, mapped to spec.md's user stories and success criteria. Builds on 005's quickstart — run that feature's scenarios first if this is a fresh checkout, since this feature assumes forecast rendering already works.

## Prerequisites

- `npm install`
- Network access to `opendata-download-metfcst.smhi.se`, `opendata-download-metobs.smhi.se`, `api.open-meteo.com` (same as 005), and `nominatim.openstreetmap.org` (new — no API key required)

## Run it

```sh
npm run dev
```

## Validation scenarios

### 1. "Now" marker on the 24h and 7-day charts (User Story 1 / SC-001)

1. Open a location with forecast data (a Swedish location works best — see 005's quickstart).
2. On the **Last 24 hours** view, temperature tab: confirm a distinct vertical line appears at the boundary between the solid (observed) and dashed (forecast) segments, without needing to hover.
3. Switch to **Last 7 days**: confirm the same marker appears at the day boundary.
4. Leave the tab open past the top of an hour (or day, for the 7-day view) and refresh: confirm the marker moves forward with it, rather than staying fixed at the original load time (Acceptance Scenario 3).
5. Switch to **Last 30 days**: confirm no "now" marker appears (Acceptance Scenario 4) — this window never carries forecast data.

### 2. Forecast-only fallback (User Story 2 / SC-002)

Hard to force deterministically without intercepting network calls, but validate the observable contract:

1. For a location where SMHI observed data loads normally, confirm the forecast segment and "now" marker still appear as in Scenario 1 — this is the common case and must be unaffected.
2. If a location can be found (or simulated via dev tools blocking just the SMHI forecast endpoint, `opendata-download-metfcst.smhi.se`) where SMHI's observed data loads but its forecast does not: confirm the chart still shows a forecast segment (now sourced from Open-Meteo) rather than none at all, and that the station name / historical values shown are unchanged from what SMHI already provided (Clarifications: observed data and station identity are preserved).

### 3. "Forecast unavailable" message (Edge case / FR-005 / SC-003)

1. Simulate both the SMHI and Open-Meteo forecast endpoints failing for a covered location (e.g., block both via dev tools network throttling/blocking) while their observed-data endpoints still succeed.
2. Confirm the 24h and 7-day views show a clear "forecast unavailable for this location" message, visually consistent with the app's existing unavailable-data banners, and distinct from the existing per-metric "not available" text.
3. Confirm the 30-day view is unaffected (it never shows this message, since it never expects a forecast).

### 4. Naming independence (Acceptance Scenario 3 of User Story 2)

1. Find or simulate a current-position location that resolves to "Unnamed station" (005's fallback).
2. Confirm forecast availability for that location is unaffected by the unnamed station — if a forecast is obtainable from either source, it still shows normally.

### 5. Source-mismatch indicator (User Story 1 Acceptance Scenario 4 / FR-007 / SC-004)

1. Reproduce the fallback scenario from Scenario 2 above (SMHI observed data loads, SMHI forecast blocked/unavailable, Open-Meteo forecast used instead).
2. Confirm the chart's legend (or other non-hover-dependent element) visibly indicates the forecast came from a different source than the observed data — check across all four metric tabs and both the 24h and 7-day views.
3. Confirm this indicator does **not** appear for the common case (Scenario 1, no fallback triggered).
4. Confirm it also does not appear when the "forecast unavailable" message (Scenario 3) is showing instead — there's no forecast to attribute a source to.

### 6. Unnamed-station place-name resolution (User Story 3 / FR-008–FR-010 / SC-005)

1. Find or simulate a current-position location whose nearest station has a blank name in SMHI's data (005's "Unnamed station" case).
2. Confirm the app shows a resolved place name instead of the literal "Unnamed station," presented in a way that reads as approximate (e.g., a "near " prefix) rather than as the station's confirmed name.
3. Block `nominatim.openstreetmap.org` via dev tools and repeat: confirm the app falls back to "Unnamed station" cleanly, with no blank value, broken layout, or delay to the rest of the page loading.
4. Confirm a favorite or searched location's naming is unaffected by this feature (Acceptance Scenario 4) — this only applies to the current-position case.

### 7. Automated checks

```sh
npm run lint
npm test
npm run build
```

Extend the existing test suite (`tests/unit/chartData.test.ts`, `tests/unit/weatherApi.test.ts`, `tests/unit/openMeteoProvider.test.ts`, `tests/unit/useGeolocation.test.ts`, `tests/integration/chartAndDetails.test.tsx`) plus a new `tests/unit/geocoding.test.ts`, rather than introducing a new pattern — see 005's equivalent tests for the established conventions (`vi.stubGlobal("fetch", ...)`, `vi.mock(...)` for provider-façade mocking, the `chartAndDetails` RTL harness).
