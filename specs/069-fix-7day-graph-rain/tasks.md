# Tasks: Fix the Same Brief-Rain Bug on the 7-Day Forecast Graph

**Input**: Design documents from `specs/069-fix-7day-graph-rain/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included, per this project's established convention.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npx tsc -b` pass before starting.

---

## Phase 2: User Story 1 - The 7-day overview's daily icons stop overstating brief rain (Priority: P1) 🎯 MVP

**Goal**: The 7-day overview's per-day condition/icon uses the same daytime-weighted rule the
daily brief strip already uses, via one shared function so the two can never drift apart again.

**Independent Test**: Construct a 7-day-window day with rain confined to a couple of morning hours
and dry the rest of the daytime span; confirm the 7-day overview now shows dry for that day,
matching the daily brief strip. Confirm the 3-day view's output is unchanged.

### Tests for User Story 1

- [X] T002 [US1] Add integration test assertions to `tests/integration/weatherIconOverview.test.tsx`:
      switching to the 7-day display mode with a day whose rain is confined to a couple of morning
      hours (dry the rest of the daytime span) shows a dry condition/icon for that day; a day with
      rain across most daytime hours, or a single brief-but-heavy daytime hour, still shows rain in
      the 7-day view; the 3-day display mode's existing rendered output for the same input data is
      unchanged (a regression check against the tests already covering the 3-day view).

### Implementation for User Story 1

- [X] T003 [US1] In `src/services/weatherCondition.ts`, add
      `export function deriveDailyCondition(day: DailyAggregate): WeatherCondition | null`,
      extracting the exact `hasDaytimeData`/`dayRainIsMeaningful`/`deriveWeatherCondition` block
      currently inlined in `WeeklyForecastStrip.tsx` (data-model.md) — a type-only import of
      `DailyAggregate` from `../models/types`, no new runtime dependency.
- [X] T004 [US1] Refactor `src/components/WeeklyForecastStrip.tsx` to call
      `deriveDailyCondition(day)` instead of its inlined block — behavior-preserving; its existing
      066/067 tests must continue to pass unmodified (this is the regression guard for the
      extraction itself).
- [X] T005 [US1] In `src/components/timelineData.ts`'s `daysToTimelineData`, replace the
      `periods[].condition` field's direct `deriveWeatherCondition(...)` call (using un-weighted
      `day.totalPrecipitation`/`day.chanceOfRainMax`) with a call to `deriveDailyCondition(day)`
      (research.md §1-§3) — the second `deriveWeatherCondition` call in the same function (for
      `isSnowy` line styling) is left unchanged (research.md §4, out of scope).

**Checkpoint**: User Story 1 is fully functional and independently testable/verifiable via
quickstart.md.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [X] T006 [P] Run `npm run lint`.
- [X] T007 [P] Run `npx tsc -b`.
- [X] T008 Run `npm test` (full suite) — doubles as confirmation that the `WeeklyForecastStrip`
      extraction (T004) and the 3-day view (T005's fallback path) are both unchanged.
- [X] T009 Run `npm run build`.
- [X] T010 Bump `package.json` version (patch — a scoped bug fix).
- [X] T011 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).

---

## Dependencies & Execution Order

- Setup (T001) has no dependencies.
- T002 (tests) before T003-T005 (implementation).
- T003 before T004 before T005 (each depends on the previous step existing).
- Polish depends on User Story 1 being complete.

## Implementation Strategy

Extract first (T003), verify the extraction is behavior-preserving by refactoring
`WeeklyForecastStrip.tsx` to use it (T004) and confirming its existing tests still pass unmodified,
then wire up the new caller (T005). This order catches any subtle behavior change from the
extraction itself before it's ever exposed to the 7-day view.
