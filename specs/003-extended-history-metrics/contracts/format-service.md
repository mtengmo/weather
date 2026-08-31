# Contract: Display Formatting (`services/format.ts`)

New internal module contract — a single shared rounding helper used everywhere a numeric weather value is displayed (FR-011).

```ts
function formatValue(value: number | null, decimals?: number): string // decimals defaults to 1
```

- `formatValue(null)` → `"—"` (em dash), matching the existing gap-display convention already used by `ObservationDetails.tsx`'s current `formatTemperature`/`formatPrecipitation`.
- `formatValue(17.7541666666666)` → `"17.8"` (standard rounding via `Number.prototype.toFixed`).
- `formatValue(18)` → `"18.0"` — always shows exactly `decimals` digits after the point, never fewer, so whole-number values don't read inconsistently next to fractional ones (spec Edge Cases: "18.0 not sometimes 18").
- Unit suffixes (`°C`, `mm`, `m/s`, `%`) are NOT part of this function — callers append their own suffix, keeping `formatValue` metric-agnostic and reusable across temperature, precipitation, wind, and cloud coverage.

## Consumers

- `ObservationDetails.tsx`: replaces its local `formatTemperature`/`formatPrecipitation` bodies with calls to `formatValue(x, 1)` (plus each function's existing unit-suffix logic, unchanged) — see [weather-metrics-service.md](./weather-metrics-service.md) for the new wind/cloud columns this table gains.
- `ObservationChart.tsx`: passed as the Recharts `<Tooltip formatter={...}>` callback (wrapped to also append the active metric's unit suffix), so tooltips round the same way the details table does (research.md §6).

## Postconditions

- Every numeric weather value rendered anywhere in the app (tooltip or table, any metric, any window) has passed through `formatValue` with `decimals = 1` before reaching the DOM — satisfies SC-003's "100% of displayed numeric weather values show at most one decimal place" by construction, since there is exactly one formatting code path.
