---

description: "Task list for Calendar-Day Rain Total on the Today Card"
---

# Tasks: Calendar-Day Rain Total on the Today Card

**Input**: Design documents from `/specs/033-todays-rain-total/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the spec; regression/unit tests are added alongside each
change per this session's established practice.

**Organization**: Single user story (P1) — the entire feature is one small, cohesive change.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

Not applicable — no new project setup.

---

## Phase 2: Foundational

Not applicable — no shared prerequisite beyond the new helper itself (research.md §4).

---

## Phase 3: User Story 1 - The rain total means "today," not "the next 24 hours" (Priority: P1) 🎯 MVP

**Goal**: The Today card's rain figure sums precipitation over the current local calendar day
only (midnight to midnight), combining already-elapsed and still-forecast hours, never bleeding
into tomorrow.

**Independent Test**: At any time of day, the rain figure equals the calendar-day sum, never the
existing rolling next-24-hours bucket's total (per quickstart.md).

### Implementation for User Story 1

- [X] T001 [US1] Add `sumCalendarDayPrecipitation(observations, reference): number | null` to
      `src/services/dailyAggregation.ts` — sums non-null `precipitation` readings whose timestamp
      falls in `[localMidnightStart(reference), localMidnightStart(reference) + 24h)`; returns
      `null` when no non-null reading falls in that span, per contracts/rain-total.md and
      research.md §2/§3
- [X] T002 [US1] In `src/components/WeatherIconOverview.tsx`, compute
      `todaysRainTotalMm = sumCalendarDayPrecipitation(weeklySeries?.observations ?? [], new
      Date())` and pass it as a new `todaysRainTotalMm` prop to `<TodaySummaryCard />`
- [X] T003 [US1] In `src/components/TodaySummaryCard.tsx`, add the `todaysRainTotalMm: number |
      null` prop and render the rain figure from it instead of `today.totalPrecipitation` —
      every other rendered value on the card continues to read from `today` unchanged, per
      contracts/rain-total.md
- [X] T004 [P] [US1] Add unit tests for `sumCalendarDayPrecipitation` in
      `tests/unit/dailyAggregation.test.ts`: sums elapsed + forecast hours of today into one
      total; excludes an hour belonging to tomorrow even when called late at night; returns
      `null` (not `0`) when no non-null reading exists anywhere in today's span
- [X] T005 [P] [US1] Add/update an integration test in
      `tests/integration/weatherIconOverview.test.tsx` (alongside the existing "Today summary
      card" tests) asserting the rendered rain figure matches a calendar-day sum for a fixture
      where it deliberately differs from the existing rolling-window bucket's own total (e.g.
      rain in tomorrow's early hours, none left in today)

**Checkpoint**: Feature complete — the rain figure reflects today's calendar day; every other
figure on the card is unchanged.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T006 Run `TZ=UTC npx vitest run` and fix any regressions introduced by T001-T005
- [X] T007 Run `npm run lint` and fix any issues
- [X] T008 Run `npm run build` and confirm a clean build
- [X] T009 Start `npm run dev` and manually walk through quickstart.md's live check: a location
      with rain crossing into tomorrow, confirming the figure excludes tomorrow's portion and
      every other card value is visually unchanged
- [X] T010 Bump `package.json`'s version as the final step before commit, per standing practice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: Skipped — not applicable
- **User Story 1 (Phase 3)**: The entire feature; no dependencies
- **Polish (Phase 4)**: Depends on User Story 1 being complete

### Within Phase 3

- T001 → T002 (needs the helper) → T003 (needs the prop threaded through) → T004/T005 (tests,
  mutually parallel, can be written alongside T001/T003)

### Parallel Opportunities

- T004 and T005 are mutually parallel with each other.

---

## Implementation Strategy

### MVP First (and only)

1. Complete Phase 3: User Story 1 (the entire feature)
2. **STOP and VALIDATE**: Run quickstart.md's manual check
3. Phase 4 polish pass → commit + push (per standing memory: commit+push automatically after
   `/speckit-implement`, with the version bump from T010 included in that same commit)
