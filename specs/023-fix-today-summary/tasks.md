---

description: "Task list for Fix Today Summary's Backward-Looking Condition"
---

# Tasks: Fix Today Summary's Backward-Looking Condition

**Input**: Design documents from `/specs/023-fix-today-summary/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested for this round; a regression test is added alongside the fix
per this session's established practice.

**Organization**: A single P1 user story — the fix and its test are both part of the same,
tightly-scoped change.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No new project setup required — the change touches one existing file.

---

## Phase 2: Foundational

No blocking prerequisites.

---

## Phase 3: User Story 1 - The Today card matches what "today" actually looks like (Priority: P1) 🎯 MVP

**Goal**: Fix `WeatherIconOverview.tsx`'s `todayIndex` to select the forward-looking `(now,
now+24h]` daily bucket instead of the backward-looking `(now-24h, now]` bucket, so the persistent
Today card agrees with the visible hourly forecast.

**Independent Test**: With a location whose most recent past 24h were cloudy but whose next 24h
forecast is clear, confirm the Today card shows "Clear," not "Cloudy" (per quickstart.md US1).

### Implementation for User Story 1

- [X] T001 [US1] Change `todayIndex`'s computation in `src/components/WeatherIconOverview.tsx` to
      `firstForecastIndex === -1 ? weeklyDays.length - 1 : firstForecastIndex` (removing the
      `- 1` that previously selected the backward-looking bucket before the first forecast
      entry), per data-model.md
- [X] T002 [P] [US1] Add an integration test in `tests/integration/weatherIconOverview.test.tsx`
      (alongside the existing "Today summary card" describe block) asserting: given observed data
      in the trailing 24h that would classify as cloudy (e.g. high `cloudCoverPercent`, no
      precipitation, low wind) and forecast data in the next 24h that would classify as clear (low
      `cloudCoverPercent`), the Today card's description reads "Clear.", not "Cloudy."
- [X] T003 [P] [US1] Add an integration test asserting the existing no-forecast fallback is
      unchanged: given only observed data (no `isForecast` entries anywhere), the Today card still
      renders based on the most recent observed day, exactly as today's existing tests already
      establish (a non-regression check, not new behavior)

**Checkpoint**: US1 is independently complete — the Today card and the hourly forecast can no
longer visibly disagree about the same day.

**Note (found during T007's live verification)**: `windowAroundToday` in
`src/components/timelineData.ts` (used by the 7-day forecast strip) had its own independent copy
of the same backward-looking "today" logic that T001 fixed — left unfixed, this caused the 7-day
strip's first ("today") card to silently diverge from the newly-fixed Today card. Both were
updated together (not a separate task, since it's the same root cause applied to a second
call site) and a corresponding unit test was added in `tests/unit/timelineData.test.ts`.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T004 Run `npm test` and fix any regressions introduced by T001-T003
- [X] T005 Run `npm run lint` and fix any issues
- [X] T006 Run `npm run build` and confirm a clean build
- [X] T007 Start `npm run dev` and manually walk through quickstart.md's US1 scenario via live
      Playwright verification against a real location, comparing the Today card to the hourly
      view and to the 7-day strip's first card
- [X] T008 Bump `package.json`'s version as the final step before commit, per standing practice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: None — skipped, no blocking prerequisites
- **User Story 1 (Phase 3)**: The only story; T001 first, then T002/T003 (tests, parallel with
  each other, both depending on T001's change to know the new expected output)
- **Polish (Phase 4)**: Depends on Phase 3 being complete

### Parallel Opportunities

- T002 and T003 are mutually parallel (independent test cases in the same file, but logically
  separable and non-conflicting)

---

## Implementation Strategy

### MVP First (and only) — User Story 1

1. Complete Phase 3 (the fix + its tests)
2. **STOP and VALIDATE**: Run quickstart.md's US1 scenario
3. Phase 4 polish pass → commit + push (per standing memory: commit+push automatically after
   `/speckit-implement`, with the version bump from T008 included in that same commit)
