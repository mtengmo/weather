# Phase 0 Research: Fix the Same Brief-Rain Bug on the 7-Day Forecast Graph

## §1 — Root cause: the same bug in a second, shared code path

**Finding**: `src/components/timelineData.ts`'s `daysToTimelineData` (`timelineData.ts:367-396`)
is shared by `buildDailyTimelineData` (7-day view) and `build3DayTimelineData` (3-day view,
`timelineData.ts:434-450`ish). Its `condition` field is derived directly from
`day.totalPrecipitation`/`day.chanceOfRainMax` — the whole-bucket, un-weighted fields — with no
awareness of the `daytime*` fields 066/067 added to `DailyAggregate`. For the 3-day view this is
harmless (each `day` is already a narrow sub-day period from `toSubDayBuckets`, which never
populates `daytime*` fields at all). For the 7-day view, each `day` is a whole rolling-24h bucket
from `toDailyAggregates`, which *does* populate them — but `daysToTimelineData` never reads them.

**Decision**: This is the same bug class as `WeeklyForecastStrip.tsx`'s pre-067 behavior, in a
different consumer of the same `DailyAggregate` data. Fix it the same way: use the daytime-weighted
fields when present, falling back to the whole-bucket fields when absent (066's fallback) or not
meaningful (067's majority-or-heavy rule).

## §2 — Extracting a shared function instead of duplicating the logic a second time

**Finding**: `WeeklyForecastStrip.tsx` currently inlines the full daytime-weighting logic (the
`hasDaytimeData` check, the `dayRainIsMeaningful` majority-or-heavy check, and the resulting
`deriveWeatherCondition` call) directly in its render loop. Copy-pasting this into
`daysToTimelineData` would create the exact structural risk that let this bug happen in the first
place: two call sites independently encoding the same rule, free to drift apart the next time
either one is touched.

**Decision**: Extract the whole block into a new exported function,
`deriveDailyCondition(day: DailyAggregate): WeatherCondition | null`, in
`src/services/weatherCondition.ts` (alongside `deriveWeatherCondition` and the
`PRECIPITATION_HEAVY_THRESHOLD_MM` constant it depends on — no new cross-module dependency,
since `DailyAggregate` is imported as a type-only import). `WeeklyForecastStrip.tsx` is refactored
to call it (no behavior change — verified by its existing test suite passing unchanged) and
`daysToTimelineData` calls the same function for its `condition` field.

**Rationale**: A single function is the only way to guarantee `FR-004`
("the daily brief strip and the 7-day overview MUST agree ... for the same underlying forecast
data") — agreement by construction (same code path) rather than by two independently-maintained
implementations happening to match.

**Alternatives considered**: Leaving the logic in `WeeklyForecastStrip.tsx` and having
`timelineData.ts` import and call a function exported from that component file — rejected as an
unusual dependency direction (a data-layer module, `timelineData.ts`, importing from a UI
component); `weatherCondition.ts` is a `services/` module already responsible for condition
derivation, making it the natural home.

## §3 — Confirming the 3-day view is unaffected

**Finding**: `toSubDayBuckets` (`src/services/dailyAggregation.ts`) never sets any `daytime*`
field on the `DailyAggregate` objects it produces — only `toDailyAggregates` does. Since
`deriveDailyCondition`'s `hasDaytimeData` check is `false` whenever every `daytime*` field is
`null`/`undefined`, calling the new shared function from `daysToTimelineData` for 3-day/sub-day
`day` objects takes the exact same fallback path (whole-bucket fields) as before — byte-identical
output to today's `deriveWeatherCondition` call with `day.totalPrecipitation`/etc., satisfying
SC-004 by construction rather than by a special case.

## §4 — `isSnowy` computation in `daysToTimelineData`'s `sources` mapping

**Finding**: `daysToTimelineData` also calls `deriveWeatherCondition` a second time
(`timelineData.ts:409-414`) purely to compute `isSnowyCondition(...)` for line-dash styling — this
is unrelated to the rain-icon bug the user reported and out of spec scope (FR-002/FR-003 restrict
this fix to the per-day condition/icon).

**Decision**: Leave this second call site untouched — it doesn't display a condition/icon to the
user, only affects a line's dash pattern, and the spec's Acceptance Scenarios don't describe any
snow-related symptom.
