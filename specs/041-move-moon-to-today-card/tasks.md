---

description: "Task list for 041-move-moon-to-today-card"
---

# Tasks: Declutter Timeline Header and Move Moon Phase to the Today Card

**Input**: Design documents from `/specs/041-move-moon-to-today-card/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Included — updates the project's existing `tests/integration/weatherIconOverview.test.tsx` suite.

**Organization**: Tasks are grouped by user story (US1 = remove the timeline-header block, US2 = add moon phase to the Today card) so each can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files/tests, no dependency on an incomplete task)
- **[Story]**: US1 or US2, per `spec.md`
- File paths are exact and relative to the repo root

## Phase 1: Setup

**Purpose**: Confirm baseline before touching anything.

- [X] T001 Run `npm test` from the repo root to confirm the current `main` branch is green, so any failures found later are attributable to this feature
  - **Result**: 568/568 passed (baseline).

**Checkpoint**: Baseline confirmed.

---

## Phase 2: Foundational

*No foundational tasks.* US1 (removing the timeline-header block) and US2 (adding moon phase to the Today card) touch different components (`WeatherIconOverview.tsx`'s Overview render vs. `TodaySummaryCard.tsx`) with no shared prerequisite.

---

## Phase 3: User Story 1 - A less cluttered timeline header (Priority: P1) 🎯 MVP

**Goal**: No "Data: SMHI"-style note and no Sunrise/Sunset line appears directly above the Overview timeline (FR-001, FR-002), while the footer's own disclosure and the Details view's own note stay untouched (FR-003, FR-005).

**Independent Test**: Open the Overview page and confirm neither the data-source note nor a Sunrise/Sunset line appears above the timeline.

### Tests for User Story 1

- [X] T002 [P] [US1] In `tests/integration/weatherIconOverview.test.tsx`, update the "renders a Sun & Moon summary with sunrise/sunset/phase text" test (~line 806, under "US3: sun/moon and enrichment rows") to instead assert that no `Sunrise:`/`Sunset:`/`Moon:` text renders above the timeline — rename the `describe`/`it` text to reflect the new behavior
- [X] T003 [P] [US1] In `tests/integration/weatherIconOverview.test.tsx`, update the "shows the data-source note on the Overview" test (~line 1437, under "data source note") to instead assert that `"Data: Open-Meteo"` (or any `dataSourceNote` text) does NOT render on the Overview

### Implementation for User Story 1

- [X] T004 [US1] In `src/components/WeatherIconOverview.tsx`, remove the `{series !== null && dataSourceNote(series) && (<p className="data-source-note">...)}` block (~line 846-848) from the Overview render
- [X] T005 [US1] In `src/components/WeatherIconOverview.tsx`, remove the `<SunMoonSummary location={location} date={new Date()} />` call (~line 860) and delete the now-unused `SunMoonSummary` function (~line 619-635); remove the `dataSourceNote` import if it becomes unused in this file, and the `.weather-timeline-sun-moon` CSS rule in `src/index.css` if it becomes unused
  - **Result**: Removed `dataSourceNote`/`getMoonPhase`/`getSunTimes` imports from `WeatherIconOverview.tsx` (all three became unused there — `dataSourceNote` is still used by `ObservationChart.tsx`, so only its rule/CSS use elsewhere is untouched). `.weather-timeline-sun-moon` had no other consumer, so its CSS rule was deleted; `.data-source-note` still has one (`ObservationChart.tsx`), so that rule stayed.

**Checkpoint**: User Story 1 is independently functional — the timeline header is decluttered, other views' notes are unaffected.

---

## Phase 4: User Story 2 - See the moon phase as part of Today's summary (Priority: P2)

**Goal**: The Today card shows the current moon phase alongside its existing figures (FR-004).

**Independent Test**: Open the Overview page and confirm the Today card shows a moon phase alongside its existing high/low/rain/wind/sunrise/sunset figures.

### Tests for User Story 2

- [X] T006 [P] [US2] In `tests/integration/weatherIconOverview.test.tsx`, add/extend a Today-card test to assert a `Moon <phase>` (e.g. "Moon waning crescent") span renders in `.today-summary-detail` alongside the existing Sunrise/Sunset spans

### Implementation for User Story 2

- [X] T007 [US2] In `src/components/TodaySummaryCard.tsx`, import `getMoonPhase` from `../services/sunMoon` and add a `Moon {moonPhase.replace("-", " ")}` span to the existing `.today-summary-detail` row (~line 92-95) that already renders Sunrise/Sunset

**Checkpoint**: Both user stories work together — this is the full feature.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T008 [P] Run `npm test` (full suite) and `npm run lint` to confirm no regressions
  - **Result**: `npm test` — 568/568 pass (35 files; one transient act()-warning-only flake on an unrelated test reran clean). `npm run lint` — clean. `npm run build` also verified.
- [X] T009 Bump the version in `package.json` per project convention
  - **Result**: Bumped `0.5.1` → `0.5.2`.
- [X] T010 Run the full `quickstart.md` validation as a final sign-off
  - **Result**: Automated section covered by T002/T003/T006. Manual section confirmed via source inspection — the Details/graph view's `ObservationChart.tsx` still renders its own `.data-source-note` independently (untouched), and the footer's `dataSourceDisclosure` is a separate function/component, also untouched.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: None — skipped
- **User Story 1 (Phase 3)**: Depends only on Phase 1
- **User Story 2 (Phase 4)**: Depends only on Phase 1 — fully independent of User Story 1 (different files)
- **Polish (Phase 5)**: Depends on both user stories being complete

### Parallel Opportunities

- T002/T003 (US1 tests) and T006 (US2 test) can be written in parallel
- Once Phase 1 is done, User Story 1 (Phase 3) and User Story 2 (Phase 4) can be implemented in parallel, since they touch different files

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (declutter)
3. **STOP and VALIDATE**: Confirm the timeline header is clean and other views unaffected
4. Ship if that's the more urgent of the two

### Incremental Delivery

1. Phase 1 → baseline confirmed
2. Phase 3 (US1) → validate → ship
3. Phase 4 (US2) → validate → ship
4. Phase 5 → polish, version bump, final sign-off

## Notes

- No new dependencies, files, or architectural changes — both stories are small, targeted edits to two existing components.
