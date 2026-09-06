---

description: "Task list for 036-declutter-temperature-scale"
---

# Tasks: Coarser Temperature Timeline Scale

**Input**: Design documents from `/specs/036-declutter-temperature-scale/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Included — this repo has an existing test-first convention for this exact component (see `tests/integration/weatherIconOverview.test.tsx`, feature `032-dashboard-polish-round-seven` and `035-fix-temp-scale-logo`), so this feature follows the same pattern.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to the single user story in spec.md (US1)

This feature has one user story and touches one existing component plus its existing test file — no Setup or Foundational phase is needed (no new dependencies, no new infrastructure).

---

## Phase 1: User Story 1 - Cleaner, zero-anchored temperature trend line (Priority: P1) 🎯 MVP

**Goal**: The temperature row of the weather timeline overview shows degree labels/gridlines every 10° instead of every 5°, always including a labeled 0° line, with the temperature curve/fill/high-low indicators and all other rows unchanged.

**Independent Test**: Open the dashboard, view the temperature row across an all-positive, an all-negative, and a zero-crossing period; confirm labels/gridlines land only on 10° steps, a 0° line/label is always present, and the line/fill/other rows look unchanged. Automated equivalent: `npm run test -- weatherIconOverview`.

### Tests for User Story 1 ⚠️

> Write/update these first; confirm they fail against the current 5-degree, non-zero-anchored implementation before touching production code.

- [X] T001 [P] [US1] In `tests/integration/weatherIconOverview.test.tsx`, update the existing test `"renders 5-degree-step tick labels and matching gridlines spanning the data's own min/max"` (~line 2249) to reflect the new 10-degree step: rename it to describe a 10-degree step, and for the same fixture (observations with temperature 6 and 14) change the expected tick labels to `["0°", "10°", "20°"]` and the expected gridline count to `3` (min=6 floors to 0 under step 10, max=14 ceils to 20).
- [X] T002 [P] [US1] In `tests/integration/weatherIconOverview.test.tsx`, add a new test in the `"Temp chart degree scale"` describe block for an **all-positive range that would not naturally include 0** (e.g., observations with temperature 12 and 25 — floor/ceil to 10/30 without a zero-anchor fix), asserting the rendered tick labels equal `["0°", "10°", "20°", "30°"]`, proving 0 is always included even when not naturally in range.
- [X] T003 [P] [US1] In `tests/integration/weatherIconOverview.test.tsx`, add a new test in the same describe block for an **all-negative range** (e.g., observations with temperature -25 and -12 — floor/ceil to -30/-10 without a zero-anchor fix), asserting the rendered tick labels equal `["-30°", "-20°", "-10°", "0°"]`.

### Implementation for User Story 1

- [X] T004 [US1] In `src/components/WeatherIconOverview.tsx`, change `const TEMPERATURE_TICK_STEP = 5;` (~line 138) to `10`.
- [X] T005 [US1] In `src/components/WeatherIconOverview.tsx`, update `buildTicks()` (~lines 147-156) so the generated tick range always includes `0`: after computing `start`/`end` via the existing floor/ceil-to-step logic, widen them with `start = Math.min(start, 0)` and `end = Math.max(end, 0)` before building the `ticks` array, so a `{ value: 0, y: scale.yFor(0) }` tick is always present regardless of the row's own min/max.
- [X] T006 [US1] In `src/components/WeatherIconOverview.tsx`, update the doc comment directly above `buildTicks()` (~lines 145-146) to describe the new 10-degree, zero-anchored behavior instead of the old 5-degree description, referencing this feature (`036-declutter-temperature-scale`).
- [X] T006a [US1] (discovered during implementation, not in original plan) In `src/components/WeatherIconOverview.tsx`, update `dedupeCloseTicks()` (~lines 181-202) so the label-overlap-thinning algorithm never drops the `0` tick (or the topmost/bottommost boundary ticks) when it collides with a non-mandatory tick at the same clamped position — otherwise T002/T003's all-positive/all-negative cases can have their `0°` label silently thinned away by the existing overlap logic, which was only designed to protect the two boundary ticks.

**Checkpoint**: Ran `npm run test -- weatherIconOverview` — all of T001-T003 pass, and no other test in that file regresses (in particular the `"renders no degree scale or gridlines for the wind/precipitation/snow rows"` test near line 2274, which is unaffected by the step/anchor change). ✅

---

## Phase 2: Polish & Cross-Cutting Concerns

- [X] T007 Run the full test suite (`npm test`) to confirm no regressions outside `weatherIconOverview.test.tsx`. Result: 526 passed, 1 pre-existing unrelated failure (a time-of-day-dependent icon test that fails identically on unmodified `main`).
- [~] T008 Manually walk through [quickstart.md](./quickstart.md)'s three manual-validation cases (all-positive, all-negative, zero-crossing ranges) against `npm run dev`. Not performed — no browser/screenshot tool available in this session; the automated jsdom assertions in T001-T003 cover the same three cases at the DOM level, but a real-browser visual check is still outstanding.
- [X] T009 Bump the version in `package.json` (`0.4.1` → `0.4.2`) as part of this change.

---

## Dependencies & Execution Order

- T001, T002, T003 are independent of each other ([P]) but all must exist (and fail) before T004-T006.
- T004 and T005 both edit `WeatherIconOverview.tsx`, so run them sequentially (T004 then T005); T006 depends on T005 being finalized (its comment describes T005's logic).
- T007-T009 depend on the Phase 1 checkpoint passing.

## Implementation Strategy

Single user story — implement top to bottom: red tests (T001-T003) → green implementation (T004-T006) → polish (T007-T009). There is no smaller MVP slice; the whole feature is one small, atomic visual change.

---

## Phase 3: Revert the zero-anchor (bug reported live post-deploy)

**Trigger**: After T004-T006a shipped and deployed, live use surfaced a real bug: "the scale is not correct, must be some kind of bug on it. looks like 10 degrees is zero." Root cause — see [spec.md](./spec.md)'s Assumptions section. Forcing a 0° tick into view for periods far from freezing computed a `y` far outside the visible 0-100 plot band (the row's Y-scale stays fixed to the actual data range per FR-004/SC-003); the label-clamping safeguard then pulled that off-canvas label back into view, where it collided with — and sometimes displaced — the real boundary tick's label.

- [X] T010 In `src/components/WeatherIconOverview.tsx`, revert `buildTicks()` to drop the `Math.min(0, ...)` / `Math.max(0, ...)` widening from T005 — back to plain floor/ceil-to-step from the row's own min/max. Keep `TEMPERATURE_TICK_STEP = 10` (T004 stands).
- [X] T011 In `src/components/WeatherIconOverview.tsx`, revert `dedupeCloseTicks()` (T006a) to its pre-036 form — drop the `mustKeepValues`-includes-`0` special case, back to only ever protecting the topmost/bottommost boundary ticks.
- [X] T012 In `tests/integration/weatherIconOverview.test.tsx`, replace T002/T003's "always includes a 0° tick" assertions with the corrected expectation: an all-positive range (12–25°C) yields `["10°", "20°", "30°"]` and an all-negative range (-25 to -12°C) yields `["-30°", "-20°", "-10°"]` — no forced 0.
- [X] T013 Update [spec.md](./spec.md) to mark the zero-anchor requirement (former FR-004/FR-005) superseded, documenting the bug and the revert in Assumptions.

**Checkpoint**: `npm run test -- weatherIconOverview` — 82/82 pass. Full `npm test` — 527/527 pass, no regressions.
