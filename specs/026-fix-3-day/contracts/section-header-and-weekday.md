# Contract: Corrected Section Header & Weekday Labels (US1, US2)

## `src/components/timelineData.ts` (US1)

See `data-model.md` for the exact `boundaryIndex` change.

**Test-relevant**: `boundaryIndex([true, true, true])` (all forecast) must return `-1`, not
`null`. `boundaryIndex([false, false, false])` (all observed) must return `null`, unchanged.
`boundaryIndex([false, true, true])` must return `0`, unchanged.

## `src/components/WeatherIconOverview.tsx` (US1)

See `data-model.md` for the `observedCount`/`showObservedSection`/`showForecastSection` rework.

**Test-relevant**: a 3-day timeline whose periods are entirely forecast must render
`.weather-timeline-section-forecast` at 100% width and must NOT render
`.weather-timeline-section-observed` at all. A timeline entirely observed must render only
`.weather-timeline-section-observed` at 100%, unchanged from today. A mixed timeline must render
both at their existing proportional widths, unchanged from today.

## `src/components/WeatherIconOverview.tsx` (US2)

See `data-model.md` for the new weekday-label row.

**Test-relevant**: on the 3-day view, exactly 3 non-empty weekday labels must render (one per
day), each on the first (`i % 5 === 0`) column of its day-group, and each must match that
column's own period date's weekday. The 7-day and 24-hour views must not render this row at all
(gated on `displayMode === "last-3-days"`).

## No changes to

- `interpolateNowBoundary`, `isNowColumn` — both already tolerate `nowBoundaryIndex === -1`
  correctly (verified via code review, research.md §1); no code change needed in either.
- The existing day-boundary marker (`dayBoundaryPercents`) — unchanged; the new weekday row reuses
  its exact grouping convention but is an independent render addition.
- The 7-day view's own daily labels (already weekday + date, from
  019-dashboard-polish-round-four) — unaffected; this feature only adds the missing weekday
  context to the 3-day sub-day view, which never had it.
