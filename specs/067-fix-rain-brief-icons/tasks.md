# Tasks: Stop Brief Morning Rain From Marking the Whole Day, and Refresh Weather Icon Artwork

**Input**: Design documents from `specs/067-fix-rain-brief-icons/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included, per this project's established convention.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npx tsc -b` pass before starting.
- [X] T002 Confirm `python`, `pillow`, `numpy`, `scipy` are available (`python -c "import PIL, numpy, scipy"`) for US2.

**Checkpoint**: No shared foundational work needed — US1 (TypeScript) and US2 (static assets) touch
entirely disjoint files and can proceed in either order.

---

## Phase 2: User Story 1 - A brief morning shower no longer marks the whole day as rainy (Priority: P1) 🎯 MVP

**Goal**: The weekly forecast strip's daily condition no longer shows rain when rain covers only a
minority of a day's daytime hours, unless a single hour was heavy enough to matter on its own.

**Independent Test**: Construct a day with rain confined to 2-3 morning hours and dry the rest of
the daytime span; confirm the weekly strip shows dry. Construct a day with rain across most
daytime hours, or a single very heavy daytime hour; confirm both still show rain.

### Tests for User Story 1

- [X] T003 [P] [US1] Add unit tests to `tests/unit/dailyAggregation.test.ts`: a bucket with rain in
      2 of 14 daytime hours (light amount) produces `daytimeHourCount`/`daytimeRainHourCount`/
      `daytimeMaxHourlyPrecipitation` reflecting exactly those readings; a bucket with rain in most
      daytime hours produces a `daytimeRainHourCount` majority; a bucket with a single very heavy
      daytime hour produces a `daytimeMaxHourlyPrecipitation` at/above the heavy threshold; a
      bucket with zero daytime precipitation readings leaves all three fields `null` together.
- [X] T004 [P] [US1] Add integration test assertions to `tests/integration/weatherIconOverview.test.tsx`
      (extending the `WeeklyForecastStrip` describe block added for 066): a day with light rain
      confined to a couple of morning hours and dry the rest of the daytime span renders a dry
      icon/condition class; a day with rain across most daytime hours still renders rain; a day
      with a single brief but heavy daytime hour still renders rain.

### Implementation for User Story 1

- [X] T005 [US1] In `src/services/weatherCondition.ts`, export `PRECIPITATION_HEAVY_THRESHOLD_MM`
      (currently a private module constant) per research.md §3 — no behavior change, just visibility.
- [X] T006 [US1] In `src/models/types.ts`, add the three new optional `DailyAggregate` fields
      (`daytimeHourCount`, `daytimeRainHourCount`, `daytimeMaxHourlyPrecipitation`) per
      data-model.md, with a doc comment explaining they exist solely to judge whether a day's
      daytime rain is "meaningful enough to display," not to replace `daytimeTotalPrecipitation`.
- [X] T007 [US1] In `src/services/dailyAggregation.ts`, extend `daytimeAggregateFields` to compute
      the three new fields from the same daytime-filtered observation subset it already builds
      (research.md §2) — additive only; every existing field/behavior is unchanged.
- [X] T008 [US1] In `src/components/WeeklyForecastStrip.tsx`, compute the "is this day's daytime
      rain meaningful" boolean (data-model.md's formula, using the newly exported
      `PRECIPITATION_HEAVY_THRESHOLD_MM`) and use it to zero out the precipitation value passed to
      `deriveWeatherCondition` when `false` — every other input (temperature, wind, cloud cover,
      chance of rain) and the existing 066 fallback-to-whole-bucket path when daytime data is
      entirely absent are unchanged.

**Checkpoint**: User Story 1 is fully functional and independently testable/verifiable via
quickstart.md's US1 steps.

---

## Phase 3: User Story 2 - Refresh the weather icon artwork from newly supplied source images (Priority: P2)

**Goal**: The app's 124 weather icon files are regenerated from the new source sprite sheets the
user already placed under `docs/weathericons/`, with no code changes.

**Independent Test**: Run the splitting script against the new source sheets; confirm the output
file set exactly matches (by name) what's currently shipped in `src/assets/weather-icons-v2/`,
then copy it in and confirm the app renders icons everywhere with no missing images.

### Implementation for User Story 2

- [X] T009 [US2] Run `python split_icons.py --sheets-dir . --out-dir icons_split` from
      `docs/weathericons/` against the already-replaced source sheets; confirm the script reports
      `124/124` written with no `❌` lines (research.md §4).
- [X] T010 [US2] Diff the resulting `docs/weathericons/icons_split/` filename set against
      `src/assets/weather-icons-v2/`'s current filename set — confirm they match exactly (FR-007);
      investigate and resolve any mismatch before proceeding.
- [X] T011 [US2] Copy the regenerated files from `docs/weathericons/icons_split/` over
      `src/assets/weather-icons-v2/`, replacing content at the same 124 paths (FR-006/FR-008 — no
      renames, no code changes).

**Checkpoint**: User Stories 1 and 2 both work independently; neither depends on the other.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T012 [P] Run `npm run lint`.
- [X] T013 [P] Run `npx tsc -b`.
- [X] T014 Run `npm test` (full suite) — doubles as US2's visual-regression guard, since a missing
      or renamed icon file would surface as a broken `import.meta.glob`-driven lookup.
- [X] T015 Run `npm run build`.
- [X] T016 Bump `package.json` version (patch — a bug fix plus an asset refresh).
- [X] T017 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).

---

## Dependencies & Execution Order

- Setup (T001-T002) has no dependencies.
- US1 (T003-T008) and US2 (T009-T011) are fully independent — no shared runtime code or files.
- Within US1: T003-T004 (tests) before T005-T008 (implementation); T005 before T006 before T007
  before T008 (each depends on the previous step's exports/types/data existing).
- Within US2: T009 before T010 before T011 (sequential, same directory).
- Polish depends on both user stories being complete.

## Implementation Strategy

Implement US1 first (it's P1, a pure bug fix with test coverage); verify via quickstart.md; then
run US2's asset regeneration (a short, mechanical, one-directional pipeline — no back-and-forth
expected). Run `npx tsc -b` after US1's implementation tasks to catch type errors immediately, and
`npm test` after US2's file copy to catch any coverage mismatch the diff step might have missed.
Commit once at the end (Polish phase) since both stories together are one cohesive change-set from
one user report.
