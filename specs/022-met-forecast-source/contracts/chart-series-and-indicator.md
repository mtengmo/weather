# Contract: Per-Source Chart Lines Everywhere & Overview Indicator (US4)

## `src/components/ObservationChart.tsx`

See `research.md` §2 for the discovery that per-source lines already exist (24-hour Temperature
tab only) and `data-model.md` for extending the same pattern to the 7-day Temperature chart and
the Rain/Wind tabs. No new toggle/mode is introduced — the existing always-on-when-2+-sources
behavior is preserved and simply reaches more tabs/windows.

**Test-relevant**: with 3 mocked `multiSourceForecast` entries, the 7-day Temperature chart and
the Rain and Wind tabs must each render one `<Line>` per contributing source plus one combined
line, matching the count and labels the 24-hour Temperature tab already renders today.

## `src/components/timelineData.ts`, `src/components/WeatherIconOverview.tsx`

See `data-model.md` for `TimelineRowPoint.combinedSourceCount` and the `LineRow` suffix change.

**Test-relevant**: a point blended from exactly 2 sources renders `(avg)` (unchanged wording); a
point blended from 3 sources renders `(avg of 3)`.

## No changes to

- `chartData.ts`'s `sourceKey`, `seriesColor`, `seriesDash`, or `mergeMultiSourceForecastIntoRows`
  — all already generalize to any number of sources (confirmed via code review, research.md §2);
  only the JSX in `ObservationChart.tsx` that currently renders these lines for one tab/window
  needs duplicating to the others.
- The Overview's `(avg)` marker's *placement* or the temperature-only scope of blending
  (established in 016/019) — this round only adds a count to the existing text, per research.md
  §6's decision to reject naming individual sources inline as too long for the compact cell.
