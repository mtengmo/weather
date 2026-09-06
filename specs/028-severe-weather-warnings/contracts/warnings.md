# Contract: Warnings provider, filter, and banner

## `smhiProvider.getActiveWarnings(): Promise<RawSmhiWarning[]>`

Fetches the full national warnings list. Never throws — a fetch/parse failure resolves to `[]`,
matching every other provider's degrade-to-empty convention.

**Preconditions**: none — this is a nationwide feed, not location-scoped, so no coverage check
happens here (that's `weatherApi.getWarningsForLocation`'s job, so the raw fetch stays reusable
and simply-testable on its own).

## `weatherApi.getWarningsForLocation(location): Promise<WeatherWarning[]>`

**Preconditions**: none.

**Postconditions**:
- Returns `[]` immediately (no fetch attempted) when `location` is outside
`smhiProvider.isCovered`'s coverage radius.
- Otherwise: fetches via `getActiveWarnings`, keeps only entries whose `area` geometry contains
`location` (`geo.ts`'s `pointInPolygon`), keeps only entries currently within their validity
window, maps each to the reduced `WeatherWarning` shape, and sorts most-to-least severe.
- Never throws.

## `geo.pointInPolygon(point, geometry): boolean`

**Contract**: `point` is `{ latitude, longitude }`. `geometry` is a GeoJSON `Polygon` or
`MultiPolygon` (coordinates in `[lon, lat]` order, per the GeoJSON spec). Returns `true` when the
point is inside (or exactly on the boundary of) any ring/polygon in `geometry`. Pure function, no
I/O, no exceptions for well-formed GeoJSON input.

## `<WarningBanner warnings={WeatherWarning[]} />`

**Contract**:
- `warnings.length === 0` → renders nothing (no DOM node, matching `TodaySummaryCard`'s existing
`if (today === null) return null` convention for "nothing to show").
- `warnings.length >= 1`, collapsed (default) state → renders the first (most severe) warning's
severity label and title, with an affordance to expand.
- Expanded state → renders every warning in `warnings`, in order, each showing its severity,
title, area name, full description, and validity period.
- Every rendered warning is reachable by both mouse and keyboard (a `<button>`-driven expand,
not a hover-only reveal), consistent with this codebase's existing accessibility conventions
(e.g. `DisplayMenu`'s own expand/collapse pattern).
