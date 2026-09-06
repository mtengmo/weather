---

description: "Task list for Fix 3-Day 'Observed' Mislabel & Add Weekday Labels"
---

# Tasks: Fix 3-Day "Observed" Mislabel & Add Weekday Labels

**Input**: Design documents from `/specs/026-fix-3-day/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested for this round; regression tests are added alongside each fix
per this session's established practice.

**Organization**: Tasks are grouped by user story (P1: US1, P2: US2), matching spec.md's
priorities.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No new project setup required — both changes touch existing files only.

---

## Phase 2: Foundational

No blocking prerequisites — US1 (`timelineData.ts` + the section-header JSX) and US2 (a new,
independent row in the same file) touch overlapping but non-conflicting parts of
`WeatherIconOverview.tsx`; US1's `boundaryIndex` change in `timelineData.ts` is fully separate.

---

## Phase 3: User Story 1 - The section label matches what's actually shown (Priority: P1) 🎯 MVP

**Goal**: Fix `boundaryIndex` to distinguish "no forecast at all" from "no observed at all," and
rework the section-header rendering to use an explicit observed-column count so it can represent
zero cleanly.

**Independent Test**: View the 3-day timeline when the visible window is entirely forecast;
confirm the header reads "Forecast," not "Observed" (per quickstart.md US1).

### Implementation for User Story 1

- [ ] T001 [US1] Change `boundaryIndex` in `src/components/timelineData.ts` from
      `idx > 0 ? idx - 1 : null` to `idx === -1 ? null : idx - 1`, per data-model.md
- [ ] T002 [US1] Replace `observedForecastSplit` in `src/components/WeatherIconOverview.tsx` with
      explicit `observedCount`/`showObservedSection`/`showForecastSection` derivations, and update
      the `.weather-timeline-sections` JSX to use them, per data-model.md
- [ ] T003 [P] [US1] Add unit tests for `boundaryIndex` in `tests/unit/timelineData.test.ts`:
      `[true, true, true]` → `-1`; `[false, false, false]` → `null`; `[false, true, true]` → `0`
      (unchanged mixed case)
- [ ] T004 [P] [US1] Add an integration test in `tests/integration/weatherIconOverview.test.tsx`
      (alongside the existing Observed/Forecast section-header tests) asserting: a 3-day timeline
      whose periods are entirely forecast renders `.weather-timeline-section-forecast` at 100%
      width and does not render `.weather-timeline-section-observed` at all
- [ ] T005 [P] [US1] Verify (and update only if needed) the existing all-observed and
      mixed-observed/forecast section-header tests in
      `tests/integration/weatherIconOverview.test.tsx` still pass unchanged with the new
      `observedCount`-based logic (non-regression check)

**Checkpoint**: US1 is independently complete — the 3-day section header can no longer claim
"Observed" when nothing is.

---

## Phase 4: User Story 2 - The weekday is visible above the sub-day periods (Priority: P2)

**Goal**: Add a weekday label above each day's group of 5 sub-day period columns on the 3-day
view, reusing the existing `i % 5 === 0` day-grouping convention.

**Independent Test**: View the 3-day timeline; confirm each day's group of Morning-through-Night
columns has a distinct, correct weekday label above it (per quickstart.md US2).

### Implementation for User Story 2

- [ ] T006 [US2] Add a new `weather-timeline-row-weekday` row immediately before the existing
      `weather-timeline-row-time` row in `src/components/WeatherIconOverview.tsx`, gated on
      `displayMode === "last-3-days"`, rendering each period's weekday
      (`new Date(period.key).toLocaleDateString([], { weekday: "short" })`) only on columns where
      `i % 5 === 0`, per data-model.md
- [ ] T007 [P] [US2] Add a CSS rule for `.weather-timeline-weekday-label` in `src/index.css`
      (small, muted text consistent with the existing `.weather-timeline-row-time` label styling)
- [ ] T008 [P] [US2] Add an integration test in `tests/integration/weatherIconOverview.test.tsx`
      asserting the 3-day view renders exactly 3 non-empty weekday labels, each on the first
      column of its day-group, and that the 7-day/24-hour views render none

**Checkpoint**: US1 and US2 both independently complete.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T009 Run `npm test` and fix any regressions introduced by T001-T008
- [ ] T010 Run `npm run lint` and fix any issues
- [ ] T011 Run `npm run build` and confirm a clean build
- [ ] T012 Start `npm run dev` and manually walk through both scenarios in
      `specs/026-fix-3-day/quickstart.md` via live Playwright verification against a real
      location, confirming the section-header fix and the new weekday labels
- [ ] T013 Bump `package.json`'s version as the final step before commit, per standing practice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: None — skipped, no blocking prerequisites
- **User Stories (Phase 3-4)**: Independent of one another — may proceed in any order or in
  parallel (US1 touches `timelineData.ts` + the section-header JSX block; US2 touches a separate
  new row in the same component file, no overlapping lines)
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within Each User Story

- US1: T001 → T002 (the render logic depends on the corrected function) → T003/T004/T005 (tests,
  mutually parallel)
- US2: T006 → T007 (styling, can follow immediately) → T008 (test)

### Parallel Opportunities

- US1 and US2 can be implemented in parallel by different contributors, coordinating on
  `WeatherIconOverview.tsx` (both touch it, but in non-overlapping sections)
- T003/T004/T005 (US1 tests) and T007/T008 (US2 styling/test) are mutually parallel across stories

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3 (US1: fix the mislabeled header)
2. **STOP and VALIDATE**: Run quickstart.md's US1 scenario
3. Deploy/demo if ready

### Incremental Delivery

1. US1 (P1, correctness fix) → validate → MVP
2. US2 (P2, weekday labels) → validate
3. Phase 5 polish pass across everything → commit + push (per standing memory: commit+push
   automatically after `/speckit-implement`, with the version bump from T013 included in that
   same commit)
