---

description: "Task list for Dashboard Polish Round Six"
---

# Tasks: Dashboard Polish Round Six

**Input**: Design documents from `/specs/021-dashboard-polish-round-six/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested for this round; existing unit/integration suites are updated
where a changed contract breaks an existing assertion, per this session's established practice
(no new dedicated test-first tasks).

**Organization**: Tasks are grouped by user story (P1: US1, US2, US3; P2: US4, US5; P3: US6) so
each can be validated independently via quickstart.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Phase 1: Setup

No new project setup required — all changes touch existing files in the existing `src/` structure.

---

## Phase 2: Foundational

No blocking prerequisites — all six user stories touch disjoint files/concerns and can proceed
directly.

---

## Phase 3: User Story 1 - See when the forecast was actually issued (Priority: P1) 🎯 MVP

**Goal**: Replace the nonexistent `approvedTime` field with SMHI's real `referenceTime` field so
`forecastIssuedAt` finally carries SMHI's genuine forecast-issued time.

**Independent Test**: Load the dashboard for an SMHI-covered location; confirm the footer's
freshness time matches SMHI's own published forecast-issue time (per quickstart.md US1).

### Implementation for User Story 1

- [X] T001 [US1] Rename `SmhiForecastResponse.approvedTime` to `referenceTime` in
      `src/services/smhiProvider.ts`, per data-model.md
- [X] T002 [US1] Update `fetchForecastTimeSeries` in `src/services/smhiProvider.ts` to read
      `data.referenceTime ?? null` instead of `data.approvedTime ?? null`
- [X] T003 [US1] Update any existing SMHI-mock fixtures in `tests/` that set `approvedTime` to use
      `referenceTime` instead, so `forecastIssuedAt` assertions reflect the corrected field
      (search `tests/unit/smhiProvider*.test.ts` and any integration mocks using this shape)

**Checkpoint**: US1 is independently complete — `forecastIssuedAt` now threads SMHI's real
`referenceTime` end to end (existing 019/020 plumbing unchanged).

---

## Phase 4: User Story 2 - See clear evidence the forecast blends both sources (Priority: P1)

**Goal**: Extend the footer's disclosure text to name both forecast sources when the forecast
genuinely blends them.

**Independent Test**: View a forecast period blending both sources; confirm the footer names both
sources (per quickstart.md US2). Depends on nothing from US1 (different function signature change,
same file family only incidentally).

### Implementation for User Story 2

- [X] T004 [P] [US2] Add a `combined: boolean` third parameter to `dataSourceDisclosure` in
      `src/services/format.ts`, switching the forecast label to `"SMHI + Open-Meteo forecast"`
      when true, per data-model.md
- [X] T005 [US2] Add a `combinedForecast: boolean` prop to `FooterProps` in
      `src/components/Footer.tsx` and thread it into the `dataSourceDisclosure` call (depends on
      T004's new signature)
- [X] T006 [US2] Pass `combinedForecast={multiSourceForecast.length > 1}` to `<Footer>` in
      `src/App.tsx` (depends on T005)
- [X] T007 [P] [US2] Update `tests/unit/format.test.ts`'s `dataSourceDisclosure` test cases to pass
      the new `combined` parameter and assert the `"SMHI + Open-Meteo forecast"` wording when true
- [X] T008 [P] [US2] Update `tests/integration/footer.test.tsx` to cover the new `combinedForecast`
      prop (both true and false cases)

**Checkpoint**: US1 and US2 both independently complete and functional together.

---

## Phase 5: User Story 3 - An accurate rain forecast bar chart (Priority: P1)

**Goal**: Move the chance-of-rain percentage inline with the value text so every Rain-row cell
always stacks exactly two flex children, eliminating the baseline-shift bug.

**Independent Test**: View Rain-row periods with and without a rain-probability percentage;
confirm all bars share the same baseline (per quickstart.md US3). Independent of US1/US2 (own
component/CSS).

### Implementation for User Story 3

- [X] T009 [US3] Move the chance-of-rain `<span>` inline inside `.weather-timeline-bar-value` in
      the Rain row of `src/components/WeatherIconOverview.tsx`, per data-model.md's before/after
      JSX
- [X] T010 [P] [US3] Confirm `.weather-timeline-bar-chance` in `src/index.css` still applies
      correctly as an inline child (font-size/color/opacity unchanged; no `display:block` or
      similar remains that would force it onto its own line)
- [X] T011 [P] [US3] Update any existing snapshot/DOM assertions in
      `tests/integration/weatherIconOverview.test.tsx` that check the chance-of-rain markup
      structure to reflect the new inline placement

**Checkpoint**: US1, US2, US3 (all P1) independently complete — MVP scope reached.

---

## Phase 6: User Story 4 - Readable location panel in every theme (Priority: P2)

**Goal**: Add a two-layer `box-shadow` (dark elevation + light 1px ring) to the location panel and
display menu for contrast against dark themes.

**Independent Test**: Open the location panel in the default theme; confirm its edge is clearly
visible (per quickstart.md US4). Independent of all P1 stories.

### Implementation for User Story 4

- [X] T012 [P] [US4] Replace `.location-panel-content`'s single-layer `box-shadow` with the
      two-layer shadow in `src/index.css`, per data-model.md
- [X] T013 [P] [US4] Replace `.display-menu-content`'s single-layer `box-shadow` with the same
      two-layer shadow in `src/index.css`, per data-model.md
- [X] T014 [P] [US4] Update `tests/unit/indexCssGlassTheme.test.ts` (or add a case) asserting the
      two-layer `box-shadow` is present on both rules, following this session's established
      CSS-source regression-test pattern

**Checkpoint**: US4 independently complete.

---

## Phase 7: User Story 5 - Consistent forecast icons everywhere (Priority: P2)

**Goal**: Change `WeeklyForecastStrip.tsx`'s icon size from 24 to 28 to match `ConditionRow`.

**Independent Test**: Compare a day's icon in the 7-day strip against the main timeline; confirm
matching size (per quickstart.md US5). Independent of all other stories.

### Implementation for User Story 5

- [X] T015 [US5] Change the day icon `size={24}` to `size={28}` in
      `src/components/WeeklyForecastStrip.tsx`, per data-model.md
- [X] T016 [P] [US5] Update any existing test in `tests/` asserting `WeeklyForecastStrip`'s icon
      size prop to expect `28` instead of `24`

**Checkpoint**: US4 and US5 (both P2) independently complete.

---

## Phase 8: User Story 6 - The app version visibly advances with each release (Priority: P3)

**Goal**: Bump `package.json`'s version so the footer's displayed version advances.

**Independent Test**: Compare the footer's version number before/after this round ships (per
quickstart.md US6).

### Implementation for User Story 6

- [X] T017 [US6] Bump `"version"` in `package.json` from `0.1.0` to `0.1.1`, per data-model.md

**Checkpoint**: All six user stories independently complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories together

- [X] T018 Run `npm test` and fix any remaining failures introduced by T001-T017
- [X] T019 Run `npm run lint` and fix any issues
- [X] T020 Run `npm run build` and confirm a clean build
- [X] T021 Start `npm run dev` and manually walk through all 6 scenarios in
      `specs/021-dashboard-polish-round-six/quickstart.md` (live Playwright verification for the
      CSS/layout-sensitive items — US3's bar baselines, US4's panel contrast, US5's icon sizing —
      matching this session's established live-testing practice, since jsdom cannot assert real
      computed layout)
- [X] T022 Confirm the footer's displayed version (per `src/services/appVersion.ts`) reflects the
      `package.json` bump from T017

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: None — skipped, no blocking prerequisites
- **User Stories (Phase 3-8)**: All fully independent of one another (disjoint files); may proceed
  in any order or in parallel
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### Within Each User Story

- US2: T004 → T005 → T006 (same-chain prop threading); T007/T008 can run parallel to each other
  and after T004
- US3: T009 first (JSX change); T010/T011 can follow in parallel
- US4: T012/T013/T014 fully parallel (independent CSS rules/tests)
- US1, US5, US6: essentially single-chain, minimal internal dependency

### Parallel Opportunities

- All of US1, US2, US3, US4, US5, US6 can be implemented in parallel by different contributors —
  no shared files across stories except `src/index.css` (US3 touches `.weather-timeline-bar-chance`,
  US4 touches `.location-panel-content`/`.display-menu-content` — different rules, safe to
  parallelize with care around the same file)

---

## Parallel Example: User Story 4

```bash
Task: "Replace .location-panel-content's box-shadow in src/index.css"
Task: "Replace .display-menu-content's box-shadow in src/index.css"
Task: "Update tests/unit/indexCssGlassTheme.test.ts for the two-layer box-shadow"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3, all P1)

1. Complete Phase 3 (US1), Phase 4 (US2), Phase 5 (US3) — the three genuine defects
2. **STOP and VALIDATE**: Run quickstart.md scenarios US1-US3
3. Deploy/demo if ready

### Incremental Delivery

1. US1 → US2 → US3 (P1 defects) → validate → MVP
2. US4 → US5 (P2 polish) → validate
3. US6 (P3 housekeeping) → validate
4. Phase 9 polish pass across everything → commit + push (per standing memory:
   commit+push automatically after `/speckit-implement`, with the version bump from T017 included
   in that same commit)
