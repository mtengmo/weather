# Data Model: Timeline Visual Styling from Mockup

This feature introduces no new application data — `TimelineData`/`TimelineRow`/`TimelineRowPoint`
(`src/components/timelineData.ts`) are unchanged (spec FR-009, research.md §4). The "entities" here
are presentation-layer tokens: CSS custom properties and the class names that select them.

## Condition Icon Palette

One color token per `WeatherCondition` value (`src/services/weatherCondition.ts`), defined per
theme in `src/index.css`:

| Token | `WeatherCondition` | Consumed by |
|---|---|---|
| `--wx-sun` | `clear-day` | `.weather-condition-clear-day svg` |
| `--wx-moon` | `clear-night` | `.weather-condition-clear-night svg` |
| `--wx-cloud` | `cloudy` | `.weather-condition-cloudy svg` |
| `--wx-rain` | `rainy` | `.weather-condition-rainy svg` |
| `--wx-snow` | `snowy` | `.weather-condition-snowy svg` |
| `--wx-windy` | `windy` | `.weather-condition-windy svg` |

## Metric Row Palette

One color token per `TimelineRow.key` (`src/components/timelineData.ts`), defined per theme:

| Token | `TimelineRow.key` | Row kind | Consumed by |
|---|---|---|---|
| `--row-temperature` | `temperature` | line (+ gradient fill) | `.weather-timeline-row-temperature` |
| `--row-wind` | `wind` | wind (text + arrow) | `.weather-timeline-row-wind` |
| `--row-precipitation` | `precipitation` | bar | `.weather-timeline-row-precipitation` |
| `--row-cloud` | `cloud` | line | `.weather-timeline-row-cloud` |
| `--row-feelsLike` | `feelsLike` | line | `.weather-timeline-row-feelsLike` |
| `--row-snow` | `snow` | bar | `.weather-timeline-row-snow` |
| `--row-gust` | `gust` | bar | `.weather-timeline-row-gust` |

A row not currently rendered (e.g. if a future feature removes it) simply has an unused token — no
validation/enforcement needed, since CSS custom properties are inert when unreferenced.

## Now-Column Accent

A single token, `--now-accent`, applied to:
- The existing `.weather-timeline-now` vertical marker line's `border-left` color (replacing its
  current `var(--text-muted)`).
- A new `.weather-timeline-now-column` class applied to the boundary-adjacent cell
  (`periods[nowBoundaryIndex + 1]`, research.md §2) in every row, coloring that cell's text/value.

## Field Population Rules

- Every token above is defined exactly once per theme block (`:root`/`[data-theme="midnight"]`,
  `[data-theme="ivory"]`, `[data-theme="glass"]` in `src/index.css`) — no JS-side color logic, no
  per-render computation.
- `weather-condition-${condition}` and `weather-timeline-row-${row.key}` class names are derived
  directly from existing string values already present in the render (the `WeatherCondition` union
  member and `TimelineRow.key`) — no new lookup table needed in the component.
- `.weather-timeline-now-column` is applied conditionally, following the exact same
  `nowBoundaryIndex !== null` check the existing `.weather-timeline-now` line already uses — when
  there's no forecast boundary, no cell gets this class, consistent with today's line behavior.
