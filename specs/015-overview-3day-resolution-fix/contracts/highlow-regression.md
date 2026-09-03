# Contract: High/Low Regression Guard (User Story 3)

## Finding

No code change is required to `LineRow`'s rendering (`src/components/WeatherIconOverview.tsx`) or to
`RowSource.high`/`.low` → `TimelineRowPoint.high`/`.low` population (`src/components/timelineData.ts`).
Live testing during planning (dev server + Playwright, Stockholm, High/Low on, 7-day view) confirmed
this already renders correctly, e.g.:

```
18 °C (22°/14°)
17 °C (19°/16°)
...
```

## What this feature actually changes here

1. `build3DayTimelineData` (new, see `overview-resolution-split.md`) populates `high`/`low` on its
   `RowSource` entries from `day.high`/`day.low` exactly the way `buildDailyTimelineData` already
   does — copy-identical, not reinvented.
2. Test coverage is added (not previously present) asserting high/low renders correctly:
   - On the reverted (post-014-US8) plain 7-day view.
   - On the new 3-day view, per sub-day period.
   - Confirmed absent on the 24-hour view (unchanged, by design — no day-level high/low concept
     for a single hour).
   - Confirmed absent when the toggle is off, on both views.

## No changes to

- `src/components/HighLowToggle.tsx`, `src/hooks/useHighLowVisibilityPreference.ts`,
  `src/services/highLowVisibility.ts` — the toggle and its persisted preference are unaffected.
- `src/components/ObservationChart.tsx`'s own High/Low lines (the classic graph) — already working,
  out of scope per spec Assumptions.
