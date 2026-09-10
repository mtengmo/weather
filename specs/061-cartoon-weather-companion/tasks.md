# Tasks: Cartoon Weather Companion

**Input**: Design documents from `specs/061-cartoon-weather-companion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included, per this project's established convention (full `npm test` run required before
every commit).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Phase 1: Setup

- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The cropped assets and the mapping module's data shape are needed by every user
story below — none of them can be implemented before this phase completes.

- [X] T002 Create `docs/weathericons/split_character_sheet.py`: crop the 25 character cells out of
      `docs/weathericons/b883b079-47e5-41c1-99b5-1dce1b1449e7.png` using the pixel boundaries
      measured in research.md §2 (header rows/columns excluded), autotrim each crop to its
      alpha>0 bounding box (no flood-fill/feathering needed — the source alpha is already clean,
      research.md §1), and save each as `src/assets/weather-characters/character_{precip}_{band}.png`
      (`precip` ∈ `dry,rain,thunder,sleet,snow` in row order; `band` ∈
      `frozen,cold,mild,warm,hot` in column order), mirroring the shape of
      `docs/logos/split_symbols_ver6.py`.
- [X] T003 Run `python docs/weathericons/split_character_sheet.py`; verify
      `src/assets/weather-characters/` contains exactly 25 PNGs, each `RGBA` mode with a
      non-trivial alpha range (spot-check a couple with Pillow per quickstart.md step 1).
- [X] T004 Create `src/components/weatherCharacterIcons.ts`: define the `PrecipCategory` and
      `TempBand` union types (data-model.md), import all 25 PNGs from
      `src/assets/weather-characters/`, and build the `CHARACTER_ICONS: Record<PrecipCategory,
      Record<TempBand, string>>` lookup table (25 entries), mirroring
      `src/components/smhiSymbolIcons.ts`'s existing import/lookup-table pattern.

**Checkpoint**: Assets exist and are wired into a typed lookup table — user story work can begin.

---

## Phase 3: User Story 1 - See how to dress from a glance at the character (Priority: P1) 🎯 MVP

**Goal**: A character dressed for current conditions renders beside the existing "Today" weather
icon, for the common case where a condition and temperature are both available.

**Independent Test**: Render `TodaySummaryCard` with a known `currentCondition` (e.g.
`"heavy-snow"`) and `currentTemperature` (e.g. `-25`); confirm a character `<img>` renders beside
the weather icon, pointing at the `frozen`/`snow` asset, and the card's existing temperature/
high-low text is still present and unobscured.

### Tests for User Story 1

- [X] T005 [P] [US1] Unit test in `tests/unit/weatherCharacterIcons.test.ts`: for a representative
      condition/temperature pair (e.g. `heavy-rain` at `10`°C), `resolveCharacterIcon` returns the
      `rain`/`mild` asset path from `CHARACTER_ICONS`.
- [X] T006 [US1] Integration test in `tests/integration/weatherIconOverview.test.tsx` (existing
      "Today summary card" describe block): with a known `currentCondition`/`currentTemperature`,
      the rendered Overview shows a character image beside the weather icon, and the card's
      existing "Now"/"High"/"Low" text is still present.

### Implementation for User Story 1

- [X] T007 [US1] In `src/components/weatherCharacterIcons.ts`, implement
      `mapConditionToPrecipCategory(condition: WeatherCondition): PrecipCategory` per research.md
      §4 (rain/heavy-rain→rain, thunderstorm→thunder, sleet→sleet, light-snow/heavy-snow→snow,
      everything else→dry — `windy`'s fallback covered in Phase 4/US2).
- [X] T008 [US1] In `src/components/weatherCharacterIcons.ts`, implement
      `mapTemperatureToBand(celsius: number): TempBand` per research.md §4 band thresholds
      (`< -20`→frozen, `[-20,0)`→cold, `[0,15)`→mild, `[15,25)`→warm, `>= 25`→hot).
- [X] T009 [US1] In `src/components/weatherCharacterIcons.ts`, implement
      `resolveCharacterIcon(condition: WeatherCondition | null, temperatureCelsius: number | null):
      string | null`, composing T007+T008+`CHARACTER_ICONS`; returns `null` when `condition` is
      `null` or `temperatureCelsius` is `null` (US3 adds the high/low-midpoint fallback for the
      latter case — see Phase 5).
- [X] T010 [US1] In `src/components/TodaySummaryCard.tsx`, call `resolveCharacterIcon` with the
      card's existing `condition` value and `currentTemperature`, and render the resolved asset as
      an `<img className="today-summary-character" aria-hidden="true" alt="" />` beside the
      existing `.today-summary-icon` element (nothing rendered when the resolver returns `null`).
      (Implemented together with T019's high/low-midpoint fallback in the same edit.)
- [X] T011 [P] [US1] In `src/index.css`, add `.today-summary-character` styling: sized no larger
      than the existing weather icon, positioned beside it (not overlapping), with layout that
      doesn't push or crowd the surrounding high/low/description text (FR-006).

**Checkpoint**: User Story 1 is fully functional and independently testable — the character shows
up correctly whenever both a condition and a temperature are available.

---

## Phase 4: User Story 2 - Consistent coverage across all weather/temperature combinations (Priority: P2)

**Goal**: Every one of the 25 precipitation × temperature-band combinations resolves to its own
distinct, correctly-matched character — not just the one pair exercised in User Story 1.

**Independent Test**: Iterate all 5 `PrecipCategory` × 5 `TempBand` combinations through
`resolveCharacterIcon`/`CHARACTER_ICONS` and confirm each yields a distinct asset path; separately
confirm a `windy` condition and boundary temperatures resolve as documented.

### Tests for User Story 2

- [X] T012 [P] [US2] Unit test in `tests/unit/weatherCharacterIcons.test.ts`: for all 25
      `PrecipCategory` × `TempBand` combinations, `CHARACTER_ICONS[precip][band]` is a defined,
      distinct string (no two combinations point at the same asset, none are `undefined`).
- [X] T013 [P] [US2] Unit test in `tests/unit/weatherCharacterIcons.test.ts`:
      `mapConditionToPrecipCategory("windy")` returns `"dry"` (Edge Cases fallback — no dedicated
      windy art).
- [X] T014 [P] [US2] Unit test in `tests/unit/weatherCharacterIcons.test.ts`:
      `mapTemperatureToBand` at each boundary value (`-20`, `0`, `15`, `25`) returns the warmer of
      its two adjacent bands (Edge Cases).
- [X] T015 [US2] Unit test in `tests/unit/weatherCharacterIcons.test.ts`:
      `mapConditionToPrecipCategory("thunderstorm")` returns `"thunder"`, distinct from
      `"heavy-rain"`'s `"rain"` — confirms thunder gets its own reaction art, not a plain rain
      outfit (US2 Acceptance Scenario 2).

**Checkpoint**: User Stories 1 AND 2 both work independently — full 25-combination coverage is
proven, on top of US1's baseline single-combination rendering.

---

## Phase 5: User Story 3 - Graceful behavior when conditions can't be classified (Priority: P3)

**Goal**: Incomplete data (no classifiable condition, or no current temperature) never produces a
broken image or a layout defect — the character is simply omitted, or falls back to the day's
high/low midpoint for temperature banding.

**Independent Test**: Render `TodaySummaryCard`/`resolveCharacterIcon` with `condition = null`
(character omitted, rest of card unaffected) and separately with a valid condition but
`currentTemperature = null` alongside a present `today.high`/`today.low` (character renders using
the midpoint-derived band).

### Tests for User Story 3

- [X] T016 [P] [US3] Unit test in `tests/unit/weatherCharacterIcons.test.ts`:
      `resolveCharacterIcon(null, 10)` returns `null`.
- [X] T017 [US3] Integration test in `tests/integration/weatherIconOverview.test.tsx`: with no
      classifiable condition, no character image renders, and the rest of the Today card (icon,
      text) renders exactly as it does today, with no console error.
- [X] T018 [US3] Integration test in `tests/integration/weatherIconOverview.test.tsx`: with a valid
      condition but no `currentTemperature`, and a present `today.high`/`today.low`, the character
      still renders, using the temperature band implied by the high/low midpoint.

### Implementation for User Story 3

- [X] T019 [US3] In `src/components/TodaySummaryCard.tsx`, when `currentTemperature` is
      `null`/`undefined`, pass `(today.high + today.low) / 2` to `resolveCharacterIcon` instead
      (research.md §5) rather than omitting the character outright. (Implemented alongside T010.)

**Checkpoint**: All three user stories are independently functional — baseline rendering (US1),
full-matrix correctness (US2), and graceful degradation on incomplete data (US3).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T020 [P] Run `npm run lint`.
- [X] T021 [P] Run `npx tsc -b`.
- [X] T022 Run `npm test` (full suite).
- [X] T023 Run `npm run build`.
- [X] T024 Bump `package.json` version (patch).
- [X] T025 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (assets + lookup table
  don't exist until T002-T004 complete).
- **User Story 1 (Phase 3)**: Depends on Foundational only.
- **User Story 2 (Phase 4)**: Depends on Foundational only; in practice runs after US1 since it
  tests the same `resolveCharacterIcon`/`CHARACTER_ICONS` T007-T009 already implement, but adds no
  new implementation of its own — pure additional coverage.
- **User Story 3 (Phase 5)**: Depends on Foundational and on `resolveCharacterIcon` existing
  (T009, from US1) — its one implementation task (T019) extends `TodaySummaryCard`'s existing call
  site from US1's T010.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Within Each User Story

- Tests before/alongside their implementation task, per this project's existing convention of
  verifying behavior via the full suite before commit (not strict TDD red-green).
- T007→T008→T009 must run in that order (each composes the previous). T010 depends on T009. T011
  ([P]) is independent (CSS-only).

### Parallel Opportunities

- T005 (US1 unit test) can be written in parallel with T007-T009 (implementation), since it targets
  the same module but a different concern (test file vs. implementation file) — though in practice
  finish T009 first so the test has something to assert against.
- T011 (CSS) is fully parallel with T007-T010.
- All of Phase 4's tests (T012-T015) are `[P]` — independent assertions in the same test file, no
  shared mutable state.
- T016 (US3 unit test) is `[P]` with Phase 4's tests; T017/T018 (integration) depend on T019 being
  implemented first to pass, but can be written beforehand.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (crop script, run it, lookup table) — CRITICAL, blocks everything.
3. Complete Phase 3: User Story 1 — character renders for the common case.
4. **STOP and VALIDATE**: run `npm run dev`, confirm the character shows up correctly per
   quickstart.md step 3.

### Incremental Delivery

1. Setup + Foundational → assets and lookup table ready.
2. Add User Story 1 → character renders for one known condition → validate visually.
3. Add User Story 2 → full 25-combination correctness proven by tests (no visible behavior change,
   since the lookup table was already complete from Phase 2 — this closes the coverage gap in
   confidence, not in code).
4. Add User Story 3 → incomplete-data edge cases handled gracefully → validate via tests.
5. Polish → lint/typecheck/full test suite/build/version bump/commit.
