# Data Model: Dashboard Polish, Round Seven

## Changed types

### `WeatherCondition` (`src/services/weatherCondition.ts`)

| Before | After |
|---|---|
| `"rainy"` | `"light-rain"` \| `"heavy-rain"` |
| `"snowy"` | `"light-snow"` \| `"heavy-snow"` |

Every other existing value (`clear-day`, `clear-night`, `cloudy`, `windy`, `thunderstorm`,
`foggy`, `sleet`) is unchanged.

### `useGeolocation`'s `Location.displayName` resolution order (`src/hooks/useGeolocation.ts`)

| Before | After |
|---|---|
| 1. `"Unnamed station"` placeholder<br>2. nearest station name<br>3. `` `near ${reverseGeocode}` `` (only if station name unusable) | 1. `"Unnamed station"` placeholder<br>2. `reverseGeocode` place name (preferred)<br>3. nearest station name (fallback) |

## New local/derived state

### `DismissedWarningIds` (`useWarningDismissal.ts`, localStorage-backed)

| Field | Type | Notes |
|---|---|---|
| dismissed ids | `string[]` (stored), `Set<string>` (in-memory) | Each entry is one `WeatherWarning.id` (e.g. `"3122-9873"`, already unique per warning-area per `028`'s data model) the user has dismissed. `App.tsx` filters `warnings` to exclude any id present in this set before passing to `WarningBanner`. |

### Radar tile URL (`MapView.tsx`, component-local, not persisted)

| Field | Type | Notes |
|---|---|---|
| `radarTileUrl` | `string \| null` | Built from RainViewer's `weather-maps.json` (`host` + latest `radar.past[].path` + the fixed `/256/{z}/{x}/{y}/2/1_1.png` template). `null` when the metadata fetch fails or returns no frames — no `TileLayer` is rendered in that case (FR-004). |

### Temperature chart tick set (`LineRow`, component-local, not persisted)

| Field | Type | Notes |
|---|---|---|
| `ticks` | `{ value: number; y: number }[]` | Generated from the row's own min/max (rounded outward to the nearest 5), one entry per 5°-step value in range, each carrying its already-computed SVG Y position (via the same `yFor` function the polyline itself uses). |

## Validation rules

- A `WeatherCondition` value is never the removed `"rainy"`/`"snowy"` strings anywhere in the
  codebase after this feature — every producer (both providers' symbol-code mappings, the
  threshold-based fallback) and every consumer (`WEATHER_ICONS`, the two `isSnowy`-style checks
  in `timelineData.ts`) is updated together, so no intermediate state exists where one side still
  expects the old values.
- `radarTileUrl` is `null` (no layer rendered) whenever RainViewer's metadata can't be fetched or
  parsed — never a stale/broken tile URL guessed from partial data.
- A dismissed warning id that no longer appears in the live warnings feed simply has no effect
  (nothing to filter) — the dismissed-id set is never proactively pruned, avoiding any need to
  distinguish "still active but dismissed" from "no longer active" for storage purposes.
