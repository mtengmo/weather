# Tasks: Show Upcoming Weather Warnings

**Input**: Design documents from `/specs/045-show-upcoming-smhi/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included — this feature touches existing well-tested files (`weatherApi.test.ts` already has coverage for the filter behavior being changed) and adds a new `WarningBanner` test file, consistent with the project's existing per-file test convention.

**Organization**: Grouped by user story from spec.md.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 No new setup needed — feature reuses existing `src/models/types.ts`, `src/services/weatherApi.ts`, `src/components/WarningBanner.tsx`, `tests/unit/weatherApi.test.ts`. Confirm `npm test`/`npm run lint`/`npm run build` all pass on current `main` before starting, as a clean baseline.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Model + filter-window change that both user stories depend on.

- [X] T002 In `src/models/types.ts`, add `isActive: boolean` to the `WeatherWarning` interface (see data-model.md), with a doc comment explaining `true` = currently in effect, `false` = published but starts within the next 48h.
- [X] T003 In `src/services/weatherApi.ts`, replace the `if (validFrom > now) continue;` line in `getWarningsForLocation` with a bounded-window check: exclude when `validFrom > now + 48h` (48h in ms as a named constant, e.g. `UPCOMING_WINDOW_MS`), keeping the existing `validUntil` exclusion unchanged. Compute `isActive = validFrom <= now` and include it on each pushed `WeatherWarning`.
- [X] T004 In `src/services/weatherApi.ts`, update the final `.sort(...)` call so warnings sort by `isActive` descending first, then by `severityRank(severityCode)` descending (per research.md §3) — active warnings always precede upcoming ones, severity breaks ties within each group.

**Checkpoint**: `getWarningsForLocation` now returns both active and near-term upcoming warnings, correctly flagged and ordered. Existing callers (`useObservationData.ts`) need no changes — they already just pass the array through.

---

## Phase 3: User Story 1 - See a warning that starts soon, before it goes active (Priority: P1) 🎯 MVP

**Goal**: An upcoming (not-yet-active) warning within 48h is included and clearly marked with when it starts, instead of being hidden.

**Independent Test**: Mock a warning with `approximateStart` a few hours in the future; confirm it's returned by `getWarningsForLocation` with `isActive: false`, and that `WarningBanner` renders it with a starts-in indication.

### Tests for User Story 1

- [X] T005 [P] [US1] In `tests/unit/weatherApi.test.ts`, update the existing test "excludes a warning whose approximateStart is in the future" (~line 495) to reflect the new behavior: rename it to something like "includes a warning starting within 48h as upcoming (isActive: false)" and assert the result has length 1 with `isActive: false`, using an `approximateStart` a few hours out (e.g. `+3600_000`, already used).
- [X] T006 [P] [US1] In `tests/unit/weatherApi.test.ts`, add a new test "excludes a warning starting more than 48h from now" — `approximateStart` set to `now + 72h`, expect `result` to be `[]`.
- [X] T007 [P] [US1] In `tests/unit/weatherApi.test.ts`, add a new test "marks a currently-valid warning as active" — extend the existing "includes a currently-valid warning..." test (~line 520) or add a new assertion that `result[0].isActive === true`.
- [X] T008 [P] [US1] Create `tests/unit/WarningBanner.test.tsx` (new file, following the existing Testing Library conventions used elsewhere in `tests/unit/`) with a test that renders `WarningBanner` given one warning with `isActive: false` and a future `validFrom`, and asserts the rendered output contains a starts-in / not-yet-active indication (e.g. queries for text matching `/starts/i` or a `warning-upcoming` class), distinct from how an active warning renders.

### Implementation for User Story 1

- [X] T009 [US1] In `src/components/WarningBanner.tsx`, compute a human-readable "starts in X" label for any warning with `isActive: false` (relative time from `validFrom` to now — hours if under 24h, otherwise a day-level phrase like "starts tomorrow"/"starts in 2 days"), following the file's existing `toLocaleString` formatting style (see research.md §4). Add a small local helper function for this rather than inlining the logic in JSX.
- [X] T010 [US1] In `src/components/WarningBanner.tsx`, render the starts-in label for upcoming warnings both in the collapsed summary (when `leading.isActive === false`) and in each expanded item (`warning-banner-item`), alongside the existing validity-window text.
- [X] T011 [US1] In `src/index.css`, add a `.warning-upcoming` (or similar) style hook so upcoming warnings are visually distinct (e.g. a muted/outlined treatment vs. the solid active styling), applied via a conditional class in `WarningBanner.tsx` based on `warning.isActive`.

**Checkpoint**: User Story 1 fully functional — an upcoming warning within 48h now shows up, clearly marked, and transitions to the active look automatically once its start time passes (verified by the isActive flip on next fetch, no code needed for the transition itself).

---

## Phase 4: User Story 2 - Upcoming and active warnings are told apart at a glance (Priority: P2)

**Goal**: When both active and upcoming warnings exist, they're grouped/ordered so nothing upcoming reads as already in effect.

**Independent Test**: Mock one active + one upcoming warning (different severities) for the same location; confirm the banner shows the active one first and the upcoming one clearly marked with its start time, with severity ordering preserved within each group.

### Tests for User Story 2

- [X] T012 [P] [US2] In `tests/unit/weatherApi.test.ts`, add a test "sorts active warnings before upcoming ones regardless of severity" — one upcoming `CLASS_3` (high severity) and one active `MESSAGE` (low severity); assert the active `MESSAGE` warning comes first.
- [X] T013 [P] [US2] In `tests/unit/weatherApi.test.ts`, add a test "sorts multiple upcoming warnings most-to-least severe among themselves" — two upcoming warnings with different severity codes, both `isActive: false`; assert relative order matches severity rank.
- [X] T014 [P] [US2] In `tests/unit/WarningBanner.test.tsx`, add a test rendering one active + one upcoming warning together; assert the active warning's summary/leading item appears before the upcoming one in the rendered output, and that only the upcoming one carries the starts-in label.

### Implementation for User Story 2

- [X] T015 [US2] Verify (no new code expected — implemented by T004's sort change and T009-T011's per-item rendering): run the new US2 tests from T012-T014 and confirm they pass without further changes. If any fail, adjust `WarningBanner.tsx`'s per-item class/label logic (from Phase 3) so the active/upcoming distinction holds correctly when both are present simultaneously, not just individually.

**Checkpoint**: Both user stories independently verified; active warnings always lead, upcoming warnings are clearly and correctly labeled among a mixed list.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T016 [P] Run `npm run lint` and fix any issues introduced by the above changes.
- [X] T017 [P] Run `npx tsc -b` (full project build, not just `--noEmit`) to catch any type errors across the codebase from the `WeatherWarning` interface change.
- [X] T018 Run `npm test` (full suite) and confirm all tests pass, including the updated/new ones from T005-T008 and T012-T014.
- [X] T019 Run `npm run build` to confirm the production build succeeds.
- [X] T020 Manually walk through `quickstart.md`'s validation steps.
- [X] T021 Bump the `version` field in `package.json` (patch bump) per project convention.
- [X] T022 Commit all changes and push per project convention (commit message describing the upcoming-warnings feature, `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` trailer).

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1. **Blocks** Phase 3 and Phase 4 — both stories need the `isActive` field and widened filter window to exist first.
- **Phase 3 (US1)**: Depends on Phase 2. Independently testable/deliverable as the MVP (a single upcoming warning shows up, labeled).
- **Phase 4 (US2)**: Depends on Phase 2; builds on Phase 3's rendering work (T009-T011) for the label/visual distinction, and on Phase 2's T004 sort order. Not independently implementable before Phase 3 in practice (there'd be nothing upcoming to distinguish), though its tests target ordering/grouping specifically, distinct from US1's "does it show at all" tests.
- **Phase 5 (Polish)**: Depends on Phases 3 and 4 being complete.

## Parallel Example: Phase 3 tests

```text
Task: "Update weatherApi.test.ts future-start test to expect isActive:false inclusion"
Task: "Add weatherApi.test.ts test excluding warnings >48h out"
Task: "Add weatherApi.test.ts test asserting isActive:true for active warnings"
Task: "Create WarningBanner.test.tsx with an upcoming-warning render test"
```

These four (T005-T008) touch two different files with no interdependency and can be done in parallel.

## Implementation Strategy

**MVP = Phase 1 + 2 + 3 (User Story 1 only)**: ships the core fix — the user's original "why don't I see the skyfall warning" complaint is resolved once an upcoming warning shows up at all, clearly labeled. Phase 4 refines correctness for the mixed active+upcoming case, and Phase 5 is standard pre-commit verification.

## Implementation Note

T008/T014 originally called for a new `tests/unit/WarningBanner.test.tsx`. On inspection, `WarningBanner` was already covered only through the existing App-level integration test `tests/integration/warningBanner.test.tsx` (there is no `tests/unit/*.test.tsx` precedent in this project — component tests are done through `App` integration tests). Both tasks' intent (upcoming-warning rendering, and active-before-upcoming ordering with per-item labeling) was fulfilled by extending that existing file instead, to stay consistent with project convention.
