# Tasks: Split Informational SMHI Warnings Into the Daily Brief

**Input**: Design documents from `/specs/048-split-informational-smhi/`

**Tests**: Included — extends existing `tests/unit/weatherApi.test.ts` and `tests/integration/warningBanner.test.tsx`, adds coverage in a Today-card-focused test file.

## Phase 1: Setup

- [X] T001 Confirm `npm test`/`npm run lint`/`npm run build` pass on current `main` as a clean baseline.

## Phase 2: Foundational

- [X] T002 In `src/models/types.ts`, add `isInformational: boolean` to `WeatherWarning`.
- [X] T003 In `src/services/weatherApi.ts`, compute `isInformational: area.warningLevel.code === "MESSAGE"` alongside the existing `isActive` computation in `getWarningsForLocation`.
- [X] T004 [P] In `tests/unit/weatherApi.test.ts`, add a test asserting a `MESSAGE`-code warning maps to `isInformational: true` and a `CLASS_1` one to `false`.

**Checkpoint**: `WeatherWarning` objects are now correctly classified; nothing downstream has changed yet.

---

## Phase 3: User Story 1 - Informational notices sit in the daily brief (Priority: P1)

### Tests for User Story 1

- [X] T005 [P] [US1] In `tests/integration/warningBanner.test.tsx`, add a test: given only an informational (`isInformational: true`) warning, the standalone banner (`role="region", name: "Weather warnings"`) does not appear.
- [X] T006 [P] [US1] In `tests/integration/weatherIconOverview.test.tsx` (or a new focused test alongside `TodaySummaryCard`), add a test: given an active informational warning, the Today card renders its title/description text, with no dismiss control present for it.

### Implementation for User Story 1

- [X] T007 [US1] In `src/App.tsx`, split the `warnings` array where it's currently passed to `WarningBanner`: keep only `!w.isInformational` (still filtered by `dismissedIds` as today) for the banner; derive a second `informationalWarnings = warnings.filter(w => w.isInformational)` array.
- [X] T008 [US1] In `src/components/WeatherIconOverview.tsx`, add an `informationalWarnings?: WeatherWarning[]` prop to `WeatherIconOverviewProps`, accept it in the destructured params, and pass it through to `<TodaySummaryCard>`.
- [X] T009 [US1] In `src/App.tsx`, pass `informationalWarnings={informationalWarnings}` to `<WeatherIconOverview>`.
- [X] T010 [US1] In `src/components/TodaySummaryCard.tsx`, add the `informationalWarnings?: WeatherWarning[]` prop and render one block per entry (title + description text, no icon, no dismiss button) below the card's existing content — nothing rendered when the array is empty/undefined.
- [X] T011 [US1] In `src/index.css`, add a small style block for the new informational-warning line(s) in the Today card (e.g. `.today-summary-notice`), visually distinct from but not competing with the card's main content.

**Checkpoint**: An active informational warning now shows in the Today card and nowhere else.

---

## Phase 4: User Story 2 - Real severe-weather warnings keep their banner (Priority: P1)

### Tests for User Story 2

- [X] T012 [P] [US2] In `tests/integration/warningBanner.test.tsx`, add a test: given one active color-coded warning and one active informational warning for the same location, the banner shows only the color-coded one.
- [X] T013 [P] [US2] Run the existing warningBanner suite (unchanged tests from 028/045) to confirm no regression to active/upcoming ordering, labeling, or dismissal for color-coded warnings.

### Implementation for User Story 2

- [X] T014 [US2] Verify (no new code expected — T007's split already routes color-coded warnings to the banner unchanged): run T012/T013 and confirm they pass. If not, adjust the `App.tsx` split from T007 without touching `WarningBanner.tsx`'s own logic.

**Checkpoint**: Both kinds of warning independently verified — informational in the Today card only, color-coded in the banner only, both can appear together.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T015 [P] Run `npm run lint`.
- [X] T016 [P] Run `npx tsc -b`.
- [X] T017 Run `npm test` (full suite).
- [X] T018 Run `npm run build`.
- [X] T019 Bump `package.json` version (patch).
- [X] T020 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).

## Dependencies

- Phase 2 blocks Phase 3 and 4 (both need `isInformational` to exist).
- Phase 3 (US1) and Phase 4 (US2) build on the same T007 split — implement together, verify independently via their own tests.
- Phase 5 depends on Phases 3-4 complete.
