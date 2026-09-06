# Data Model: Fix 3-Day "Observed" Mislabel & Add Weekday Labels

## `src/components/timelineData.ts`

### `boundaryIndex` — distinguishes "no forecast" from "no observed"

```ts
// Before:
function boundaryIndex(isForecastFlags: boolean[]): number | null {
  const idx = isForecastFlags.findIndex((f) => f);
  return idx > 0 ? idx - 1 : null;
}

// After:
/** Returns null when every period is observed (no forecast anywhere — today's existing "no
 *  boundary" case, unchanged). Returns -1 when every period is forecast (no observed data at
 *  all) — a distinct value from null, since both used to collapse into the same "null" result
 *  and render identically as "Observed, 100%" even when nothing observed existed
 *  (026-fix-3-day, research.md §1). Otherwise returns the index of the last observed period. */
function boundaryIndex(isForecastFlags: boolean[]): number | null {
  const idx = isForecastFlags.findIndex((f) => f);
  return idx === -1 ? null : idx - 1;
}
```

## `src/components/WeatherIconOverview.tsx`

### Section header — derives visibility/width from an explicit observed count

```tsx
// Before:
const observedForecastSplit =
  timeline !== null && timeline.nowBoundaryIndex !== null
    ? ((timeline.nowBoundaryIndex + 1) / timeline.periods.length) * 100
    : null;

// ...

<div className="weather-timeline-sections" aria-hidden="true">
  <div
    className="weather-timeline-section-observed"
    style={{ width: observedForecastSplit !== null ? `${observedForecastSplit}%` : "100%" }}
  >
    Observed
  </div>
  {observedForecastSplit !== null && (
    <div className="weather-timeline-section-forecast" style={{ width: `${100 - observedForecastSplit}%` }}>
      Forecast
    </div>
  )}
</div>

// After:
const totalPeriods = timeline?.periods.length ?? 0;
// null boundary = everything observed (today's existing case); otherwise nowBoundaryIndex + 1
// (which may now be 0, when nowBoundaryIndex is -1 meaning "nothing observed at all").
const observedCount =
  timeline === null
    ? 0
    : timeline.nowBoundaryIndex === null
      ? totalPeriods
      : timeline.nowBoundaryIndex + 1;
const showObservedSection = observedCount > 0;
const showForecastSection = observedCount < totalPeriods;

// ...

<div className="weather-timeline-sections" aria-hidden="true">
  {showObservedSection && (
    <div
      className="weather-timeline-section-observed"
      style={{ width: `${(observedCount / totalPeriods) * 100}%` }}
    >
      Observed
    </div>
  )}
  {showForecastSection && (
    <div
      className="weather-timeline-section-forecast"
      style={{ width: `${((totalPeriods - observedCount) / totalPeriods) * 100}%` }}
    >
      Forecast
    </div>
  )}
</div>
```

(All three cases verified: `nowBoundaryIndex === null` → `observedCount === totalPeriods` →
Observed 100%, no Forecast — byte-identical to today. `nowBoundaryIndex === -1` → `observedCount
=== 0` → no Observed, Forecast 100% — the fix. `nowBoundaryIndex` a normal index → both sections
at their existing proportional widths — unchanged.)

### New weekday-label row (3-day view only)

```tsx
{displayMode === "last-3-days" && (
  <div className="weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-weekday">
    <div className="weather-timeline-row-title" aria-hidden="true" />
    <PeriodGrid
      periods={timeline.periods}
      className="weather-timeline-row weather-timeline-row-grid weather-timeline-row-grid-cells"
    >
      {(period, i) =>
        i % 5 === 0 ? (
          <span className="weather-timeline-weekday-label">
            {new Date(period.key).toLocaleDateString([], { weekday: "short" })}
          </span>
        ) : (
          <span aria-hidden="true" />
        )
      }
    </PeriodGrid>
  </div>
)}
```

Placed immediately before the existing `weather-timeline-row-time` row (which renders the
Morning/Lunch/Afternoon/Evening/Night period names), reusing the exact same
`i % 5 === 0` day-grouping convention the existing day-boundary marker (`dayBoundaryPercents`)
already relies on.

## Validation Rules

- `observedCount`/`showObservedSection`/`showForecastSection` never both render `false` — every
  period is either observed or forecast, so at least one section always has a nonzero share
  (guarded implicitly: `observedCount` ranges `[0, totalPeriods]`, and `totalPeriods > 0` whenever
  `timeline !== null`, so at least one of `observedCount > 0` / `observedCount < totalPeriods` is
  always true).
- The weekday label is derived only from each period's own real `key` timestamp — never
  fabricated or guessed (FR-005).
