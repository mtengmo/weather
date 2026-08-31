# Contract: High/Low Visibility Preference (`services/highLowVisibility.ts`)

New internal module contract, following the exact shape of `001-weather-history-locations`'s `theme-service.md` (`services/theme.ts`) and `003-extended-history-metrics`'s `nearby-station-count-service.md` (`services/nearbyStationCount.ts`).

```ts
function getHighLowVisibility(): boolean

function setHighLowVisibility(visible: boolean): void
```

### `getHighLowVisibility()`

- Reads a persisted choice from `localStorage` (key `weather-app:high-low-visible:v1`) if present and a valid boolean-ish stored value (`"true"`/`"false"`); otherwise returns `true` (FR-006's default). Never throws — falls back to `true` if `localStorage` is unavailable or the stored value is anything else.

### `setHighLowVisibility(visible)`

- Persists `visible` to `localStorage`. Best-effort: if `localStorage` is unavailable, the call is a no-op (in-memory selection still applies for the current session).

### `useHighLowVisibilityPreference()` hook

- Follows the exact shape of `useThemePreference()`/`useNearbyStationCountPreference()`: reads the persisted value on mount, exposes `{ visible, setVisible }`.

## Consumers

- `App.tsx` holds the current value via this hook and passes it to `ObservationChart` (a new `highLowVisible` prop) and to a new `HighLowToggle` UI control.
- `ObservationChart.tsx`'s temperature and wind 7-day/30-day branches conditionally render their `<Line dataKey="...High">`/`<Line dataKey="...Low">` elements based on this prop; the average line and (for temperature) the precipitation bar are unaffected. Unlike `nearbyStationCount`, changing this preference does **not** trigger a re-fetch — it is a pure rendering condition over already-fetched/already-aggregated data (research.md §3).

## Postconditions

- After `setHighLowVisibility(visible)` followed by a reload, `getHighLowVisibility()` returns `visible`.
- Toggling this preference while viewing a temperature or wind 7-day/30-day chart updates the rendered lines with no additional network request and no change to the underlying data.
