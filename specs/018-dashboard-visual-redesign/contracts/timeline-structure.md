# Contract: Observed/Forecast Sections and Sticky Row Labels (User Stories 2 & 3)

## `src/components/WeatherIconOverview.tsx`

### Observed/Forecast section row

```tsx
const observedForecastSplit =
  timeline !== null && timeline.nowBoundaryIndex !== null
    ? (((timeline.nowBoundaryIndex + 1) / timeline.periods.length) * 100)
    : null; // null means "all observed, no forecast section"
```

```tsx
<div className="weather-timeline-sections" aria-hidden="true">
  <div
    className="weather-timeline-section-observed"
    style={{ width: observedForecastSplit !== null ? `${observedForecastSplit}%` : "100%" }}
  >
    Observed
  </div>
  {observedForecastSplit !== null && (
    <div
      className="weather-timeline-section-forecast"
      style={{ width: `${100 - observedForecastSplit}%` }}
    >
      Forecast
    </div>
  )}
</div>
```

Rendered as the first child inside `.weather-timeline`, above the existing time-label `PeriodGrid`.
`aria-hidden="true"` since every period already discloses its own observed/forecast status via
existing per-cell labeling (e.g. `ConditionRow`'s "(forecast)" suffix in its `aria-label`) — this
row is a purely visual grouping aid.

### Restyled "Now" marker

No JSX change — `.weather-timeline-now`'s existing element/position logic is reused as-is; only
its CSS (below) changes from a dashed line to a filled pill.

### Sticky row-label column

`LineRow`/`BarRow`/`WindRow` each gain:

```tsx
function LineRow({ row, periods, nowBoundaryIndex, highLowVisible, subLabel }: {
  // ...existing props...
  subLabel?: string;
}) {
  // ...
  <div className="weather-timeline-row-title">
    {row.label} <span className="weather-timeline-row-unit">({row.unitLabel})</span>
    {subLabel && <span className="weather-timeline-row-sublabel">{subLabel}</span>}
  </div>
  // ...
}
```

Call sites:

```tsx
<BarRow row={timeline.precipitation} ... subLabel="Probability" />
<WindRow row={timeline.wind} ... subLabel="Gusts" />
```

(Temperature and snow rows pass no `subLabel`.)

The time-label row gains an empty sticky placeholder matching the title column's width, so its
data starts at the same horizontal offset as every other row:

```tsx
<div className="weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-time">
  <div className="weather-timeline-row-title" aria-hidden="true" />
  <PeriodGrid periods={timeline.periods} className="weather-timeline-row-grid-cells">
    {(period) => <span>{period.label}</span>}
  </PeriodGrid>
</div>
```

`ConditionRow` — which today has no title column of its own at all — gains one, labeled "Weather"
(matching the mockup's own left-hand row labels), using the same wrapper/sticky-title structure as
`LineRow`/`BarRow`/`WindRow`:

```tsx
function ConditionRow({ periods, nowBoundaryIndex }: { ... }) {
  return (
    <div className="weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-condition">
      <div className="weather-timeline-row-title">Weather</div>
      <PeriodGrid periods={periods} className="weather-timeline-row-grid-cells">
        {/* ...existing per-cell rendering, unchanged... */}
      </PeriodGrid>
    </div>
  );
}
```

(This requires every row's outer wrapper to become a flex row containing the title stub and the
`PeriodGrid` as siblings — see CSS below — rather than the title sitting as its own block above
the grid, or absent entirely, as today.)

## `src/index.css`

```css
.weather-timeline-sections {
  display: flex;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding-left: 7rem; /* matches the sticky title column's width, so sections align with data columns */
}

.weather-timeline-section-observed,
.weather-timeline-section-forecast {
  text-align: center;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--border);
}

/* Row layout: a fixed, sticky title column beside the scrolling data grid, rather than the
   title stacked above it (016 and earlier) — 018-dashboard-visual-redesign, FR-009. */
.weather-timeline-row-label-wrap {
  display: flex;
  align-items: flex-start;
}

.weather-timeline-row-title {
  position: sticky;
  left: 0;
  z-index: 2;
  flex: 0 0 7rem;
  width: 7rem;
  background: var(--surface);
  padding: 0.35rem 0.5rem 0.35rem 0;
}

.weather-timeline-row-sublabel {
  display: block;
  font-size: 0.65rem;
  color: var(--text-muted);
}

.weather-timeline-row-grid-cells {
  flex: 1 1 auto;
}

/* Restyled "Now" marker: a filled pill instead of a plain dashed line + label
   (018-dashboard-visual-redesign, research.md §2). */
.weather-timeline-now-label {
  background: var(--now-accent);
  color: var(--surface);
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
  font-weight: 700;
}
```

(`7rem` is repeated in both the JSX inline style's implicit assumption and here rather than a CSS
variable, matching this file's existing convention of literal values per rule; a shared
`--timeline-label-width` custom property is an easy follow-up if the value needs to change in more
than one place later.)

## No changes to

- `PeriodGrid`'s own column-math (`grid-template-columns: repeat(N, 1fr)`) — untouched; it now
  lives inside a flex sibling instead of a block-stacked child, but its own internal grid layout
  is identical.
- `ConditionRow` — unaffected, no title column of its own (it has no left-hand label in the
  mockup either).
