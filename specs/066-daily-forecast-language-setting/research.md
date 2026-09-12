# Phase 0 Research: Daytime-Weighted Daily Forecast & Manual Language Setting

## §1 — Where the daily-condition bug actually lives

**Decision**: Fix only `WeeklyForecastStrip.tsx`'s condition derivation (and the `dailyAggregation.ts`
aggregation it consumes). No other view needs changing.

**Rationale**: Investigated every consumer of a "whole day" condition/icon:
- `WeeklyForecastStrip.tsx:24-31` derives one `deriveWeatherCondition(...)` call per day from
  `DailyAggregate` fields (`average`, `totalPrecipitation`, `windAverage`, `cloudAverage`,
  `chanceOfRainMax`) — all computed by `aggregateBucket()` over the *entire* rolling 24-hour
  bucket. This is the only place a single icon represents an entire day, and the only place the
  reported bug can occur.
- `WeatherIconOverview.tsx`'s 3-day/7-day view renders 5 independent sub-day periods per day
  (`toSubDayBuckets`/`SUB_DAY_PERIODS` in `dailyAggregation.ts:113-119`), each with its own
  `deriveWeatherCondition` call and icon — an early-morning shower already only affects that one
  sub-day period's icon there, not the whole day. Unaffected by design.
- `ObservationChart.tsx`/`ObservationDetails.tsx`/`chartData.ts` never render a single per-day
  condition icon — they plot numeric series (temperature/rain/wind/cloud) per bucket, not a
  derived "condition."

**Alternatives considered**: Changing `deriveWeatherCondition`'s own priority/threshold logic —
rejected because that function is shared by every hourly, sub-day, and whole-day caller; changing
its behavior would also alter the (already-correct) hourly and sub-day condition selection, which
is out of scope and risks regressing 40+ existing tests that assert specific hourly conditions.

## §2 — Bucket timing: rolling 24h, not calendar-midnight-aligned

**Finding**: `toDailyAggregates`'s buckets are *not* midnight-to-midnight. `bucketIndexOf` computes
`floor((now - obsTimestamp) / 24h)` — bucket boundaries fall at today's current wall-clock time
each day (e.g. if it's 14:32 now, "tomorrow" spans 14:32 today→14:32 tomorrow). This matters
because the fix can't simply say "this day's 6am-8pm span": it must filter *within whatever
observations already fall in that bucket* down to the ones whose own local hour is in the daytime
range, independent of the bucket's rolling start/end.

**Decision**: Add a bucket-level local-hour filter (`hour >= 6 && hour < 20`, matching `isNight`'s
`NIGHT_END_HOUR`/`NIGHT_START_HOUR` values in `src/services/weatherCondition.ts:65-72`) applied to
a bucket's observations *before* computing the subset of `DailyAggregate` fields that feed
`deriveWeatherCondition`, reusing the existing `aggregateBucket()` math on that filtered subset
rather than writing new aggregation logic.

**Rationale**: Reusing `aggregateBucket()` on a pre-filtered observation array keeps the two code
paths (whole-day vs. daytime-only) mathematically identical except for their input set — no risk
of the two ever silently diverging in how they compute a mean/max/sum.

## §3 — Additive vs. replacing `DailyAggregate` fields

**Decision**: Add new optional fields to `DailyAggregate` (`daytimeAverage`,
`daytimeTotalPrecipitation`, `daytimeWindAverage`, `daytimeCloudAverage`, `daytimeChanceOfRainMax`)
computed alongside the existing whole-bucket fields in `toDailyAggregates`, rather than changing
what the existing fields mean.

**Rationale**: `DailyAggregate` is consumed by `ObservationChart.tsx`, `ObservationDetails.tsx`,
`WeatherIconOverview.tsx`, and `chartData.ts` for high/low/average temperature display, rain-total
bars, and other purposes that correctly *should* reflect the whole day (e.g. "today's high" must
still account for a hot afternoon even if the icon-driving logic ignores an overnight cold snap).
Only `WeeklyForecastStrip.tsx`'s condition-derivation call site switches to the new daytime
fields; every other consumer is untouched, satisfying the plan's "additive, not replacing"
constraint.

**Alternatives considered**: A separate `getDaytimeCondition(bucket)` helper operating directly on
raw observations rather than `DailyAggregate` — rejected because `WeeklyForecastStrip` only
receives already-aggregated `DailyAggregate[]` as a prop (from `WeatherIconOverview.tsx`), not raw
observations, so the daytime aggregation has to happen inside `toDailyAggregates` itself to reach
the strip at all.

## §4 — Fallback when a bucket has no daytime observations

**Decision**: If every new `daytime*` field on a bucket is `null` (no observation in that bucket
falls in the 6am-8pm window at all — e.g. a bucket built from very sparse forecast data),
`WeeklyForecastStrip` falls back to that day's existing whole-bucket fields for condition
derivation, exactly matching today's behavior. This satisfies the spec's Edge Case ("a day with
too little forecast data... falls back to today's existing whole-day aggregation behavior").

**Rationale**: Guarantees a day never renders with no icon at all just because this feature was
added; matches the project's existing "never fabricate, but never leave a gap either" convention
(e.g. `sumCalendarDayPrecipitation`'s own null-vs-fallback handling).

## §5 — Language setting: reusing the existing preference pattern

**Decision**: New `src/services/language.ts` (localStorage get/set, same shape as
`src/services/theme.ts`) + new `src/hooks/useLanguagePreference.ts` (same shape as
`useThemePreference.ts`) + new `src/components/LanguageToggle.tsx` (a labeled `<select>` with
Automatic/English/Svenska, added into `SettingsMenu.tsx` alongside the existing Unit and High/Low
toggles).

**Rationale**: Every other display preference in this app (theme, units, high/low visibility,
nearby-station count) already follows this exact three-piece pattern (service + hook + control
rendered in `SettingsMenu`/header). Reusing it keeps the new setting indistinguishable in shape
from the rest of the app's settings, and it's already proven to work with this app's
no-backend/localStorage-only architecture.

**Alternatives considered**: A two-option toggle (English/Swedish only, like `ThemeToggle`'s
binary light/dark switch) — rejected per spec's FR-005/FR-008, which require a default
"Automatic" mode so existing users' auto-detected experience is preserved unless they actively
choose otherwise; a binary toggle has no way to represent "automatic."

## §6 — Wiring the preference to i18next

**Decision**: `useLanguagePreference`'s effect calls `i18n.changeLanguage(preference === "auto" ?
detectLanguage() : preference)` whenever the stored preference changes 064-swedish-translation's
`src/i18n/index.ts` already exports `detectLanguage()` (added for that feature's own tests), so no
new detection logic is needed — this hook just decides *when* to call it (on mount, and on every
explicit user selection) versus using the fixed choice.

**Rationale**: `i18next.changeLanguage()` triggers `react-i18next`'s `useTranslation()` re-render
across the whole app automatically (it's the same mechanism 064-swedish-translation's own test,
`tests/integration/swedishTranslation.test.tsx`, already exercises) — no manual re-render plumbing
needed, and no page reload.
