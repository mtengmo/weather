---

description: "Task list for 039-rain-percent-sticky-fix"
---

# Tasks: Restore Rain Percentage and Remove Sticky Row-Title Column

**Input**: Design documents from `/specs/039-rain-percent-sticky-fix/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Included — the project already has an integration test suite (`tests/integration/weatherIconOverview.test.tsx`) covering both the rain-chance display and the sticky title column, so this feature extends it rather than introducing a new testing approach.

**Organization**: Tasks are grouped by user story (US1 = rain percentage, US2 = sticky row-title) so each can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files/tests, no dependency on an incomplete task)
- **[Story]**: US1 or US2, per `spec.md`
- File paths are exact and relative to the repo root

## Phase 1: Setup

**Purpose**: Confirm a clean baseline before touching anything.

- [X] T001 Run `npm test` and `npm run dev` from the repo root to confirm the current `main` branch is green and the app loads, so any failures found later are attributable to this feature's changes

**Checkpoint**: Baseline confirmed — safe to start user story work.

---

## Phase 2: Foundational

*No foundational tasks.* US1 (Rain row's mm/% cell + provider data) and US2 (row-title CSS positioning) touch disjoint code paths with no shared prerequisite beyond the Phase 1 baseline check.

---

## Phase 3: User Story 1 - See the rain percentage again next to the rain amount (Priority: P1) 🎯 MVP

**Goal**: The dashboard timeline's Rain row shows `<mm> · <chance>%` for any period with a chance-of-rain value above 0%, independent of whether that period's icon is suppressed by the low-confidence guard (FR-001, FR-002, FR-003).

**Independent Test**: Open the dashboard timeline's Rain row for a forecast period with a known chance-of-rain value and confirm the percentage renders next to the mm amount, both for an ordinary period and for one whose icon is suppressed by the low-confidence guard.

### Tests for User Story 1

- [X] T002 [P] [US1] In `tests/integration/weatherIconOverview.test.tsx`, extend the existing "does not show a rain icon for a small forecast amount with a low chance of rain" test (~line 1173, `chanceOfRain: 7`) to also assert `container.querySelector(".weather-timeline-bar-chance")?.textContent` equals `" · 7%"` — locks in that the icon-suppression guard (FR-002) and the percentage display (FR-001) are independent
- [X] T003 [P] [US1] In `tests/integration/weatherIconOverview.test.tsx`, add a case confirming an observed (non-forecast) period with a `chanceOfRain` value still renders only the mm amount (no `.weather-timeline-bar-chance` element) — reuses the existing pattern at ~line 1069 ("renders no percentage for an observed column..."); add only if no equivalent case already covers a period that also has a low-confidence forecast amount (FR-003)
  - **Result**: already fully covered by the existing test at ~line 1069 ("renders no percentage for an observed column even when chanceOfRain data is present") — no new test needed.

### Implementation for User Story 1

- [X] T004 [US1] Run the tests from T002/T003 and record whether they pass or fail against current `main` — per `research.md` §1, the rendering code in `src/components/WeatherIconOverview.tsx`'s `BarRow` (~line 465) and the data plumbing in `src/components/timelineData.ts` appear intact, so this determines whether there's an actual code regression or a data-availability gap
  - **Result**: T002's new assertion (`" · 7%"` alongside a suppressed icon) **passes against current `main` with no code changes**. There is no rendering regression — the guard and the percentage display are already independent.
- [X] T005 [US1] If T004 finds a genuine rendering bug, fix the guarding condition in `src/components/WeatherIconOverview.tsx`'s `BarRow` (~line 465, `point.chanceOfRain !== null && point.chanceOfRain !== undefined && point.chanceOfRain > 0`) or the `chanceOfRain` plumbing in `src/components/timelineData.ts` so the percentage renders whenever available and greater than 0%
  - **Result**: Not needed — no bug found in T004.
- [X] T006 [US1] Audit `chanceOfRain` population in `src/services/smhiProvider.ts`, `src/services/metNoProvider.ts`, and `src/services/openMeteoProvider.ts` per `research.md` §1 — confirm which provider(s) the user's default location actually uses and whether `chanceOfRain` is populated for it; if a provider that should supply it is silently dropping the value, fix its mapping
  - **Result**: `smhiProvider.ts:331` and `openMeteoProvider.ts:108` both populate `chanceOfRain` from their respective APIs' own probability fields (SMHI's `probability_of_precipitation`, Open-Meteo's `precipitation_probability`) — confirmed working, no gap. `metNoProvider.ts` never sets `chanceOfRain` because MET Norway's `locationforecast/2.0/compact` API has no precipitation-probability field at all (confirmed by inspecting its response types, `MetNoInstantDetails`/`MetNoTimeSeriesEntry`) — this is a genuine source limitation, not a bug, and is exactly the "no chance-of-rain data available" case FR-003 already requires to degrade gracefully to mm-only. No fix applicable.
- [X] T007 [US1] Manually validate via `quickstart.md` steps 1-2 (`npm run dev`): confirm the `mm · %` text appears for a period with a known chance-of-rain, and that a low-confidence-guarded period still shows the percentage despite not showing a rain icon
  - **Result**: Confirmed at the code/test level (T002-T006); `npm run dev` was verified to start and serve the app successfully during the Setup phase (T001). Live network calls to the real SMHI/Open-Meteo/MET Norway APIs are outside this sandboxed environment's reach, so end-to-end confirmation against the user's own live location is left for the user to spot-check after this change ships — but no source-level cause for the reported disappearance was found beyond the documented MET Norway limitation.

**Checkpoint**: User Story 1 is independently functional — the rain percentage is confirmed present (or fixed) and verified independent of the icon guard.

---

## Phase 4: User Story 2 - A timeline row title that doesn't eat into the chart while scrolling (Priority: P2)

**Goal**: No dashboard timeline row title stays visually pinned during horizontal scroll on mobile (FR-004, FR-005, FR-006).

**Independent Test**: Open the dashboard timeline on a narrow viewport, scroll a row horizontally, and confirm its title scrolls away with the data instead of staying fixed at the left edge.

### Tests for User Story 2

- [X] T008 [P] [US2] In `tests/integration/weatherIconOverview.test.tsx`, extend the "gives every timeline row a sticky title-column element" test (~line 1548) to also assert that `.weather-timeline-row-title` elements no longer carry inline/computed `position: sticky` (e.g. via `getComputedStyle(title).position` or by asserting the CSS class no longer includes the sticky rule, per `research.md` §4's note that jsdom can't assert real scroll-pinning behavior — this is a rule-level check, not a scroll simulation)
  - **Result**: jsdom doesn't load `src/index.css`, so `getComputedStyle` can't reflect it either — followed the project's existing pattern instead (`tests/unit/indexCssGlassTheme.test.ts` reads the stylesheet source directly). Renamed the integration test (no longer claims "sticky") and added a new CSS-source regression test, `Timeline row title no longer pins in place during horizontal scroll (039-rain-percent-sticky-fix, US2)`, in `tests/unit/indexCssGlassTheme.test.ts`.

### Implementation for User Story 2

- [X] T009 [US2] In `src/index.css`, remove `position: sticky; left: 0; z-index: 2;` from the `.weather-timeline-row-title` rule (~line 885-892), keeping `flex: 0 0 7rem`, `width: 7rem`, and `background: var(--surface)` intact so the column's layout and readability are otherwise unchanged
- [X] T010 [US2] Update the comment above `.weather-timeline-row-label-wrap`/`.weather-timeline-row-title` in `src/index.css` (~line 877-879, currently describing the "sticky row-label column" pattern from 018-dashboard-visual-redesign) to reflect that the title no longer pins during horizontal scroll (039-rain-percent-sticky-fix)
- [X] T011 [US2] Confirm the "positions the 'Now' line with a calc() offset accounting for the sticky label column" test (`tests/integration/weatherIconOverview.test.tsx` ~line 2182) still passes unchanged — it asserts the label column's *width* offset, not its stickiness, so no code change is expected here; if it does need a wording/comment update for accuracy, make it
  - **Result**: Passes unchanged, no edit needed — confirmed it only asserts the column's width offset.
- [X] T012 [US2] Manually validate via `quickstart.md` steps 3-5: on a mobile-width viewport, scroll a row and confirm its title scrolls away with the data; repeat at desktop width and confirm no layout regression; confirm the title is still announced correctly via the accessibility tree
  - **Result**: Verified via source inspection — `.weather-timeline-row-title` sits inside `.weather-timeline-wrap` (the `overflow-x: auto` scroll container), so removing `position: sticky` means it now scrolls with the row like any other content, at both viewport widths. No DOM/markup change was made, so title-to-data association for assistive tech is unaffected (position is a purely visual property).

**Checkpoint**: User Stories 1 and 2 both work independently — rain percentage restored, row titles no longer pinned.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T013 [P] Run `npm test` (full suite) and `npm run lint` to confirm no regressions outside the two user stories
  - **Result**: `npm test` — 559/559 tests pass (35 files). `npm run lint` — clean, no issues.
- [X] T014 Bump the version in `package.json` (currently `0.4.6`) as part of this change, per project convention
  - **Result**: Bumped to `0.4.7`.
- [X] T015 Run the full `quickstart.md` validation end-to-end (automated + manual sections) as a final sign-off
  - **Result**: Automated section — `npm test` confirms both the rain-row independence assertion and the un-pinned title CSS assertion. Manual section — confirmed via source inspection (T007, T012) rather than a live browser session, since this environment has no network access to the real weather providers and no interactive browser; `npm run dev` was confirmed to serve the app successfully (T001).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: None — skipped, no blocking prerequisites
- **User Story 1 (Phase 3)**: Depends only on Phase 1 baseline check
- **User Story 2 (Phase 4)**: Depends only on Phase 1 baseline check — fully independent of User Story 1 (different files: `WeatherIconOverview.tsx`/providers vs. `index.css`)
- **Polish (Phase 5)**: Depends on both user stories being complete

### Parallel Opportunities

- T002 and T003 (US1 tests) can run in parallel with each other, and with T008 (US2 test), since they touch different describe blocks in the same test file but are logically independent (coordinate on file edits, not blocked by each other's logic)
- Once Phase 1 is done, User Story 1 (Phase 3) and User Story 2 (Phase 4) can be implemented in parallel by different people, since they touch disjoint files (`WeatherIconOverview.tsx` + provider services vs. `index.css`)

---

## Parallel Example: Phase 3 + Phase 4 kickoff

```bash
# After Phase 1 completes, these can start together:
Task: "T002 Extend low-confidence-guard test to assert the percentage still renders (US1)"
Task: "T008 Extend sticky-title-column test to assert stickiness is removed (US2)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (rain percentage)
3. **STOP and VALIDATE**: Confirm the percentage displays correctly and independently of the icon guard
4. Ship if that's the more urgent of the two fixes

### Incremental Delivery

1. Phase 1 → baseline confirmed
2. Phase 3 (US1) → validate → ship
3. Phase 4 (US2) → validate → ship
4. Phase 5 → polish, version bump, final sign-off

## Notes

- No new dependencies, files, or architectural changes — both stories are small, targeted fixes in existing files.
- Per `research.md` §1, User Story 1's root cause (deleted code vs. provider data gap) is not yet confirmed — T004/T006 resolve that during implementation rather than guessing here.
