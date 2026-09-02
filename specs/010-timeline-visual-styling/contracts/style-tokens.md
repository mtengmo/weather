# Contract: CSS Style Tokens for the Timeline Restyle

## New CSS custom properties (`src/index.css`)

Added to all three existing theme blocks (`:root, [data-theme="midnight"]`, `[data-theme="ivory"]`,
`[data-theme="glass"]`), alongside the existing `--accent`/`--accent-2`/etc. tokens:

```css
--wx-sun: ...;
--wx-moon: ...;
--wx-cloud: ...;
--wx-rain: ...;
--wx-snow: ...;
--wx-windy: ...;

--row-temperature: ...;
--row-wind: ...;
--row-precipitation: ...;
--row-cloud: ...;
--row-feelsLike: ...;
--row-snow: ...;
--row-gust: ...;

--now-accent: ...;
```

Exact per-theme hex values: see research.md §1.

## New/changed CSS rules (`src/index.css`)

- `.weather-condition-clear-day svg { color: var(--wx-sun); }` (and one such rule per condition,
  matching the `weather-condition-${condition}` class introduced in `ConditionRow`).
- `.weather-timeline-row-temperature .weather-timeline-line-observed,
   .weather-timeline-row-temperature .weather-timeline-line-forecast { stroke: var(--row-temperature); }`
  plus a gradient-fill rule for the temperature row specifically (FR-003) — an SVG `<linearGradient>`
  or a CSS `background` gradient overlay on `.weather-timeline-line-area`, scoped to
  `.weather-timeline-row-temperature`.
- One analogous rule per other row key (`wind`, `precipitation`, `cloud`, `feelsLike`, `snow`,
  `gust`), setting `stroke`/`background`/arrow `color` from that row's `--row-*` token instead of
  the current shared `var(--accent)`/`var(--accent-2)`.
- `.weather-timeline-now { border-left-color: var(--now-accent); }` (replacing the current
  `var(--text-muted)`).
- `.weather-timeline-now-column { color: var(--now-accent); }` (new class, new rule).

## Changed component markup (`src/components/WeatherIconOverview.tsx`)

- `ConditionRow`: the existing `.weather-timeline-condition` div gains a second class,
  `` `weather-condition-${period.condition}` ``, only when `period.condition !== null` (mirrors the
  existing null-guard already present for the icon itself).
- `LineRow`/`BarRow`/`WindRow`: each row's existing outer
  `.weather-timeline-row.weather-timeline-row-label-wrap` div gains a second class,
  `` `weather-timeline-row-${row.key}` ``.
- The main component's `PeriodGrid` usages for each row: the cell at
  `index === nowBoundaryIndex + 1` (when `nowBoundaryIndex !== null`) gains an additional
  `weather-timeline-now-column` class — implemented as a small helper (e.g.
  `nowColumnClass(index, nowBoundaryIndex)`) reused across `LineRow`/`BarRow`/`WindRow`/
  `ConditionRow`'s cell rendering, so all rows apply it identically (keeps every row's "now" cell
  visually consistent, per FR-006's "across every row" wording).

## No changes to

- `src/components/timelineData.ts` — `TimelineData`/`TimelineRow`/`TimelineRowPoint` shapes,
  values, and row set are untouched (FR-009).
- `src/services/weatherCondition.ts`, `src/components/weatherIcons.tsx` — icon *set* and condition
  derivation are untouched; only the icon's rendered color changes.
- Any provider/aggregation/service file — this is a pure presentation-layer change.
