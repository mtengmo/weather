# Research: Calendar-Day Rain Total on the Today Card

## §1 — Where "today" currently comes from, and why it can't be reused as-is

**Decision**: Confirmed by code inspection — `WeatherIconOverview.tsx`'s `today` is
`weeklyDays[todayIndex]`, where `todayIndex` is the first forecast-tagged entry in
`toDailyAggregates(weeklySeries.observations, 7)` — i.e. the rolling `(now, now+24h]` bucket
(023-fix-today-summary). `today.totalPrecipitation` sums every observation whose timestamp falls
in that rolling window, which — depending on the current time of day — can include several hours
of tomorrow. This is exactly the behavior the user flagged.

**Decision**: Rather than change `today`'s own bucket boundaries (which would also shift
condition/high/low, explicitly out of scope per FR-004), add one small, separate calculation that
sums precipitation over `[localMidnightStart, localMidnightEnd)` directly from
`weeklySeries.observations` — the same array `today` is already derived from, so no new fetch or
data source is needed.

**Rationale**: `weeklySeries.observations` already contains both already-elapsed (observed) and
upcoming (forecast) hours spanning well past today, since it's a 7-day series — everything needed
to sum "today" by the calendar-day definition is already present client-side.

## §2 — Local calendar-day boundaries

**Decision**: `localMidnightStart = new Date(); .setHours(0,0,0,0)` (JS's own idiomatic
local-midnight-of-today expression, already used elsewhere in this codebase, e.g.
`dailyAggregation.ts`'s `dayStart.setHours(0, 0, 0, 0)` in `subDayBucketsForDate`).
`localMidnightEnd = localMidnightStart + 24h`. An observation is included when
`localMidnightStart <= Date.parse(obs.timestamp) < localMidnightEnd`.

**Rationale**: Reuses an idiom already established in this exact codebase for "local midnight,"
rather than introducing a new date-math approach — `Date`'s `setHours(0,0,0,0)` already resolves
in the browser's local timezone, matching the spec's "user's own device timezone" assumption.

## §3 — Missing-data handling

**Decision**: The new sum reuses the same `null`-filtering convention `aggregateBucket` already
uses (`nonNull` in `dailyAggregation.ts`) — precipitation readings that are `null` are excluded
from the sum rather than treated as zero; if there are zero non-null readings for the whole
calendar day, the result is `null` (rendering identically to today's existing "no data" case),
not a fabricated `0`.

**Rationale**: Matches the Edge Cases section's explicit requirement ("does not fabricate a value
for hours with no data") and this codebase's own established never-fabricate convention.

## §4 — Where the new helper lives

**Decision**: A new exported function in `src/services/dailyAggregation.ts` (already the home for
every other bucket-summing helper — `aggregateBucket`, `toDailyAggregates`, `toSubDayBuckets`),
named `sumCalendarDayPrecipitation(observations: WeatherObservation[], reference: Date): number |
null`, taking an explicit reference date/time (defaults to `new Date()` at the call site) so it's
independently unit-testable without mocking the system clock.

**Rationale**: Keeps all bucket/date-range aggregation logic in one existing module rather than
scattering date math into a component file.
