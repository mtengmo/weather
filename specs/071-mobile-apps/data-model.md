# Data Model: Tengmo Väder Android App

Phase 1 output for [spec.md](spec.md), grounded in the web app's existing `src/models/types.ts` (kept as the semantic source of truth per FR-005/FR-006 parity). Types below are described platform-neutrally; the implementation phase maps them to Kotlin data classes.

## Location

Represents a place weather is shown for.

| Field | Type | Notes |
|---|---|---|
| latitude | Double | |
| longitude | Double | |
| displayName | String | Human-readable place name |
| source | enum: `CurrentPosition` \| `Favorite` | Mirrors web's `LocationSource` |

## Favorite

A saved `Location`, persisted on-device.

| Field | Type | Notes |
|---|---|---|
| id | String | Stable identifier |
| latitude, longitude | Double | |
| displayName | String | |
| addedAt | Instant | |

**Rules**: max 10 per device (FR-006, mirrors web's `FAVORITES_LIMIT`); attempting to add an 11th is rejected with the same limit message as the web app.

## UserPreferences

Single record, persisted on-device (FR-006, FR-007).

| Field | Type | Default |
|---|---|---|
| theme | enum: `Midnight` \| `Ivory` | `Midnight` |
| unit | enum: `Metric` \| `Imperial` | `Metric` |
| language | enum: `Auto` \| `En` \| `Sv` | `Auto` |
| nearbyStationCount | Int (0–4) | 0 |
| highLowVisible | Boolean | false |
| lastViewedLocation | Location? | null |

## WeatherObservation

One timestamped data point (observed or forecast), mirroring the web app's `WeatherObservation`.

| Field | Type | Notes |
|---|---|---|
| timestamp | Instant | |
| temperature | Double? | °C as fetched |
| precipitation | Double? | mm |
| windSpeed | Double? | m/s |
| windDirection | Double? | degrees, wind FROM |
| windGust | Double? | m/s |
| cloudCoverPercent | Int? | 0–100 |
| relativeHumidity | Int? | 0–100, feels-like input only |
| chanceOfRain | Int? | 0–100, forecast points only |
| isForecast | Boolean | default false |
| symbolCondition | WeatherCondition? | pre-classified condition |
| smhiSymbolCode | Int? | SMHI raw 1–27, SMHI-forecast only |

## ObservationSeries

A location's set of observations for a time window.

| Field | Type | Notes |
|---|---|---|
| location | Location | |
| window | enum: `Last24Hours` \| `Last7Days` \| `Last30Days` | |
| observations | List\<WeatherObservation\> | |
| status | enum: `Loading` \| `Ready` \| `Unavailable` | |
| primarySource | enum: `Smhi` \| `OpenMeteo`? | |
| forecastFromFallbackSource | Boolean | default false |
| forecastIssuedAt | Instant? | |

## DailyAggregate

One rolling-24h bucket for the 7/30-day graph, mirroring the web app's `DailyAggregate` (high/low/average/precipitation totals, daytime-only variants for icon selection, etc. — same field set and meaning; not re-listed field-by-field here since it is a pure aggregation derived from `WeatherObservation`, not new domain data).

## StationInfo / NearbyStationSeries

Nearby SMHI station identity and its comparison series, same shape as web (`StationInfo`, `NearbyStationSeries`), used when `nearbyStationCount` > 0 and the Graph view has been opened.

## WeatherWarning

An active or upcoming SMHI warning for the location, same fields and rules as web's `WeatherWarning` (severity code/label, area, validity window, `isActive`, `isInformational`).

## Widget

**New entity for this feature** — one configured home-screen widget instance.

| Field | Type | Notes |
|---|---|---|
| widgetId | Int | Android's app-widget instance ID (system-assigned) |
| size | enum: `Small` \| `Medium` | Fixed at add-time per FR-021/FR-022 |
| target | WidgetTarget (below) | Which place this widget shows |
| lastSnapshot | CachedWeatherSnapshot? | For fast/offline redraw between refresh cycles |

### WidgetTarget

| Field | Type | Notes |
|---|---|---|
| kind | enum: `Favorite` \| `MyLocation` | FR-025 |
| favoriteId | String? | Set when kind = `Favorite`; if that favorite is later deleted, the widget enters the "place removed" state (FR-030) rather than holding a dangling reference |
| lastKnownLocation | Location? | Set when kind = `MyLocation`; updated on each significant-location-change refresh (FR-026); used as the fallback display when background location is denied/revoked (FR-028) |
| backgroundLocationGranted | Boolean | Tracked per-target so FR-028's "offer a way to grant" UI knows when to show |

**Lifecycle**: created when the user adds a widget to the home screen and completes target selection; updated on each periodic/triggered refresh (research.md §3–4); removed when the user removes the widget from the home screen (standard Android widget lifecycle callback).

## CachedWeatherSnapshot

The most recently successfully loaded weather data for a given location, used for offline display (FR-020) and as a widget's last-drawn content (FR-029) while a refresh is pending.

| Field | Type | Notes |
|---|---|---|
| location | Location | |
| loadedAt | Instant | Drives the "last updated" / offline indication |
| currentConditionSummary | (icon condition, temperature, high/low, rain chance, next-hours strip) | Enough fields to redraw the Overview and both widget sizes without a network round-trip |

## Relationships

- A `Favorite` is a persisted `Location`; `UserPreferences.lastViewedLocation` and a `WidgetTarget` may reference either a `Favorite` or the device's current position.
- Each `Widget` has exactly one `WidgetTarget`, resolved to a `Location` at refresh time (a `Favorite`'s current coordinates, or the tracked current position for `MyLocation`).
- `ObservationSeries`/`DailyAggregate`/`WeatherWarning` are always derived per-`Location`, never persisted beyond the current session except as a `CachedWeatherSnapshot` for offline/widget use.
- `NearbyStationSeries` exists only alongside a selected `Location`'s own `ObservationSeries`, gated by `nearbyStationCount` and by the Graph view having been opened (mirrors web's `hasOpenedDetails` gate, FR-005 parity).
