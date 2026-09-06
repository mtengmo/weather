---

description: "Task list for Restore Rain Chance & Remove Overview Blend Count"
---

# Tasks: Restore Rain Chance & Remove Overview Blend Count

**Input**: Design documents from `/specs/024-restore-rain-chance/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested for this round; existing unit/integration suites are updated
where a changed behavior breaks an existing assertion, per this session's established practice.

**Organization**: Tasks are grouped by user story (P1: US1, P2: US2), matching spec.md's
priorities.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No new project setup required — both changes touch existing files only.

---

## Phase 2: Foundational

No blocking prerequisites — US1 and US2 touch entirely disjoint files (`smhiProvider.ts` vs
`WeatherIconOverview.tsx`) and can proceed in any order.

---

## Phase 3: User Story 1 - The rain-probability percentage is reliably shown again (Priority: P1) 🎯 MVP

**Goal**: Parse SMHI's own `probability_of_precipitation` field into `chanceOfRain` so the Rain
row's percentage shows up whenever SMHI is the forecast source, not just when the Open-Meteo
fallback happens to fire.

**Independent Test**: View the Rain row for a forecast period where rain is expected; confirm a
percentage appears next to the mm value, positioned inline (per quickstart.md US1).

### Implementation for User Story 1

- [X] T001 [US1] Add `probability_of_precipitation?: number` to `SmhiForecastData` in
      `src/services/smhiProvider.ts`, per data-model.md
- [X] T002 [US1] Set `chanceOfRain: data?.probability_of_precipitation ?? null` on each forecast
      observation in `buildForecastHourlySeries` in `src/services/smhiProvider.ts`
- [X] T003 [P] [US1] Add a unit test in `tests/unit/smhiProvider.test.ts` asserting a mocked
      `probability_of_precipitation: 70` results in `chanceOfRain: 70` on the corresponding
      forecast observation, and that an absent field results in `chanceOfRain: null`

**Checkpoint**: US1 is independently complete — the Rain row's percentage now reflects SMHI's own
data whenever SMHI supplies the forecast.

---

## Phase 4: User Story 2 - The Overview no longer shows a source-count on blended values (Priority: P2)

**Goal**: Remove the "(avg)"/"(avg of N)" inline annotation from the Overview's blended forecast
values, leaving the footer as the sole place blending is disclosed.

**Independent Test**: View a forecast period whose value blends multiple sources; confirm no
"(avg)"-style text appears next to it, while the footer's own disclosure is unaffected (per
quickstart.md US2).

### Implementation for User Story 2

- [X] T004 [US2] Remove the `(avg...)` branch from `LineRow`'s value rendering in
      `src/components/WeatherIconOverview.tsx`, falling through directly to the existing
      high/low-or-plain-value rendering, per data-model.md
- [X] T005 [P] [US2] Update `tests/integration/weatherIconOverview.test.tsx`'s two existing
      "(avg)"/"(avg of 3)" tests (added in 020-dashboard-polish-round-five and
      022-met-forecast-source) to assert the plain value renders with no "(avg" text instead

**Checkpoint**: US1 and US2 both independently complete.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T006 Run `npm test` and fix any regressions introduced by T001-T005
- [X] T007 Run `npm run lint` and fix any issues
- [X] T008 Run `npm run build` and confirm a clean build
- [X] T009 Start `npm run dev` and manually walk through both scenarios in
      `specs/024-restore-rain-chance/quickstart.md` via live Playwright verification — especially
      confirming a real SMHI-sourced forecast period now shows a rain percentage and that bar
      baselines remain aligned (jsdom can't verify real computed layout), matching this session's
      established live-testing practice
- [X] T010 Bump `package.json`'s version as the final step before commit, per standing practice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: None — skipped, no blocking prerequisites
- **User Stories (Phase 3-4)**: Fully independent of one another (disjoint files) — may proceed in
  any order or in parallel
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within Each User Story

- US1: T001 → T002 (same file, sequential) → T003 (test, can follow immediately)
- US2: T004 → T005 (test depends on the implementation change to know the new expected output)

### Parallel Opportunities

- US1 and US2 can be implemented in parallel by different contributors — no shared files
- T003 and T005 (both test-only tasks in different files) are mutually parallel

---

## Parallel Example

```bash
Task: "Add probability_of_precipitation parsing to src/services/smhiProvider.ts (US1)"
Task: "Remove the (avg...) branch from src/components/WeatherIconOverview.tsx (US2)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3 (US1: restore rain-probability)
2. **STOP and VALIDATE**: Run quickstart.md's US1 scenario
3. Deploy/demo if ready

### Incremental Delivery

1. US1 (P1, restore data) → validate → MVP
2. US2 (P2, remove annotation) → validate
3. Phase 5 polish pass across everything → commit + push (per standing memory: commit+push
   automatically after `/speckit-implement`, with the version bump from T010 included in that
   same commit)
