# Phase 1 Data Model: Weather Observation History for Current Position and Favorite Places

All entities are client-side (in-memory + `localStorage`); there is no server-side database.

## Location

Represents a geographic point for which weather can be requested. Not persisted on its own — either derived live from the device (current position) or embedded inside a `FavoritePlace`.

| Field | Type | Notes |
|---|---|---|
| `latitude` | number | Decimal degrees, required |
| `longitude` | number | Decimal degrees, required |
| `displayName` | string | Human-readable label (e.g., "Stockholm, Sweden" or "Current Location") |
| `source` | `"current-position" \| "favorite"` | Distinguishes an ephemeral device position from a saved place |

**Validation rules**:
- `latitude` ∈ [-90, 90], `longitude` ∈ [-180, 180].
- `displayName` required, non-empty.

## FavoritePlace

A user-saved `Location`, persisted in `localStorage`. Extends Location with an identity and ordering.

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Stable identity for selection/removal, generated on add |
| `latitude` | number | From geocoding resolution |
| `longitude` | number | From geocoding resolution |
| `displayName` | string | Resolved/canonical place name shown to the user |
| `addedAt` | ISO 8601 timestamp | For stable list ordering (oldest first) |

**Validation rules**:
- Max 10 `FavoritePlace` records per user/browser (FR-009). Attempting to add an 11th is rejected with a user-facing message.
- No two `FavoritePlace` records may share the same rounded `(latitude, longitude)` pair (rounded to ~4 decimal places, ≈11m precision) — enforces FR-012 duplicate prevention.
- `displayName` required, non-empty.

**Persistence**: Serialized as a JSON array under a single `localStorage` key (e.g., `weather-app:favorites:v1`). The array is the full list; add/remove operations read-modify-write the whole array.

## WeatherObservation

A single historical data point for a `Location` at a specific hour — used directly for the 24-hour window (hourly resolution, FR-014) and as the raw input the 7-day window aggregates from (see `DailyAggregate` below). Not persisted — fetched on demand per view, always in metric units from the provider.

| Field | Type | Notes |
|---|---|---|
| `timestamp` | ISO 8601 timestamp | The observation hour |
| `temperature` | number \| null | Degrees Celsius (metric, as fetched); `null` = data gap |
| `precipitation` | number \| null | Millimeters (metric, as fetched); `null` = data gap |

**Validation rules**:
- `null` values MUST be preserved through to rendering as an explicit gap indicator (FR-010) — never coerced to `0`.
- Unit conversion to imperial (°F, inches) for display happens only at the presentation layer (`services/units.ts`), never mutating the stored metric values — see `UnitSystem` below.

## DailyAggregate

One day's aggregated point for the 7-day graph (FR-014, FR-018), computed client-side from an `ObservationSeries`'s hourly `WeatherObservation[]` by `services/dailyAggregation.ts` — never fetched directly from a provider. Bucketing is by **rolling 24-hour window ending at the current hour**, not user-local calendar days (research.md §12), consistent with the existing "not calendar-aligned" assumption for observation windows.

| Field | Type | Notes |
|---|---|---|
| `bucketEnd` | ISO 8601 timestamp | The end of this rolling 24h bucket (the more recent boundary) |
| `high` | number \| null | Max hourly temperature in the bucket; `null` if the bucket has zero non-null hourly readings |
| `low` | number \| null | Min hourly temperature in the bucket; `null` under the same condition as `high` |
| `average` | number \| null | Mean hourly temperature in the bucket; `null` under the same condition |
| `totalPrecipitation` | number \| null | Sum of hourly precipitation in the bucket; `null` under the same condition |

**Validation rules**:
- `high`, `low`, `average`, and `totalPrecipitation` are computed only from the bucket's non-`null` hourly values; a bucket with zero usable readings MUST produce `null` for all four fields (a whole-day gap), never `0` or a value derived from adjacent buckets (FR-022, spec Edge Cases).
- Exactly 7 `DailyAggregate` points are produced per 7-day `ObservationSeries`, oldest → newest, regardless of how many buckets are gaps.

## NearbyStationSeries (view-model, not persisted)

A comparison series for one of up to 5 nearby weather-observation stations (User Story 4, FR-020), produced only when the selected `Location` is in SMHI's coverage (research.md §13); simply absent (empty array) otherwise (FR-021).

| Field | Type | Notes |
|---|---|---|
| `station` | `{ id: string; displayName: string; distanceKm: number }` | Identifies the comparison station and its distance from the selected `Location`, for the chart legend |
| `series` | ObservationSeries | Same shape as the selected location's own series (same `window`, independently gap-checked per FR-022) |

**Validation rules**:
- At most 5 `NearbyStationSeries` per selected `Location` + `ObservationWindow`, ordered nearest → farthest; fewer than 5 is valid (spec Edge Cases — show however many exist).
- Never produced for a `Location` outside SMHI coverage — `weatherApi`'s coverage check (research.md §1b) gates this the same way it gates provider selection.

## UnitSystem

The user's unit preference for displaying temperature/precipitation (FR-015). Not fetched from the provider; derived client-side and optionally persisted.

| Value | Meaning |
|---|---|
| `"metric"` | °C, millimeters |
| `"imperial"` | °F, inches |

**Behavior**:
- Default value is derived from the browser locale at first load.
- A manual override, once chosen, is persisted in `localStorage` (separate key from favorites) and takes precedence over the locale default on subsequent loads.
- Applies uniformly to every displayed `WeatherObservation`, for both current location and favorite places — it is a single, app-wide preference, not per-location.

## Theme

The user's selected visual theme (FR-023–FR-025, User Story 5). Not fetched from any provider; a pure client-side UI preference.

| Value | Meaning |
|---|---|
| `"midnight"` | Dark, editorial/premium theme (default) |
| `"ivory"` | Light, minimalist/luxury theme |
| `"glass"` | Glassmorphism/premium-tech theme |

**Behavior**:
- Default is `"midnight"` when no preference has been set (FR-025).
- A manual selection is persisted in `localStorage` (a key separate from favorites/units) and takes precedence on subsequent loads.
- Applies app-wide by setting a `data-theme` attribute on the document root; every screen (graphs, details, favorites, controls) MUST derive its colors/typography from the active theme's CSS tokens rather than hardcoded values (FR-024) — the one documented exception is the chart series color palette (research.md §15), which is deliberately theme-independent so a given series keeps the same color across a theme switch.

## ObservationWindow

Represents the requested reporting period, relative to "now" at request time.

| Value | Meaning |
|---|---|
| `"last-24-hours"` | Most recent 24 hours, rolling (not calendar-day aligned) |
| `"last-7-days"` | Most recent 7 days, rolling (not calendar-week aligned) |

## ObservationSeries (view-model, not persisted)

The data actually rendered for a given `Location` + `ObservationWindow`: an ordered list of `WeatherObservation` covering the window, plus the resolved `Location` it belongs to and a fetch/error status.

| Field | Type | Notes |
|---|---|---|
| `location` | Location | The location this series describes |
| `window` | ObservationWindow | Which window was requested |
| `observations` | WeatherObservation[] | Ordered oldest → newest |
| `status` | `"loading" \| "ready" \| "unavailable"` | `"unavailable"` covers offline/no-cached-data (spec Edge Cases) **and** a saved favorite whose location can no longer be resolved (FR-016) — in both cases the UI shows an inline error rather than removing the location |

## Relationships

- A `FavoritePlace` **is a** persisted `Location` (superset of its fields).
- An `ObservationSeries` is produced **for** exactly one `Location` (current position or a `FavoritePlace`) and exactly one `ObservationWindow`.
- `WeatherObservation` records belong to exactly one `ObservationSeries`; they are not independently addressable or cached beyond the current view's lifetime (no offline cache per spec Assumptions).
- For a `"last-7-days"` `ObservationSeries`, the 7 `DailyAggregate` points are derived from that series's own `WeatherObservation[]` — they are a view of the same series, not a second fetch.
- A `NearbyStationSeries` wraps its own `ObservationSeries` (same `window` as the selected location's) plus the comparison station's identity/distance; up to 5 accompany a selected `Location`'s primary `ObservationSeries` when SMHI-covered.
- `UnitSystem` is a single app-wide preference applied when rendering any `ObservationSeries` or `DailyAggregate` (including every `NearbyStationSeries`); it does not belong to or vary per `Location`.
- `Theme` is likewise a single app-wide preference, independent of `UnitSystem`, `Location`, and every other entity — it affects only how the app is styled, never what data is shown or how it's computed.
