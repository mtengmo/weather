# Research: Fix 3-Day "Observed" Mislabel & Add Weekday Labels

## §1 — `boundaryIndex` conflates two distinct "no boundary" cases (US1 / FR-001-003)

**Decision (confirmed via code review and live Playwright verification)**:

```ts
function boundaryIndex(isForecastFlags: boolean[]): number | null {
  const idx = isForecastFlags.findIndex((f) => f);
  return idx > 0 ? idx - 1 : null;
}
```

`idx` is the index of the first forecast period. When `idx === -1` (no forecast anywhere — every
period is observed), the function correctly returns `null`. But when `idx === 0` (forecast starts
at the very first column — no observed period anywhere), it *also* returns `null`, identical to
the first case. `WeatherIconOverview.tsx` then renders both as "Observed section, 100% width, no
Forecast section" — correct for the first case, wrong for the second. Live verification against a
real 3-day view confirmed exactly this: `OBSERVED SECTION WIDTH: 100%`, `FORECAST SECTION WIDTH:
NOT FOUND`, while every visible period's own condition label read e.g. `"RainForecast"`.

**Fix**: Change the function to `idx === -1 ? null : idx - 1` — when `idx === 0`, this now returns
`-1` (a distinct, meaningful value: "the boundary is before the very first column," i.e.,
everything from column 0 onward is forecast) instead of collapsing it into `null`. Verified this
distinct value flows safely through every other consumer of `nowBoundaryIndex`:
- `interpolateNowBoundary`: reads `row.points[nowBoundaryIndex]` — for `-1`, this is
  `row.points[-1]`, which JavaScript arrays return as `undefined` for; the existing
  `if (!observedNeighbor || ...) return row;` guard already handles this safely (interpolation is
  skipped, not crashed).
- `isNowColumn(index, nowBoundaryIndex)`: `index === nowBoundaryIndex + 1` — for `-1`, this
  correctly marks column 0 (the true first forecast column) as "now," which is semantically
  correct.
- The section-header render itself is reworked (see below) to treat `-1` as "zero observed
  columns" explicitly, rather than deriving a single percentage that can't distinguish 0% from
  "no boundary."

**Rationale**: The smallest change that fixes the actual defect — one function's edge case,
verified safe across every downstream consumer via code review, no consumer needed its own change
except the section-header render (which already needed reworking to *use* the distinction, not
just tolerate the new value).

**Alternatives considered**: Introducing a separate boolean flag (e.g., `hasAnyObserved: boolean`)
alongside `nowBoundaryIndex` — rejected as a larger interface change (a new field threaded through
`TimelineData` and every builder) for a fix `-1` already expresses cleanly using the existing
type (`number | null`).

## §2 — Section-header rendering needs an explicit observed-column count (US1)

**Decision**: Replace the single derived `observedForecastSplit` percentage (which cannot
represent "0 observed columns" distinctly from "null boundary") with an explicit `observedCount`
computed from the (now-corrected) `nowBoundaryIndex`, then derive both sections' visibility and
width from `observedCount` directly: `observedCount === 0` → no Observed section, Forecast at
100%; `observedCount === totalPeriods` → no Forecast section, Observed at 100% (today's existing
`null`-boundary case, unchanged); anything in between → both sections at their proportional
widths (today's existing mixed case, unchanged).

**Rationale**: A percentage alone loses the "is this genuinely zero, or is there no boundary at
all" distinction that matters here; an explicit count preserves it through to the render
condition.

## §3 — Weekday labels reuse the existing day-grouping convention (US2 / FR-004-005)

**Decision (confirmed via code review)**: The existing day-boundary marker
(016-dashboard-polish-round-two) already relies on the 3-day view's own guaranteed contract — the
`toSubDayBuckets` builder ([dailyAggregation.ts](../../src/services/dailyAggregation.ts))
always produces exactly 5 sub-day periods per day (Morning, Lunch, Afternoon, Evening, Night) — to
compute boundaries via simple index arithmetic (`i % 5 === 0`), not by parsing/comparing dates.

**Fix**: Add a new row above the existing period-name row, rendered only when
`displayMode === "last-3-days"` (matching the day-boundary marker's own gate), showing each
period's own weekday (derived from that period's real `key` timestamp, per FR-005) only on the
first column of each day-group (`i % 5 === 0`), leaving the other four columns of that group
blank in this new row.

**Rationale**: Reuses a proven, already-shipped convention exactly rather than introducing a
second, independent way to detect day boundaries (e.g., date-string comparison) that could
disagree with the existing marker in an edge case.

**Alternatives considered**: A merged/spanning cell (one wide label truly spanning all 5 columns
of a day, using a grid `column-span` or similar) — considered for a more visually "grouped"
appearance, but rejected as a larger CSS/layout change than the fix warrants; a label on the first
column, positioned to read naturally above that day's block, is markedly simpler and satisfies
FR-004's "above or alongside" wording without needing a new layout primitive.
