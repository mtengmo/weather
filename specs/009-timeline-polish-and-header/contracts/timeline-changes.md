# Contract: Timeline Row/Rendering Changes

## `src/components/timelineData.ts`

- `buildRows` (shared by hourly/daily builders): remove the `cloud` and `feelsLike` `TimelineRow`
  construction blocks entirely; remove the standalone `gust` `TimelineRow` construction block and
  instead set `gust: convertWindSpeed(s.windGust ?? null, unit)` on each `wind` row point
  alongside the existing `direction` field.
- `TimelineData` interface: drop `cloud`, `feelsLike`, `gust` fields.
- `buildHourlyTimelineData`: change the `label` computation to use a fixed 24-hour format
  (data-model.md). After building rows, for each row that still has a numeric `value` type
  (temperature, precipitation, wind, snow), if `nowBoundaryIndex !== null` and
  `row.points[nowBoundaryIndex + 1].value === null`, attempt the single-column interpolation
  described in research.md §3 and set both `value` and `interpolated: true` on that point when
  eligible.
- `buildDailyTimelineData`: no interpolation logic added (research.md §3's Edge Case).

## `src/components/WeatherIconOverview.tsx`

- Remove the `<LineRow row={timeline.cloud} .../>` and `<LineRow row={timeline.feelsLike} .../>`
  call sites (and the now-unused `cloud`/`feelsLike` references).
- `WindRow`: format each point as `${Math.round(point.value)} (${Math.round(point.gust)}) ${unit}`
  when `point.gust != null`, else `${Math.round(point.value)} ${unit}` — both cases whole numbers,
  no decimals (FR-008/FR-009). This replaces `formatRowValue`'s call for the wind row specifically
  (temperature/precipitation/etc. keep their existing per-row decimal rules unchanged).
- Any row point with `interpolated: true` renders with a distinct visual treatment (e.g. an
  `interpolated-row-value` class, similar in spirit to the existing `weather-timeline-gap`/
  `weather-timeline-cell-forecast` conventions) so it reads as "estimated," not measured/forecast.

## `src/App.tsx`

- Header: `<h1>Weather History</h1>` removed (or shrunk per Assumptions); `<PlaceSearch>` and
  `<FavoritesList>` JSX moved from their current position (below the graph/timeline views) into
  `<header className="app-header">`, alongside the existing `<div className="header-controls">`.
- New mount-time cache-restore effect (contracts/location-cache.md), gated to run once and only
  set `selected` when it's still `null` at that point (so it doesn't fight the existing
  `currentLocation`-sync effect if that one somehow runs first).
- `selectLocation`: gains one line calling `setCachedLocation`.

## No changes to

- `src/services/dailyAggregation.ts` — daily aggregation itself is untouched; `windGustHigh` still
  feeds the daily `wind` row's `gust` field the same way the hourly builder reads `obs.windGust`.
- `src/services/weatherCondition.ts`, `src/services/feelsLike.ts`, `src/services/sunMoon.ts` — the
  feels-like *derivation* service function itself is untouched (still used by `dailyAggregation.ts`
  for `feelsLikeAverage`, which simply becomes unused by the timeline's rendering layer — left in
  place rather than deleted, since removing a public service function is out of scope for a UI
  simplification and could break future features that want it back).
