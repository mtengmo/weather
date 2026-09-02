# Tasks: Timeline Visual Styling from Mockup

**Input**: Design documents from `C:\GitRepos\weather\specs\010-timeline-visual-styling\`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/style-tokens.md](./contracts/style-tokens.md), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested in spec.md, but this repo has paired implementation with tests under `tests/unit/`/`tests/integration/` for every prior feature (005–011) — this plan continues that convention, scoped to structural class-presence assertions since jsdom can't assert real computed colors (research.md §3).

**Organization**: Tasks are grouped by user story (spec.md priorities: US1=P1 condition icons, US2=P1 row colors + gradient, US3=P2 now-column accent).

## Path Conventions

Single-project web frontend (unchanged). Source under `src/`; tests under the top-level `tests/unit/` and `tests/integration/`.

---

## Phase 1: Setup

- [X] T001 Verify the pre-010 baseline is clean: run `npm test`, `npx tsc -b --noEmit`, and `npm run build` against the current codebase before starting, so any failure surfaced later is known to be from this feature's changes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The theme-scoped color tokens defined here are consumed by every user story below.

- [X] T002 Add the new CSS custom properties to all three theme blocks in `src/index.css` (`:root, [data-theme="midnight"]`, `[data-theme="ivory"]`, `[data-theme="glass"]`), per research.md §1 / contracts/style-tokens.md: `--wx-sun`, `--wx-moon`, `--wx-cloud`, `--wx-rain`, `--wx-snow`, `--wx-windy`, `--row-temperature`, `--row-wind`, `--row-precipitation`, `--row-cloud`, `--row-feelsLike`, `--row-snow`, `--row-gust`, `--now-accent` — using the per-theme hex values from research.md §1.

**Checkpoint**: All color tokens exist in every theme; every task below can now reference them via `var(--...)`.

---

## Phase 3: User Story 1 - Weather condition icons that read at a glance (Priority: P1) 🎯 MVP

**Goal**: Each weather condition's icon renders in its own distinct, mockup-inspired color rather than a single uniform tone, legible across all three themes.

**Independent Test**: Open the timeline for a 24-hour series with a mix of conditions; confirm each condition's icon is visually distinguishable by color, not just shape, in every theme.

### Implementation for User Story 1

- [X] T003 [US1] Edit `src/components/WeatherIconOverview.tsx`'s `ConditionRow` (data-model.md, contracts/style-tokens.md): add a second class to the existing `.weather-timeline-condition` div — `` `weather-condition-${period.condition}` `` — only when `period.condition !== null` (mirrors the existing null-guard already used for the icon itself).
- [X] T004 [US1] Add one CSS rule per condition to `src/index.css`, scoping each condition's icon color to its token: `.weather-condition-clear-day svg { color: var(--wx-sun); }`, `.weather-condition-clear-night svg { color: var(--wx-moon); }`, `.weather-condition-cloudy svg { color: var(--wx-cloud); }`, `.weather-condition-rainy svg { color: var(--wx-rain); }`, `.weather-condition-snowy svg { color: var(--wx-snow); }`, `.weather-condition-windy svg { color: var(--wx-windy); }`. Depends on T002.
- [X] T005 [US1] Integration tests in `tests/integration/weatherIconOverview.test.tsx`: a clear-day column's condition cell carries `weather-condition-clear-day`; a clear-night column carries `weather-condition-clear-night`; a cloudy/rainy/snowy column each carries its own matching class — verifying every rendered condition's cell has a class distinct from every other condition present in the same series.

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable — this alone is a shippable MVP restyle.

---

## Phase 4: User Story 2 - Chart rows colored and shaded like the mockup (Priority: P1)

**Goal**: Each metric row (temperature, wind, precipitation, and any other line/bar rows currently rendered) uses its own distinct color instead of the app's shared default accent; the temperature row additionally has a soft gradient fill beneath its line; forecast-vs-observed distinction is preserved in each row's own color.

**Independent Test**: Open the timeline for a series with full data; confirm the temperature row's line has a distinct warm color with a gradient fill, and no two rows share the same color or the app's default accent.

### Implementation for User Story 2

- [X] T006 [US2] Edit `src/components/WeatherIconOverview.tsx`'s `LineRow`, `BarRow`, and `WindRow` (contracts/style-tokens.md, research.md §4): add a second class to each row's existing outer `.weather-timeline-row.weather-timeline-row-label-wrap` div — `` `weather-timeline-row-${row.key}` `` — reusing the `TimelineRow.key` values already present (`temperature`, `wind`, `precipitation`, `cloud`, `feelsLike`, `snow`, `gust` — whichever remain rendered at implementation time).
- [X] T007 [US2] Add per-row color rules to `src/index.css` for each row key present, replacing the shared `var(--accent)`/`var(--accent-2)` currently used by `.weather-timeline-line-observed`/`.weather-timeline-line-forecast`/`.weather-timeline-bar`/`.weather-timeline-wind-arrow`: scope each rule under `.weather-timeline-row-${key}` so, for example, `.weather-timeline-row-temperature .weather-timeline-line-observed`/`.weather-timeline-line-forecast` use `var(--row-temperature)`, `.weather-timeline-row-precipitation .weather-timeline-bar` uses `var(--row-precipitation)`, `.weather-timeline-row-wind .weather-timeline-wind-arrow` uses `var(--row-wind)`, and so on for every other currently-rendered row — preserving the existing solid/dashed and forecast-opacity treatments, just swapping the color source (FR-005). Depends on T002, T006.
- [X] T008 [US2] Add a gradient-fill rule to `src/index.css` scoped to `.weather-timeline-row-temperature .weather-timeline-line-area`, fading from `var(--row-temperature)` at the top toward transparent at the row's baseline (e.g. a `background: linear-gradient(...)` overlay behind the existing SVG, or an SVG `<linearGradient>` fill added to the temperature row's polyline/area in `WeatherIconOverview.tsx` if a CSS-only gradient can't be cleanly clipped to the line's shape). Depends on T002, T006.
- [X] T009 [US2] Integration tests in `tests/integration/weatherIconOverview.test.tsx`: the temperature row's container carries `weather-timeline-row-temperature`; the wind row's container carries `weather-timeline-row-wind`; the precipitation row's container carries `weather-timeline-row-precipitation` — each a distinct class from the others, confirming per-row styling hooks are present and distinguishable.

**Checkpoint**: User Stories 1 and 2 both work independently and together — the MVP visual restyle is complete.

---

## Phase 5: User Story 3 - The "now" column reads as a highlighted marker (Priority: P2)

**Goal**: The column immediately following the "now" line, and the line itself, both use a single consistent accent color distinct from every other column's styling.

**Independent Test**: Open the timeline for a series with an observed/forecast boundary; confirm the "now" column's values across every row are in a distinct accent color, matching the vertical marker line's own color.

### Implementation for User Story 3

- [X] T010 [US3] Edit `src/index.css`'s existing `.weather-timeline-now` rule (research.md §2): change `border-left` color from `var(--text-muted)` to `var(--now-accent)`. Depends on T002.
- [X] T011 [US3] In `src/components/WeatherIconOverview.tsx`, add a small shared helper (e.g. `isNowColumn(index, nowBoundaryIndex)`) returning `index === nowBoundaryIndex + 1` when `nowBoundaryIndex !== null`, else `false`; use it in `ConditionRow`, `LineRow`, `BarRow`, and `WindRow`'s per-cell rendering to add a `weather-timeline-now-column` class to that one cell in every row (research.md §2, contracts/style-tokens.md). Depends on T006.
- [X] T012 [US3] Add `.weather-timeline-now-column { color: var(--now-accent); }` to `src/index.css`. Depends on T002, T011.
- [X] T013 [US3] Integration tests in `tests/integration/weatherIconOverview.test.tsx`: for a series with an observed/forecast boundary, exactly one cell per row carries `weather-timeline-now-column`, at the same period index as the existing `.weather-timeline-now` marker's position; for a series with no forecast data (`nowBoundaryIndex === null`), no cell carries that class.

**Checkpoint**: All three user stories are independently functional and work together — the full mockup-inspired restyle is complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T014 [P] Run `npm run lint` and fix any issues in the touched files.
- [X] T015 Run `npm test`, `npx tsc -b --noEmit`, and `npm run build`; fix any failures across the extended test suite and the TypeScript build.
- [X] T016 Manually execute `specs/010-timeline-visual-styling/quickstart.md` scenarios 1-5 against the running dev server, using the Playwright setup already proven working in this repo's prior polish phases — capture screenshots across all three themes (Midnight, Bright, Glass) to verify legibility per FR-008/SC-004, and confirm no structural regressions (FR-009).
- [X] T017 [P] Confirm the new colors don't visually collide with existing UI elements that already use `var(--accent)`/`var(--accent-2)` elsewhere in the app (e.g. buttons, the main chart's own series colors) — spot-check via the Playwright pass from T016.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all three user stories — none of them can style anything without the color tokens existing.
- **User Story 1 (Phase 3)**: Depends on Foundational. Independent of US2/US3's content, though all three extend the same `WeatherIconOverview.tsx` and `index.css` files — sequence US1 before US2 before US3 if one person/agent is doing all three, to avoid merge conflicts within those two files.
- **User Story 2 (Phase 4)**: Depends on Foundational. T006 (adding row-key classes) is a natural extension of the same render functions US3's T011 also touches — land US2 before US3 in practice.
- **User Story 3 (Phase 5)**: Depends on Foundational and, for T011, on US2's T006 having already introduced per-row class handling in the same render functions (reduces merge conflicts, not a hard logical dependency).
- **Polish (Phase 6)**: Depends on whichever of Phases 3-5 are in scope for this delivery.

### Within Each Phase

- T002 before every other task (all reference the tokens it defines).
- T003 before T004 (CSS targets the class T003 introduces) before T005 (test).
- T006 before T007/T008 (CSS targets the classes T006 introduces) before T009 (test).
- T010 is independent of T011; T011 before T012 (CSS targets the class T011 introduces) before T013 (test).

### Parallel Opportunities

- T004 is `[P]` relative to nothing else in US1 (single task after T003) but the six per-condition CSS rules within it can be written together.
- T007 and T008 are independent CSS additions within US2, though both depend on T006 landing first.
- T010 is `[P]` relative to T011/T012 (different concerns: the line vs. the column cells) once T002 lands.
- T014 and T017 are `[P]` within Polish.

---

## Parallel Example: Foundational → User Story 1

```bash
# After T002 (tokens) lands, User Story 1 is fully self-contained:
Task: "Add weather-condition-* classes in ConditionRow (T003)"
Task: "Add per-condition CSS color rules (T004)"
Task: "Integration tests for condition icon colors (T005)"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational — the color tokens).
2. Complete Phase 3 (User Story 1) and Phase 4 (User Story 2) — both P1, together forming the
   mockup's two biggest visual departures (colorful icons + colored/gradient rows).
3. **STOP and VALIDATE**: run quickstart.md Scenarios 1-2 and 4 against a real location in all
   three themes.
4. Demo/ship if ready.

### Incremental Delivery

1. Setup + Foundational → color tokens exist, nothing visually changed yet.
2. Add User Story 1 → validate → ship (colorful condition icons).
3. Add User Story 2 → validate → ship (colored rows + temperature gradient) — MVP restyle complete.
4. Add User Story 3 → validate → ship (highlighted "now" column).
