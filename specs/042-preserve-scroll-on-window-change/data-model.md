# Phase 1 Data Model: Keep Scroll Position When Switching the Time Window

No new persisted entities — this feature changes the *lifecycle* of an existing piece of client
state, not its shape.

## `UseObservationDataResult` (existing, one field added)

`src/hooks/useObservationData.ts`'s returned object:

| Field | Change |
|-------|--------|
| `series: ObservationSeries \| null` | Unchanged shape. Behavior change: reset to `null` only on a genuine location change (or first load for that location) — a window-only change now leaves the previous value in place until the new fetch resolves. |
| `weeklySeries: ObservationSeries \| null` | Same behavior change as `series`. |
| `isRefreshing: boolean` (**new**) | `true` while a fetch is in flight for a location that already has prior `series` data (i.e. a window-only refetch); `false` otherwise, including during the initial/location-change load (which already has its own `series === null` loading indicator). Optional for consumers — none are required to use it; it exists so a component *may* show a subtle in-place indicator without collapsing content. |

## Internal (not exposed): previous-location tracking

- A `useRef<{ latitude: number; longitude: number } | null>` inside `useObservationData`, holding
  the coordinates of the location the hook last fetched for. Compared against the incoming
  `location` on each effect run to decide whether this is a "new location" (reset to `null`) or a
  "same location, different window" (keep previous data) run. Not part of the hook's public return
  value — purely internal bookkeeping.

## No changes to

- `ObservationSeries`, `WeatherObservation`, or any other existing model type (`src/models/types.ts`).
- Any consuming component's props or rendering logic (per `research.md` §2's blast-radius check) —
  `WeatherIconOverview.tsx`, `ObservationChart.tsx`, `ObservationDetails.tsx`, and `Footer.tsx` all
  keep working unmodified against the same `series`/`weeklySeries` shape.
