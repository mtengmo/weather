---

description: "Task list for 015-overview-3day-resolution-fix"
---

# Tasks: Overview Resolution Split and High/Low Fix

**Input**: Design documents from `/specs/015-overview-3day-resolution-fix/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in the spec, but included per this repo's established convention (every prior feature paired implementation tasks with unit/integration test tasks in the same phase).

**Organization**: Tasks are grouped by user story (spec.md: all three are P1 — US1/US2 are two halves of one un-mixing refactor, US3 is a regression guard through that same refactor).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Paths are relative to the repo root (`c:\GitRepos\weather`)

---

## Phase 1: Setup

- [X] T001 Run `npm test` and `npm run build` to confirm a clean baseline before starting

---

## Phase 2: Foundational

- [X] T002 In `src/services/dailyAggregation.ts`, remove `toSubDayAndDailyBuckets` in full and add `toSubDayBuckets(observations, dayCount)` per `contracts/overview-resolution-split.md` §`dailyAggregation.ts` — reuses `SUB_DAY_PERIODS`, `aggregateBucket`, `subDayBucketsForDate`, and `bucketIndexOf` unchanged; a day beyond how far the forecast reaches is omitted, never fabricated

**Checkpoint**: Both US1 and US2 depend on this file's new shape — must land before either proceeds. `toDailyAggregates` itself is untouched throughout.

---

## Phase 3: User Story 1 - The 7-day Overview shows one consistent resolution (Priority: P1)

**Goal**: The 7-day Overview reverts to exactly one column per day, no sub-day columns mixed in.

**Independent Test**: Open the 7-day Overview; confirm every column is a full-day (weekday-labeled) column.

- [X] T003 [US1] In `src/components/timelineData.ts`, revert `buildDailyTimelineData` to call `toDailyAggregates(series.observations, DAILY_BUCKET_COUNT)` directly (replacing the `toSubDayAndDailyBuckets` call and its import) — everything else in the function (period/source mapping, `high`/`low`) is unchanged (depends on T002)
- [X] T004 [P] [US1] In `tests/unit/dailyAggregation.test.ts`, remove the `toSubDayAndDailyBuckets` describe block (the function no longer exists); confirm `toDailyAggregates`'s own existing tests are untouched and still pass
- [X] T005 [P] [US1] In `tests/unit/timelineData.test.ts`, replace the `buildDailyTimelineData` "sub-day periods" describe block with a test asserting every period's label is a weekday abbreviation (never a sub-day period name) for the reverted 7-day builder (depends on T003)
- [X] T006 [US1] In `tests/integration/weatherIconOverview.test.tsx`, update the "US2: synchronized 7-day timeline" tests so none assert sub-day labels; add a case asserting no `.weather-timeline-cell` text matches Morning/Lunch/Afternoon/Evening/Night on the 7-day view (depends on T003)

**Checkpoint**: The 7-day Overview is back to uniform daily resolution — independently shippable even before User Story 2 exists.

---

## Phase 4: User Story 2 - A dedicated 3-day view offers sub-day detail (Priority: P1)

**Goal**: A new "Last 3 days" Overview option shows sub-day columns (morning/lunch/afternoon/evening/night) for all 3 days, at one consistent resolution, without triggering any new fetch.

**Independent Test**: Open the new 3-day view; confirm every column is a sub-day column, for up to 3 days of actual data; confirm no additional fetch fires versus the existing 24h/7d views.

- [X] T007 [US2] In `src/components/timelineData.ts`, add `build3DayTimelineData(series, unit)` using `toSubDayBuckets(series.observations, 3)`, mirroring `buildDailyTimelineData`'s period/source mapping (including `high`/`low`) exactly, per `contracts/overview-resolution-split.md` (depends on T002)
- [X] T008 [US2] In `src/components/WeatherIconOverview.tsx`, introduce the `OverviewDisplayMode` type and local `displayMode` state, add the "Last 3 days" button to `OVERVIEW_WINDOWS`, add `selectDisplayMode` (mapping "Last 3 days"/"Last 7 days" both to `onWindowChange("last-7-days")`), switch the `timeline` computation across all three modes, extend the `weather-timeline-fill` class to any non-24h mode, and add `displayMode` to the centering effect's dependency array — per `contracts/overview-resolution-split.md` §`WeatherIconOverview.tsx` (depends on T003, T007)
- [X] T009 [P] [US2] In `tests/unit/dailyAggregation.test.ts`, add `toSubDayBuckets` tests: exactly 5 buckets for 1 available day, 10 for 2, 15 for 3; clamped to `1 + forwardBucketCount` days when forecast doesn't reach 3 days out; never returns 0 buckets (today always renders)
- [X] T010 [P] [US2] In `tests/unit/timelineData.test.ts`, add `build3DayTimelineData` tests: every period has a sub-day label, `high`/`low` populated on the temperature row, and no more than 15 periods ever returned
- [X] T011 [US2] In `tests/integration/weatherIconOverview.test.tsx`, add tests for the "Last 3 days" button: switching to it renders sub-day columns; switching between "Last 3 days" and "Last 7 days" does not call `getObservations` again (same `last-7-days` window already fetched); switching to "Last 24 hours" and back preserves existing 24h behavior (depends on T008)

**Checkpoint**: All three Overview windows (24h/3-day/7-day) work independently, each at one consistent resolution.

---

## Phase 5: User Story 3 - High/Low toggle correctly reflects each day's high and low (Priority: P1)

**Goal**: Lock in (with tests) that High/Low continues to work correctly through the resolution-split refactor above — on the reverted 7-day view and the new 3-day view — and confirm it's still correctly absent on the 24-hour view and when the toggle is off.

**Independent Test**: Turn on High/Low; confirm every day (7-day view) and sub-day period (3-day view) with temperature data shows `"<avg>° (<high>°/<low>°)"`; confirm the 24-hour view and toggle-off state are unaffected.

- [X] T012 [P] [US3] In `tests/unit/timelineData.test.ts`, add a `build3DayTimelineData` high/low test mirroring the existing `buildDailyTimelineData` one — asserting a sub-day period's `high`/`low` come from that period's own observations, not the whole day's (depends on T007)
- [X] T013 [P] [US3] In `tests/integration/weatherIconOverview.test.tsx`, add High/Low regression tests per `contracts/highlow-regression.md`: toggle on shows high/low on the 7-day view (post-revert) and the 3-day view; toggle on shows plain values on the 24-hour view; toggle off shows plain values on both the 7-day and 3-day views (depends on T006, T008)

**Checkpoint**: High/Low is verified working (not just assumed) across every Overview resolution this feature touches.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T014 [P] Run the manual validation scenarios in `specs/015-overview-3day-resolution-fix/quickstart.md` (desktop + mobile) via Playwright, covering all 3 user stories, and confirm no extra network requests fire when switching between "Last 3 days" and "Last 7 days"
- [X] T015 Run `npm test` (full suite) and `npm run build`; fix any regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: T002 blocks both US1 (T003) and US2 (T007) — `dailyAggregation.ts` must land its new shape before either timeline builder can be updated
- **User Stories (Phase 3-5)**: US1 can ship alone once Foundational lands. US2 depends on US1's T003 (same file, `timelineData.ts`) landing first to avoid a merge conflict within the same session, and on T002. US3 depends on both US1 and US2's tasks being complete (it only adds tests over the finished behavior).
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### Within Each User Story

- `dailyAggregation.ts`/`timelineData.ts` changes before the `WeatherIconOverview.tsx` changes that consume them.
- Implementation before its own tests (tests can be written alongside; TDD not required since not explicitly requested).

### Parallel Opportunities

- T004 and T005 (US1) touch different files and can run in parallel once T003 lands.
- T009 and T010 (US2) touch different files and can run in parallel once T007 lands.
- T012 and T013 (US3) touch different files and can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 → validate independently — the 7-day Overview no longer mixes resolutions, even before the 3-day view exists
4. **STOP and VALIDATE**: deploy/demo if ready

### Incremental Delivery

1. Setup → Foundational → US1 (MVP: un-mixed 7-day view)
2. US2 (new 3-day view, reusing the same fetch)
3. US3 (regression-guard tests over both)
4. Each story adds value without breaking previously-shipped stories

---

## Notes

- [P] tasks touch different files with no dependency on an incomplete task
- [Story] label maps each task to its user story for traceability
- Commit after each story's checkpoint, consistent with this session's established "commit and push after every /speckit-implement" preference
