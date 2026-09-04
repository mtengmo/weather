# Data Model: Dashboard Visual Redesign

## `src/models/types.ts`

### `DailyAggregate` — new field

```ts
export interface DailyAggregate {
  // ...existing fields unchanged...
  /** The bucket's most recent non-null wind direction reading (degrees, 0-360), for the Today
   *  card's compass display (018-dashboard-visual-redesign, research.md §5). */
  windDirection?: number | null;
}
```

## `src/services/dailyAggregation.ts`

`aggregateBucket` gains:

```ts
const windDirections = bucket.map((o) => o.windDirection ?? null).filter((v): v is number => v !== null);
// ...in the returned object:
windDirection: windDirections.length > 0 ? windDirections[windDirections.length - 1] : null,
```

(`bucket` is already ordered oldest→newest like every observation array in this codebase, so the
last entry is the most recent reading.)

## `src/services/format.ts`

```ts
const COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** Converts a wind direction in degrees to an 8-point compass abbreviation, for the Today card
 *  (018-dashboard-visual-redesign, research.md §5). */
export function directionToCompass(degrees: number): string {
  const index = Math.round(degrees / 45) % 8;
  return COMPASS_POINTS[index];
}
```

## `src/hooks/useObservationData.ts`

```ts
export interface UseObservationDataResult {
  series: ObservationSeries | null;
  nearbyStations: NearbyStationSeries[];
  multiSourceForecast: MultiSourceForecastEntry[];
  /** Always the last-7-days series, for the persistent Today card / 7-day strip — reuses
   *  `series` when `window` is already "last-7-days" rather than double-fetching
   *  (018-dashboard-visual-redesign, research.md §4). */
  weeklySeries: ObservationSeries | null;
  /** ISO timestamp of when `series` last finished loading, for the footer's "Updated HH:MM"
   *  (018-dashboard-visual-redesign, research.md §6). */
  lastUpdated: string | null;
}
```

## `src/components/DisplayMenu.tsx` (new)

```ts
interface DisplayMenuProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  unit: UnitSystem;
  onUnitChange: (unit: UnitSystem) => void;
  highLowVisible: HighLowVisibility;
  onHighLowChange: (visible: HighLowVisibility) => void;
}
```

A dropdown-panel button (mirrors `LocationPanel`'s open/close/outside-click-dismiss pattern)
containing the existing `ThemePicker`, `UnitToggle`, and `HighLowToggle` components unchanged —
this is a container, not a reimplementation of any of the three controls.

## `src/components/ForecastSourcesControl.tsx` (new)

```ts
interface ForecastSourcesControlProps {
  combined: boolean;
  onChange: (combined: boolean) => void;
}
```

A single dropdown button labeled "Forecast sources: Automatic" or "Forecast sources: Combined,"
offering exactly those two options (research.md §1) — replaces `CombineForecastToggle` at every
call site; the `combined`/`onChange` contract is identical, so `App.tsx`'s existing
`useCombineForecastSourcesPreference()` wiring is unchanged.

## `src/components/TodaySummaryCard.tsx` (new)

```ts
interface TodaySummaryCardProps {
  today: DailyAggregate | null; // the current day's entry from toDailyAggregates(weeklySeries, 7)
  unit: UnitSystem;
  location: Pick<Location, "latitude" | "longitude">; // for sunrise/sunset
}
```

Renders: a condition icon (via `deriveWeatherCondition` + `WEATHER_ICONS`, using `today.average`
etc. the same way the daily timeline's `ConditionRow` already derives one), high/low, a short
description (the condition's own `WEATHER_ICONS[condition].label`), total rain
(`today.totalPrecipitation`), wind (`today.windAverage` + `directionToCompass(today.windDirection)`
when both are non-null), and sunrise/sunset (`getSunTimes(location, new Date())`, the same call
`SunMoonSummary` already makes). Shows the existing gap indicator (`—`) for any field that's
`null`, never a fabricated value (spec Acceptance Scenario 2).

## `src/components/WeeklyForecastStrip.tsx` (new)

```ts
interface WeeklyForecastStripProps {
  days: DailyAggregate[]; // toDailyAggregates(weeklySeries.observations, 7)'s own output, as-is
  unit: UnitSystem;
}
```

Renders one card per entry in `days` (never more than what `toDailyAggregates` itself returned —
FR-012's "never a fabricated day" is already guaranteed by that function's own
`forwardBucketCount` rule, reused unchanged), each showing a weekday label (same
`toLocaleDateString([], { weekday: "short" })` convention `daysToTimelineData` already uses), a
condition icon, and high/low.

## `src/components/WeatherIconOverview.tsx` — changed

- The local `<div className="app-header"><h2>...</h2></div>` heading block is removed (current
  location/conditions now live in `App.tsx`'s header instead — User Story 1).
- Gains a new `sectionLabels` derived value (start/width percentages for "Observed"/"Forecast,"
  research.md §2) and renders it as a new row above the existing time-label `PeriodGrid`.
- `LineRow`/`BarRow`/`WindRow` each gain an optional `subLabel?: string` prop, rendered in the
  sticky title column beneath the existing unit text.
- Mounts `<TodaySummaryCard>` and `<WeeklyForecastStrip>` unconditionally (not gated on
  `displayMode`), fed from the new `weeklySeries` prop.

### New props

```ts
interface WeatherIconOverviewProps {
  // ...existing fields unchanged...
  weeklySeries: ObservationSeries | null;
}
```

## `src/App.tsx` — changed

- Header restructured per `contracts/header-redesign.md`: a new current-conditions summary
  (location name + switcher, temperature, condition, feels-like) replaces the plain
  `ThemePicker`/`UnitToggle`/`HighLowToggle`/`CombineForecastToggle` row; those four become
  `<DisplayMenu>` + `<ForecastSourcesControl>`.
- Destructures `weeklySeries`/`lastUpdated` from `useObservationData` and passes `weeklySeries` to
  `WeatherIconOverview`, and both `series`/`lastUpdated` to `Footer`.

## `src/components/Footer.tsx` — changed

```ts
interface FooterProps {
  series: ObservationSeries | null;
  lastUpdated: string | null;
}
```

Renders the existing version/Privacy content, plus (only when `series !== null`) a data-source /
freshness line per `contracts/footer-redesign.md`.

## Validation Rules

- `sectionLabels`' "Forecast" portion is 0-width (i.e., not rendered) when `nowBoundaryIndex` is
  `null` — never an empty forecast section label with nothing under it.
- `TodaySummaryCard` never fabricates a value: every field with no underlying data renders the
  existing gap indicator, not a zero or a guess.
- `WeeklyForecastStrip` never renders more cards than `toDailyAggregates` itself returned.
- `ForecastSourcesControl`'s two options map 1:1 onto the existing boolean preference — no new
  persisted state shape.
