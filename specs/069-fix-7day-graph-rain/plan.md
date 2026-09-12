# Implementation Plan: Fix the Same Brief-Rain Bug on the 7-Day Forecast Graph

**Branch**: `069-fix-7day-graph-rain` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/069-fix-7day-graph-rain/spec.md`

## Summary

`src/components/timelineData.ts`'s `daysToTimelineData` (shared by both the 3-day sub-day view and
the 7-day whole-day view) derives each period's condition from the whole-bucket, un-weighted
`totalPrecipitation`/`chanceOfRainMax` fields — for the 7-day view, this reproduces the exact bug
066/067 already fixed in `WeeklyForecastStrip.tsx`, since 7-day buckets are whole calendar days.
Fix: extract the daytime-weighting logic `WeeklyForecastStrip.tsx` already has into a single
shared function, and call it from both `WeeklyForecastStrip.tsx` and `daysToTimelineData`. The
3-day view is unaffected automatically — its sub-day `DailyAggregate` entries never have the
`daytime*` fields populated (only `toDailyAggregates`' whole-day buckets compute them), so the
shared function's existing "no daytime data" fallback naturally leaves 3-day behavior untouched.

## Technical Context

**Language/Version**: TypeScript 5 / React 18, no version change

**Primary Dependencies**: None new — reuses `deriveWeatherCondition` and the already-exported
`PRECIPITATION_HEAVY_THRESHOLD_MM` (`src/services/weatherCondition.ts`)

**Storage**: N/A

**Testing**: Vitest + React Testing Library — extend `tests/integration/weatherIconOverview.test.tsx`
with a 7-day-view equivalent of the existing daily-brief-strip Uppsala-shaped scenarios; no new
unit tests needed for the underlying aggregation (already covered by 067's
`tests/unit/dailyAggregation.test.ts`, since this feature reuses that data, not changes it)

**Target Platform**: Web (existing PWA), no platform change

**Project Type**: Single-project web app

**Performance Goals**: N/A — pure client-side derived-data change

**Constraints**: Must not change the 3-day view's rendered output for identical input (SC-004);
must not duplicate the daytime-weighting logic a second time (risking the two call sites silently
drifting apart the way this very bug arose from the fix only being applied in one place).

**Scale/Scope**: Extract one function, update two call sites (one already correct, refactored to
call the shared function instead of inlining the logic; one newly fixed).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no gates to evaluate. N/A.

## Project Structure

### Documentation (this feature)

```text
specs/069-fix-7day-graph-rain/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── services/
│   └── weatherCondition.ts          # new: deriveDailyCondition(day) — the shared, extracted logic
├── components/
│   ├── WeeklyForecastStrip.tsx      # refactored to call the shared function (behavior unchanged)
│   └── timelineData.ts              # daysToTimelineData: call the shared function instead of
│                                     # inlining deriveWeatherCondition with un-weighted fields

tests/
└── integration/
    └── weatherIconOverview.test.tsx  # new 7-day-view Uppsala-shaped assertions
```

**Structure Decision**: Single existing project — no new directories.

## Complexity Tracking

*No constitution violations — table not needed.*
