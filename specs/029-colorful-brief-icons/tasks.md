---

description: "Task list for Colorful Daily Brief Icon"
---

# Tasks: Colorful Daily Brief Icon

**Input**: Design documents from `/specs/029-colorful-brief-icons/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the spec; a regression test is added per this session's
established practice.

**Organization**: Single user story (P1) — the entire feature is one small, cohesive change.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

Not applicable — no new project setup.

---

## Phase 2: Foundational

Not applicable — no shared prerequisite beyond the fix itself; the styling this feature reuses
(`.weather-condition-{condition} svg` color rules in `src/index.css`) already exists and needs
no changes (research.md §1).

---

## Phase 3: User Story 1 - Recognize today's condition at a glance, consistently with the rest of the app (Priority: P1) 🎯 MVP

**Goal**: The Today card's icon renders in its condition's established color, matching the same
condition's color everywhere else in the app.

**Independent Test**: Open the overview for any location; the Today card's icon renders in its
condition's established color rather than a single flat tone, matching the color already used
for that same condition elsewhere on the page (per quickstart.md).

### Implementation for User Story 1

- [X] T001 [US1] In `src/components/TodaySummaryCard.tsx`, change the icon wrapper's
      `className` from the fixed string `"today-summary-icon"` to conditionally append
      `` `weather-condition-${condition}` `` when `condition !== null` (mirroring
      `WeatherIconOverview.tsx`'s `ConditionRow` pattern for the same class), per
      contracts/today-summary-icon.md
- [X] T002 [P] [US1] Add/update an integration test in
      `tests/integration/weatherIconOverview.test.tsx` (in the existing "Today summary card"
      describe block) asserting the Today card's icon wrapper carries the
      `weather-condition-{condition}` class matching its derived condition for a representative
      fixture (e.g. a clear-sky reading)

**Checkpoint**: Feature complete — the Today card's icon is colorful and theme-consistent, with
no other visual change.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T003 Run `TZ=UTC npx vitest run` and fix any regressions introduced by T001-T002
- [X] T004 Run `npm run lint` and fix any issues
- [X] T005 Run `npm run build` and confirm a clean build
- [X] T006 Start `npm run dev` and manually confirm via quickstart.md: the icon's color across a
      clear/sunny location, across all three themes, with unchanged size/position
- [X] T007 Bump `package.json`'s version as the final step before commit, per standing practice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: Skipped — not applicable
- **User Story 1 (Phase 3)**: The entire feature; no dependencies
- **Polish (Phase 4)**: Depends on User Story 1 being complete

### Within Phase 3

- T001 → T002 (test follows the implementation change; both touch related but distinct
  concerns and could be written together)

### Parallel Opportunities

- None meaningful — this is a single-file, single-line change plus one test.

---

## Implementation Strategy

### MVP First (and only)

1. Complete Phase 3: User Story 1 (the entire feature)
2. **STOP and VALIDATE**: Run quickstart.md's manual check across all three themes
3. Phase 4 polish pass → commit + push (per standing memory: commit+push automatically after
   `/speckit-implement`, with the version bump from T007 included in that same commit)
