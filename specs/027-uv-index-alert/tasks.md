---

description: "Task list for UV Index Risk Indicator"
---

# Tasks: UV Index Risk Indicator

**Input**: Design documents from `/specs/027-uv-index-alert/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the spec; regression/unit tests are added alongside each
change per this session's established practice (see e.g. `026-fix-3-day/tasks.md`).

**Organization**: Tasks are grouped by user story (P1: US1, P2: US2), matching spec.md's
priorities.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No new project setup required — no new runtime dependency (research.md §1); all changes touch
existing files plus one small new module already planned (none needed here — `geo.ts` belongs to
`028`, not this feature).

---

## Phase 2: Foundational

**Purpose**: The data plumbing every user story below depends on — fetching UV data, reducing it
to risky hours, and threading a `uvRisk` flag through the existing `TimelinePeriod` pipeline.
Neither user story (the badge showing, or it correctly *not* showing) can be verified without
this in place.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 Add `getUvIndex(location, window): Promise<Set<number>>` to
      `src/services/smhiProvider.ts` — fetch STRÅNG parameter 116
      (`https://opendata-download-metanalys.smhi.se/api/category/strang1g/version/1/geotype/point/lon/{lon}/lat/{lat}/parameter/116/data.json?from=YYYYMMDD`,
      `from` computed from `WINDOW_HOURS[window]` days back), convert each `value` (mW/m²) to UV
      Index via `value / 25`, bucket by `Math.floor(Date.parse(date_time) / 3600_000)` (same
      convention as `byHour`), and return the `Set` of hour keys where UV Index `>= 6`. Never
      throws — catch and return an empty `Set` on any failure, per contracts/uv-provider.md.
- [X] T002 [P] Add `getUvRisk(location, window): Promise<Set<number>>` to
      `src/services/weatherApi.ts` — return `new Set()` immediately when
      `!(await smhiProvider.isCovered(location))`, otherwise delegate to
      `smhiProvider.getUvIndex`, per contracts/uv-provider.md
- [X] T003 Add a `uvRisk: boolean` field to `TimelinePeriod` in `src/components/timelineData.ts`;
      thread a new `uvRiskHours: Set<number>` parameter through `buildHourlyTimelineData` and
      `daysToTimelineData` (used by both `buildDailyTimelineData` and `build3DayTimelineData`),
      setting `uvRisk` to `true` when any hour in the period's `[periodStart, periodEnd)` span is
      present in `uvRiskHours`, per data-model.md
- [X] T004 Add a `uvRiskHours: Set<number>` state + its own independent `useEffect` (mirroring the
      nearby-station-fetch pattern already in the file) to
      `src/hooks/useObservationData.ts`, calling `weatherApi.getUvRisk(location, window)`;
      include it in `UseObservationDataResult`
- [X] T005 [P] Add unit tests for the irradiance→UV-Index conversion and `>= 6` threshold in
      `tests/unit/smhiProvider.test.ts`, using a fixture shaped like the real STRÅNG sample
      (zero overnight, a midday peak) — assert the correct hour keys are risky and non-risky
      hours are excluded
- [X] T006 [P] Add unit tests for `uvRisk` threading in `tests/unit/timelineData.test.ts` — a
      period whose span contains a risky hour gets `uvRisk: true`; a period with none gets
      `false`; an empty `uvRiskHours` set yields `false` for every period

**Checkpoint**: Foundation ready — `TimelinePeriod.uvRisk` is correctly populated end-to-end;
user story implementation (the actual badge) can now begin.

---

## Phase 3: User Story 1 - See a UV risk warning at a glance (Priority: P1) 🎯 MVP

**Goal**: Render a small UV warning badge on the existing weather condition icon for any period
whose `uvRisk` is `true`, with an accessible label — no separate row/chart/section.

**Independent Test**: For a period with `uvRisk: true`, the period's existing weather icon shows
a small added indicator; for a period with `uvRisk: false`, the icon looks exactly as it does
today (per quickstart.md).

### Implementation for User Story 1

- [X] T007 [US1] In `ConditionRow` (`src/components/WeatherIconOverview.tsx`), render a small UV
      badge element inside the condition cell when `period.uvRisk === true`, and append " · High
      UV" (or equivalent) to that cell's existing `aria-label`, per contracts/uv-provider.md
- [X] T008 [P] [US1] Add a CSS rule for the new UV badge in `src/index.css` — small, positioned
      as an overlay/corner badge on the existing icon, legible in all three themes (reuse
      existing warning/accent color tokens rather than inventing a new palette)
- [X] T009 [P] [US1] Add an integration test in `tests/integration/weatherIconOverview.test.tsx`
      asserting: a period with `uvRisk: true` renders the badge and the `aria-label` mentions UV;
      a period with `uvRisk: false` renders neither

**Checkpoint**: US1 is independently complete — a risky period's icon is visibly and
accessibly distinguishable from a non-risky one.

---

## Phase 4: User Story 2 - No clutter when UV data isn't available (Priority: P2)

**Goal**: Guarantee the badge never renders, and nothing ever breaks, for a non-Swedish location,
a forecast (future) period, or a UV-fetch failure.

**Independent Test**: Load a non-Swedish location, and separately a forecast period for a
Swedish location; in both cases every weather icon renders exactly as it does today, with no UV
indicator and no console errors (per quickstart.md).

### Implementation for User Story 2

- [X] T010 [US2] Add a unit test in `tests/unit/weatherApi.test.ts` asserting `getUvRisk` returns
      an empty `Set` (and never calls `smhiProvider.getUvIndex`) for a location where
      `isCovered` resolves `false`
- [X] T011 [P] [US2] Add a unit test in `tests/unit/smhiProvider.test.ts` asserting `getUvIndex`
      resolves to an empty `Set` (never throws) when the underlying `fetch` rejects or returns a
      non-OK response
- [X] T012 [P] [US2] Add an integration test in `tests/integration/weatherIconOverview.test.tsx`
      asserting a forecast-flagged period never shows the UV badge even when its hour would
      otherwise be in `uvRiskHours` (confirms the `periodStart < now` boundary in T003's
      threading logic, not just an empty-data case)
- [X] T013 [US2] Verify (via the existing hook-level test in
      `tests/unit/useObservationData.test.ts`) that a UV-fetch rejection never delays or affects
      `series`/`weeklySeries` resolution — add a test case if none already covers this shape of
      independent-effect failure isolation

**Checkpoint**: US1 and US2 both independently complete — the feature is fully guarded against
every "no data" case identified in the spec's Edge Cases.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T014 Run `TZ=UTC npx vitest run` and fix any regressions introduced by T001-T013
- [X] T015 Run `npm run lint` and fix any issues
- [X] T016 Run `npm run build` and confirm a clean build
- [X] T017 Start `npm run dev` and manually walk through quickstart.md's live Playwright
      verification steps against a real Swedish midday location and a non-Swedish location,
      confirming the badge, its absence on forecast periods, and no console errors
- [X] T018 Bump `package.json`'s version as the final step before commit, per standing practice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped — no new project setup
- **Foundational (Phase 2)**: BLOCKS both user stories — `TimelinePeriod.uvRisk` must exist and
  be correctly populated before either story's own tests/UI work can be verified
- **User Stories (Phase 3-4)**: US1 (the badge itself) and US2 (its guardrails) share the same
  files (`WeatherIconOverview.tsx`'s `ConditionRow`, `timelineData.ts`) but are additive/testing
  concerns rather than conflicting edits — US2 mostly *adds tests* against behavior T003/T007
  already establish, so it naturally follows US1 in practice even though there's no hard
  ordering dependency
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within Each Phase

- Foundational: T001 → T002 (needs `getUvIndex` to exist) → T003/T004 (can proceed once T001/T002
  exist) → T005/T006 (tests, mutually parallel, can be written alongside T001/T003)
- US1: T007 → T008 (styling can follow immediately) → T009 (test)
- US2: T010/T011/T012 mutually parallel; T013 last (verifies the whole chain)

### Parallel Opportunities

- T002 can proceed in parallel with T001 finishing (different files), though T002 calls T001's
  function so should be code-reviewed together
- T005, T006 are mutually parallel with each other and with T004
- T008, T009 are mutually parallel
- T010, T011, T012 are mutually parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (the data plumbing)
2. Complete Phase 3: User Story 1 (the badge)
3. **STOP and VALIDATE**: Run quickstart.md's US1 scenario live
4. Deploy/demo if ready

### Incremental Delivery

1. Foundational → US1 (P1, the core visible feature) → validate → MVP
2. US2 (P2, guardrail tests confirming no clutter/errors) → validate
3. Phase 5 polish pass across everything → commit + push (per standing memory: commit+push
   automatically after `/speckit-implement`, with the version bump from T018 included in that
   same commit)
