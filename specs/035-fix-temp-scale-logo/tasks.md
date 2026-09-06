# Tasks: Fix Temperature Scale Layout and Add Header Logo

**Input**: Design documents from `/specs/035-fix-temp-scale-logo/`
**Prerequisites**: plan.md, research.md, data-model.md, quickstart.md

**Tests**: Updates existing integration tests; no new test files (pure layout/text fix + one new
`<img>`, matching the existing `Footer`/header test patterns).

## Phase 1: Setup

*No setup work — all changes are edits to existing files.*

## Phase 2: Foundational (blocking prerequisites)

*No foundational/blocking work.*

## Phase 3: User Story 1 - Legible temperature degree scale (Priority: P1)

**Goal**: "Temp (°C)" label, degree-scale ticks nested to its left inside the same sticky title
box, no overlapping tick labels regardless of range width.

**Independent Test**: Render the temperature row with a narrow-range mocked series; assert the
title text and that no two rendered tick labels sit within the min-gap threshold of each other.

- [X] T001 [US1] In `src/components/WeatherIconOverview.tsx`, add a `dedupeCloseTicks(ticks: Tick[]): Tick[]`
  function (near `buildTicks`/`clampTickLabelPercent`): sorts ticks by clamped Y ascending, always
  keeps the first and last (boundary) ticks, and greedily keeps middle ticks only if their clamped
  Y is at least `MIN_TICK_LABEL_GAP_PERCENT` (new constant, 16) away from the last kept tick's
  clamped Y — dropping the second-to-last kept tick in favor of the boundary tick if they'd
  collide (research.md §2)
- [X] T002 [US1] In `src/components/WeatherIconOverview.tsx`'s `LineRow`, keep `ticks` (from
  `buildTicks`) as the source for SVG gridlines (unchanged), but compute a separate
  `labelTicks = dedupeCloseTicks(ticks)` for the rendered tick `<span>` elements
- [X] T003 [US1] In `src/components/WeatherIconOverview.tsx`'s `LineRow` JSX, move the
  `.weather-timeline-temp-scale` block (now rendering `labelTicks`) out of
  `.weather-timeline-line-area` and into `.weather-timeline-row-title`, positioned before the
  label text; wrap the existing `{row.label} ({row.unitLabel}) {subLabel}` content in a
  `<span className="weather-timeline-row-title-text">` sibling so the two sit side-by-side
  (research.md §1)
- [X] T004 [US1] Change the temperature row's label text from "Temperature" to "Temp" — find
  where `TimelineRow` objects are constructed for the temperature row (in `timelineData.ts` or
  wherever `label:` is set for `key: "temperature"`) and update the string
- [X] T005 [P] [US1] In `src/index.css`, retarget `.weather-timeline-temp-scale`: remove
  `position: sticky; left: 7rem; z-index: 1; background: var(--surface);` (no longer its own
  sticky column) and instead give it `position: relative; height: 70px; flex: 0 0 1.75rem; width:
  1.75rem;` so it sits as a fixed-width sub-box inside `.weather-timeline-row-title`
- [X] T006 [P] [US1] In `src/index.css`, add a rule scoping `.weather-timeline-row-temperature
  .weather-timeline-row-title` to `display: flex; align-items: flex-start; gap: 0.35rem;` (only
  the temperature row's title needs the scale-plus-text side-by-side layout; other rows'
  `.weather-timeline-row-title` stays a plain block)
- [X] T007 [US1] Update `tests/integration/weatherIconOverview.test.tsx`: any assertion expecting
  the literal text "Temperature" now expects "Temp"; add/update an assertion that renders a
  narrow-temperature-range mocked series and checks the rendered `.weather-timeline-temp-scale-tick`
  elements' count/positions don't include two within the min-gap threshold (or, more simply,
  that the number of rendered tick labels is reduced versus the full 5°-step count when the range
  is narrow)

**Checkpoint**: `npm run test` passes for `weatherIconOverview.test.tsx`; `npm run dev` shows
"Temp (°C)" with the scale to its left, no overlapping numbers on a narrow-range day.

---

## Phase 4: User Story 2 - Brand logo visible in the app (Priority: P2)

**Goal**: Tengmo Väder logo visible in the header's top-left, on every view, without crowding
other header controls.

**Independent Test**: Render `<App />`, assert an `<img>` with the Tengmo Väder alt text is
present.

- [X] T008 [US2] In `src/App.tsx`, add `<img src="/icon-192.png" alt="Tengmo Väder" className="app-logo" />`
  as the first child inside the `.current-conditions` div (before `<LocationPanel>`)
- [X] T009 [P] [US2] In `src/index.css`, add `.app-logo { height: 2rem; width: 2rem; object-fit:
  contain; align-self: center; flex-shrink: 0; }`
- [X] T010 [US2] Update `tests/integration/appHeader.test.tsx`: add an assertion that
  `screen.getByAltText("Tengmo Väder")` (or equivalent role/alt query) is present

**Checkpoint**: `npm run test` passes for `appHeader.test.tsx`; `npm run dev` shows the logo in
the header's top-left at both desktop and a narrow (375px) viewport, on every view.

## Dependencies & Execution Order

- T001 → T002 → T003 (each builds on the previous within the same file/function).
- T004 is independent text-only, can run anytime.
- T005/T006 (CSS) can run in parallel with T001-T004 but must land before/alongside T003 for the
  new layout to render correctly.
- T007 depends on T001-T006 being in place to assert against.
- Phase 4 (T008-T010) is entirely independent of Phase 3.

## Implementation Strategy

Single small PR-sized change; do both user stories together (P1 is the correctness fix, P2 is
small and unrelated but bundled per the user's own combined request).
