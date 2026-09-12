# Tasks: Refresh the Woman Character's Icon Artwork (Sheets 1-6)

**Input**: Design documents from `specs/068-update-woman-icons/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: None needed — no code changes; the existing test suite is the regression guard (T007).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npx tsc -b` pass before starting.
- [X] T002 Confirm `python`, `pillow`, `numpy`, `scipy` are available for the splitting/resize
      pipeline (already verified working in 067-fix-rain-brief-icons).

---

## Phase 2: User Story 1 - Regenerate icons 1-6 from the newly supplied source images (Priority: P1) 🎯 MVP

**Goal**: The 72 icon files corresponding to source sheets 1-6 are regenerated from the user's new
artwork, optimized to match the rest of the icon set's file size, with the other 52 files
untouched.

**Independent Test**: Run the pipeline scoped to sheets 1-6; confirm exactly 72 files change in
`src/assets/weather-icons-v2/` and none of the other 52 do; confirm the app renders correctly.

### Implementation for User Story 1

- [X] T003 [US1] Run `python split_icons.py --sheets-dir . --out-dir icons_split` from
      `docs/weathericons/` against the already-replaced sheets 1-6 (and unchanged sheets 7-19);
      confirm `124/124` written with no `❌` lines (research.md §2).
- [X] T004 [US1] Copy only the 72 output files whose names match the six weather-type prefixes
      (`weather_clear_*`, `weather_nearly-clear_*`, `weather_variable_*`, `weather_cloudy_*`,
      `weather_overcast_*`, `weather_fog_*`) from `docs/weathericons/icons_split/` into
      `src/assets/weather-icons-v2/`, overwriting only those 72 paths (research.md §2, FR-003).
- [X] T005 [US1] Shrink exactly those 72 copied files to match the rest of the already-optimized
      icon set (reusing `resize_icons.py`'s `shrink()` function against that same 72-file list,
      not its whole-directory CLI mode) — research.md §3, FR-005.
- [X] T006 [US1] Verify scope: `git status --short src/assets/weather-icons-v2/` shows exactly 72
      modified files, all matching the six weather-type prefixes above (SC-002).
- [X] T007 [US1] Run the full app test suite (`npm test`) and a visual spot-check of a couple of
      regenerated icons (e.g. `weather_clear_day_mild.png`, `weather_cloudy_night_warm.png`) to
      confirm correct cropping/transparency, matching 067's own verification approach (SC-001).

**Checkpoint**: User Story 1 is fully functional and independently verifiable via quickstart.md.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [X] T008 [P] Run `npm run lint`.
- [X] T009 [P] Run `npx tsc -b`.
- [X] T010 Run `npm test` (full suite) again post-shrink, in case the shrink step altered timing-
      sensitive `import.meta.glob` output ordering (it doesn't, but cheap to confirm).
- [X] T011 Run `npm run build`.
- [X] T012 Bump `package.json` version (patch — a scoped asset refresh).
- [X] T013 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).

---

## Dependencies & Execution Order

- Setup (T001-T002) has no dependencies.
- T003 before T004 before T005 before T006 before T007 (each step depends on the previous file
  set existing).
- Polish depends on User Story 1 being complete.

## Implementation Strategy

A short, mechanical, single-story feature — run the pipeline, copy only the intended subset, shrink
only that subset, verify scope, then the usual full regression before commit. No back-and-forth
expected.
