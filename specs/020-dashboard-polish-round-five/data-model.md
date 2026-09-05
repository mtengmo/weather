# Data Model: Dashboard Polish Round Five

## `src/services/dailyAggregation.ts`

### `subDayBucketsForDate` — closes the 00:00-06:00 gap for the first rendered day

Only the *first* rendered day (`dayOffset === 0`, i.e. "today") has no predecessor day generated
to supply a forward-reaching Night bucket into its own early morning — every other rendered day's
00:00-06:00 is already covered by the *previous* day's Night period (`[that day 21:00, next day
06:00)`). The fix widens only that first day's Morning period to start at local midnight instead
of 06:00, so its otherwise-orphaned 00:00-06:00 observations land in the existing Morning column
rather than nowhere:

```ts
function subDayBucketsForDate(
  baseDate: Date,
  observations: WeatherObservation[],
  now: number,
  isFirstDay: boolean // new parameter
): DailyAggregate[] {
  const dayStart = new Date(baseDate);
  dayStart.setHours(0, 0, 0, 0);

  return SUB_DAY_PERIODS.map(({ label, startHour, endHour, period }) => {
    const effectiveStartHour = isFirstDay && period === "morning" ? 0 : startHour;
    const startMs = dayStart.getTime() + effectiveStartHour * 3600_000;
    const endMs = dayStart.getTime() + endHour * 3600_000;
    // ...unchanged bucket-filtering and aggregateBucket(...) below...
  });
}
```

`toSubDayBuckets` passes `isFirstDay: dayOffset === 0` at its single call site.

### Validation Rules

- Every hour of "today" (the first rendered day) maps to exactly one of its 5 periods — no gap.
- Every other rendered day's period boundaries are unchanged from today's (pre-fix) behavior —
  the fix is scoped to the first day only, since every later day's 00:00-06:00 is already
  correctly covered by its predecessor's Night period.
- `SUB_DAY_PERIODS`' 5-entries-per-day invariant is preserved — no 6th period is added, so
  existing index-based logic (e.g. the day-boundary marker's `i % 5 === 0`) is unaffected.

## `src/components/timelineData.ts` / `src/components/WeatherIconOverview.tsx`

### "Now" line and day-boundary line positioning — `calc()` instead of a bare percentage

```tsx
// Before:
style={{ left: `${nowLeftPercent}%` }}
// After:
style={{ left: `calc(7rem + (100% - 7rem) * ${nowLeftPercent / 100})` }}
```

Applied to both `.weather-timeline-now`'s and `.weather-timeline-day-boundary`'s inline `left`
style. `7rem` matches `.weather-timeline-row-title`'s fixed width (`src/index.css`) — the same
literal-value convention that file's own comment already documents ("a shared
`--timeline-label-width` custom property is an easy follow-up").

## `src/App.tsx` — consolidated navigation

### New/changed header-actions logic

```tsx
{view === "map" ? (
  <button type="button" onClick={closeMap}>Back</button>
) : view === "overview" ? (
  <button type="button" onClick={() => setView("graph")}>Details</button>
) : view === "graph" ? (
  <>
    <button type="button" onClick={() => setView("details")}>Details</button>
    <button type="button" onClick={() => setView("overview")}>Back</button>
  </>
) : (
  // view === "details"
  <button type="button" onClick={() => setView("overview")}>Back</button>
)}
```

(Existing `Map`/`Back`-toggle and `DisplayMenu`/`NearbyStationCountControl` siblings unchanged —
only the Details/graph-related buttons in this same `header-actions` block change.)

## `src/components/ObservationChart.tsx`, `src/components/ObservationDetails.tsx`

### Local headings — visually hidden, no local nav buttons

Both components' `onViewDetails`/`onViewOverview`/`onBack` props are removed (navigation now
lives entirely in `App.tsx`); their own `<h2>` becomes `<h2 ref={headingRef} tabIndex={-1}
className="visually-hidden">`, matching `WeatherIconOverview.tsx`'s existing pattern exactly.
Their local "View details"/"Overview"/"Back to graph" buttons are deleted.

## `src/components/ObservationDetails.tsx` — Condition column

### New table column (24-hour window only, matching the table's existing scope)

```tsx
<th>Condition</th>
```

```tsx
<td>
  {(() => {
    const condition = deriveWeatherCondition({
      temperature: obs.temperature,
      precipitation: obs.precipitation,
      windSpeed: obs.windSpeed,
      cloudCoverPercent: obs.cloudCoverPercent,
      timestamp: obs.timestamp,
    });
    const iconInfo = condition !== null ? WEATHER_ICONS[condition] : null;
    return iconInfo ? <iconInfo.Icon aria-hidden="true" size={28} /> : <span aria-hidden="true">—</span>;
  })()}
</td>
```

(Same `deriveWeatherCondition`/`WEATHER_ICONS`/28px pairing `ConditionRow` already uses, for
visual consistency with the Overview per FR-010.)

## `src/components/WeatherIconOverview.tsx` — `weeklyDays` for the strip, re-capped

```ts
/** A strict 7-entry window anchored on "today," extending forward first (today + up to 6
 *  forecast days); only backfills from observed history if forward reach is shorter than 6 days
 *  (020-dashboard-polish-round-five, research.md §5 — distinct from buildDailyTimelineData's own
 *  forecast-reach-only cap, which stays unchanged for the main 7-day timeline). */
function windowAroundToday(days: DailyAggregate[], count: number): DailyAggregate[] {
  const firstForecastIndex = days.findIndex((d) => d.isForecast === true);
  const todayIndex = firstForecastIndex === -1 ? days.length - 1 : firstForecastIndex - 1;
  if (todayIndex < 0) return days.slice(-count);
  const end = Math.min(days.length, todayIndex + count);
  const start = Math.max(0, end - count);
  return days.slice(start, end);
}
```

```ts
const weeklyDays: DailyAggregate[] = windowAroundToday(
  weeklySeries !== null && weeklySeries.status === "ready"
    ? toDailyAggregates(weeklySeries.observations, 7)
    : [],
  7
);
```

(This is the exact "anchor around today" helper 019's research.md considered and rejected *for
the main timeline* to avoid disturbing its Observed/Forecast section design — the weekly strip has
no such design to protect, so it fits here.)

## `src/services/format.ts` — `dataSourceDisclosure` rewording

```ts
export function dataSourceDisclosure(
  series: { primarySource?: "smhi" | "open-meteo"; forecastFromFallbackSource?: boolean; forecastIssuedAt?: string | null },
  lastUpdated: string | null
): string | null {
  if (series.primarySource === undefined) return null;
  const observedLabel = series.primarySource === "smhi" ? "SMHI observations" : "Open-Meteo observations";
  const freshnessTime = series.forecastIssuedAt ?? lastUpdated;
  const freshness = freshnessTime
    ? ` · Forecast updated ${new Date(freshnessTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "";
  return `${observedLabel}${freshness}`;
}
```

(Drops the per-mode "SMHI forecast"/"Open-Meteo forecast" naming — now always a blended reading
when both sources have data — in favor of the observation source plus one freshness time,
per FR-009 and research.md §6.)

## Removed

- `src/components/ForecastSourcesControl.tsx`
- `src/hooks/useCombineForecastSourcesPreference.ts`
- `src/services/combineForecastPreference.ts`
- The `combineForecastSources` prop from `useObservationData`, `ObservationChart`,
  `WeatherIconOverview`, and `App.tsx` — the underlying averaging behavior (`getMultiSourceForecast`,
  `mergeMultiSourceIntoTimelinePoints`) is unconditional instead.
- `ObservationChart`'s/`ObservationDetails`' `onViewDetails`/`onViewOverview`/`onBack` props and
  local nav buttons.

## Validation Rules

- The Details table's Condition column never fabricates an icon for a gap row — `iconInfo === null`
  renders the existing gap indicator (`—`), matching every other gap-vs-fabrication treatment.
- `windowAroundToday` never pads short arrays — a location with less than 7 days of combined
  data still shows fewer than 7 cards.
- "Back" always navigates to `"overview"` from every other view — no other destination exists for
  it anywhere in the app after this change.
