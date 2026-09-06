# Research: Fix Today Summary's Backward-Looking Condition

## §1 — "Today"'s bucket is backward-looking, not forward-looking (US1 / FR-001)

**Decision (confirmed via code review, already established in this spec's own root-cause
finding)**: `dailyAggregation.ts`'s `bucketIndexOf` defines bucket index 0 as the rolling window
`(now-24h, now]` — the 24 hours *ending* now, dominated by whatever already happened (including
all of yesterday evening/night). `WeatherIconOverview.tsx`'s `todayIndex` selects
`firstForecastIndex - 1`, i.e., the last non-forecast bucket — exactly bucket 0, the backward
window. Meanwhile the visible hourly 24-hour view mixes a few already-elapsed hours with mostly
upcoming (forecast) hours, which reads to a user as "today going forward" — hence the mismatch:
a cloudy previous evening can dominate the Today card's average while the actual rest of today
(shown in the hourly view) is clear.

**Fix**: Change `todayIndex` to select the *first forecast* bucket
(`weeklyDays.findIndex((d) => d.isForecast === true)`) instead of the bucket before it — this is
exactly the `(now, now+24h]` window, i.e., "the next 24 hours from now," which is what a user
reading "Today" next to today's own sunrise/sunset actually expects. The existing fallback (no
forecast at all → most recent observed bucket, `weeklyDays.length - 1`) is unchanged.

**Rationale**: A minimal, surgical fix — reuses the exact same `weeklyDays` array and
`isForecast` flag already computed; only the selection index changes. `today` is consumed solely
by `TodaySummaryCard` (confirmed via code review — no other consumer), so the blast radius is
fully contained.

**Alternatives considered**:
- Redefining `toDailyAggregates`'s bucketing to align to local calendar-day boundaries (midnight
  to midnight) instead of rolling 24h windows — rejected as a much larger, riskier change
  touching every consumer of daily buckets (the 7-day strip, the Details/graph daily views), for
  a problem that's specifically about which *one* bucket "Today" reads, not about the bucketing
  scheme itself.
- Blending backward and forward buckets for "Today" (e.g., averaging both) — rejected; the user's
  own framing ("but the 24h forecast today is sunny") makes clear the expectation is to match the
  forward-looking view, not a compromise between the two.
- Using the current hour's own single condition instead of a 24h-forward average — rejected as a
  larger behavior change (loses the "high/low for the rest of today" semantics the card already
  provides) for a fix that a bucket-index change alone already resolves.

## §2 — Edge case: no observed history at all (FR-003)

**Decision**: When `firstForecastIndex === 0` (forecast starts immediately, meaning `weeklyDays`
has no non-forecast entries at all — a rare case, e.g. right after the app loads with minimal
historical data), the fix selects `weeklyDays[0]` itself (the first forecast bucket), whereas the
old code returned `-1` (no card shown at all) in this specific sub-case. This is a strict
improvement — showing a forward-looking forecast-based summary is strictly better than hiding the
card entirely — and doesn't conflict with FR-003's requirement (that fallback applies only when
*no forecast exists anywhere in the array*, i.e., `firstForecastIndex === -1`, which is unchanged).

**Rationale**: No new edge case is introduced; an existing corner case is incidentally improved
as a side effect of the more general fix, not a separate change requiring its own justification.
