# Contract: `WeatherIconOverview` view + navigation (new, internal)

## `src/components/weatherIcons.tsx`

Exports a lookup from `WeatherCondition` to its `lucide-react` icon component and an accessible text label (e.g., `"clear-day"` → `{ Icon: Sun, label: "Clear" }`, `"clear-night"` → `{ Icon: Moon, label: "Clear" }`). The "no data" (`null`) case is handled by the caller, not this lookup, since it has no `WeatherCondition` to look up.

## `src/components/WeatherIconOverview.tsx`

A new sibling to `ObservationChart.tsx`/`ObservationDetails.tsx`, taking the same `location`/`unit`/`series` props `ObservationChart` already receives (no new data-fetching — this view renders from the same already-loaded `ObservationSeries`), plus a window toggle scoped to `"last-24-hours"`/`"last-7-days"` only (FR-001/FR-004 — the 30-day window is out of scope per spec Edge Cases, so this view does not offer that window option at all, rather than offering it and showing nothing).

**Rendering rules**:
- One grid cell per period (hour or day), each showing: the icon (or a distinct "no data" glyph/text when `condition` is `null`), the period's label, and its key values (temperature, and whichever of precipitation/wind/cloud are non-null) — per FR-005's "underlying values remain visible."
- A forecast period's cell is visually distinguished per research.md §4 (reduced-opacity treatment matching 005/006's existing forecast convention, plus a text label for accessibility).
- Layout is a responsive CSS grid (research.md §5) inside a container without the existing charts' fixed height, so it visibly grows with the browser window (FR-011).

## `src/App.tsx` — extended

`type View = "graph" | "details"` gains a third value (e.g. `"overview"`), with a corresponding navigation button alongside the existing "View details" button (FR-009) and back-navigation from the new view to the graph view, mirroring the existing details-view navigation pattern already in `App.tsx`.
