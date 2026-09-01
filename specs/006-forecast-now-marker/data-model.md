# Phase 1 Data Model: Forecast "Now" Marker & Availability Resilience

Builds on 005's `isForecast` flag (`WeatherObservation`/`DailyAggregate`, `src/models/types.ts`). This feature adds one new field (to carry FR-007's fallback signal), two purely derived/computed values, and one new small entity (a resolved place name) — nothing else in the existing data model changes shape.

## Extended entity

### `ObservationSeries` (extended)

| Field | Type | Notes |
|---|---|---|
| *(existing fields: `location`, `window`, `observations`, `status`)* | — | Unchanged. |
| `forecastFromFallbackSource` *(new)* | `boolean` | `true` when this series' forecast points (if any) came from the secondary source via the FR-004 fallback rather than directly from the primary source that supplied the observed data. Absent/`false` for the common case (primary source supplied both). Supersedes this feature's original data-model note that no new field would be needed — FR-007 (added after that note) requires the UI to know *that* a swap happened, which the existing `isForecast` flag alone doesn't capture (research.md §5). |

**Validation / invariants**:
- `forecastFromFallbackSource` is only meaningful when `observations` contains at least one `isForecast: true` point; it carries no meaning (and should not be treated as significant) when there's no forecast at all — that case is the separate Forecast-Unavailable State below.
- Set once, at the point `weatherApi.getObservations` decides whether to invoke the fallback (research.md §2/§5) — never mutated afterward for that series.

## Derived values (not new types — computed, not stored)

### Now-Marker Boundary Value

The X-axis category value (a `timestamp` or `bucketEnd` string, matching whichever field the current chart already uses as its X-axis `dataKey`) at which the "now" marker should be drawn — specifically, the value of the last non-forecast item immediately before the first `isForecast: true` item in an already-loaded array.

- **Input**: `WeatherObservation[]` (hourly charts) or `DailyAggregate[]` (daily charts) — the same arrays 005's row-builders already consume.
- **Output**: `string | null`. `null` means "no forecast present in this array" — the marker must not render (FR-003).
- **Computed, not persisted**: recalculated on every render from whatever data is currently loaded, the same way 005's observed/forecast split itself is (research.md §1) — so it never goes stale independent of the data it's derived from.

### Forecast-Unavailable State

Whether the currently-displayed window/location has no forecast at all despite one being expected — used to decide whether to show the new "forecast unavailable for this location" message (FR-005).

- **Input**: the current `ObservationWindow` and the loaded `ObservationSeries.observations`.
- **Rule**: true when the window is one that carries a forecast at all (`"last-24-hours"` or `"last-7-days"`, not `"last-30-days"`) **and** `observations` contains zero `isForecast: true` points, evaluated *after* the fallback has already been attempted.
- **Computed, not persisted**: like the boundary value above, this is read directly off the already-loaded series.

## New entity

### Resolved Place Name (not persisted)

The result of the reverse-geocoding lookup (research.md §6), used only in `useGeolocation.ts` to replace 005's "Unnamed station" placeholder for a current-position location.

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | A short, human-readable place name built from the geocoding response's address components (city/town/village, falling back to a broader field like county if none of those are present). |
| `isApproximate` | `true` (always, when present) | Always accompanies `name` — this result is never presented as the station's own confirmed name (FR-009). Not stored as a literal field on `Location`; expressed instead through how `useGeolocation.ts`/the UI present the value (e.g., a distinct prefix or label style), an implementation detail for `/speckit-tasks`. |

**Lifecycle**: Resolved once per current-position request, only when 005's nearest-station-name lookup already returned nothing usable; not cached or persisted across sessions by this feature (research.md §6 notes client-side caching as a reasonable future addition, not required here). On failure, resolves to nothing and `Location.displayName` keeps 005's existing "Unnamed station" fallback (FR-010) — this entity simply doesn't materialize in that case, rather than existing in some "empty" state.

## Relationships

- `ObservationSeries.forecastFromFallbackSource` — new scalar field on the existing entity, no new relationship.
- Resolved Place Name has no persisted relationship to any other entity — it's an ephemeral input to `Location.displayName` at the moment a current-position location is resolved (`useGeolocation.ts`), same lifecycle point where 005 already sets that field.
- No changes to `ObservationSeries` → `WeatherObservation` → `DailyAggregate`, or to `StationInfo`.
