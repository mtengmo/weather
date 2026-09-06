---

description: "Task list for Severe Weather Warnings"
---

# Tasks: Severe Weather Warnings

**Input**: Design documents from `/specs/028-severe-weather-warnings/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the spec; regression/unit tests are added alongside each
change per this session's established practice.

**Organization**: Tasks are grouped by user story (P1: US1, P2: US2, P3: US3), matching
spec.md's priorities.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No new project setup required — no new runtime dependency (research.md §3); one new small,
single-purpose module (`geo.ts`) follows this codebase's existing convention for such modules
(e.g. `sunMoon.ts`, `feelsLike.ts`).

---

## Phase 2: Foundational

**Purpose**: The data plumbing every user story below depends on — fetching the national
warnings feed, matching it to a location, filtering to currently-valid warnings, and sorting by
severity. No story can be verified without this in place.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 [P] Create `src/services/geo.ts` with `pointInPolygon(point, geometry): boolean` —
      standard ray-casting algorithm supporting GeoJSON `Polygon` and `MultiPolygon` geometries
      (`[lon, lat]` coordinate order), per contracts/warnings.md
- [X] T002 Add `getActiveWarnings(): Promise<RawSmhiWarning[]>` to
      `src/services/smhiProvider.ts` — fetch
      `https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json`; never throw,
      return `[]` on any failure, per contracts/warnings.md
- [X] T003 Add a `WeatherWarning` type to `src/models/types.ts` per data-model.md
      (`id`, `severityCode`, `severityLabel`, `title`, `areaName`, `description`, `validFrom`,
      `validUntil`)
- [X] T004 Add `getWarningsForLocation(location): Promise<WeatherWarning[]>` to
      `src/services/weatherApi.ts` — return `[]` immediately when `!isCovered(location)`;
      otherwise fetch via `getActiveWarnings`, filter to entries whose `area` geometry contains
      `location` (T001's `pointInPolygon`), filter to entries where `validFrom <= now &&
      (validUntil == null || validUntil > now)`, map to the reduced `WeatherWarning` shape, and
      sort using a fixed severity-code ordinal lookup (research.md §4; unrecognized codes sort
      last), per contracts/warnings.md
- [X] T005 Add a `warnings: WeatherWarning[]` state + its own independent `useEffect` (mirroring
      the nearby-station-fetch pattern already in the file) to
      `src/hooks/useObservationData.ts`, calling `weatherApi.getWarningsForLocation(location)`;
      include it in `UseObservationDataResult`
- [X] T006 [P] Add unit tests for `geo.pointInPolygon` in `tests/unit/geo.test.ts` — a point
      inside a simple `Polygon`, a point outside, a point near a boundary vertex, and a
      `MultiPolygon` fixture
- [X] T007 [P] Add unit tests for `weatherApi.getWarningsForLocation` in
      `tests/unit/weatherApi.test.ts` — coverage gating, validity-window filtering (future
      `validFrom` excluded, past `validUntil` excluded), and severity sort ordering, using
      fixtures shaped like the real IBWW sample (bilingual fields, `Polygon` area)

**Checkpoint**: Foundation ready — `getWarningsForLocation` returns a correctly filtered, sorted
`WeatherWarning[]` for any location; user story implementation (the banner UI) can now begin.

---

## Phase 3: User Story 1 - Know about an active severe weather warning for my location (Priority: P1) 🎯 MVP

**Goal**: Show a warning banner near the top of the page (persistent across Overview/Details/
Graph/Map) when at least one warning is active for the viewed location, expandable to the full
description and validity period.

**Independent Test**: Load a Swedish location that currently has an active official warning; a
warning banner appears near the top of the page, visible without any extra interaction, showing
the warning's severity and a short title (per quickstart.md).

### Implementation for User Story 1

- [X] T008 [US1] Create `src/components/WarningBanner.tsx` — accepts `warnings: WeatherWarning[]`
      prop; renders nothing when empty (matching `TodaySummaryCard`'s `return null` convention);
      otherwise renders a collapsed summary (leading warning's severity + title) with a
      `<button>`-driven expand affordance, per contracts/warnings.md
- [X] T009 [US1] Render `<WarningBanner warnings={warnings} />` in `src/App.tsx` directly below
      `<header className="app-header">`, sourcing `warnings` from `useObservationData`'s result
      (T005) — persistent across every view, not gated to the Overview tab
- [X] T010 [P] [US1] Add CSS for `.warning-banner` (collapsed and expanded states) in
      `src/index.css`, themed for all three existing themes, using a severity-appropriate color
      (reuse existing warning/accent tokens rather than inventing a new palette)
- [X] T011 [P] [US1] Add an integration test in `tests/integration/warningBanner.test.tsx` (or
      alongside `appHeader.test.tsx` if that's the more natural home) asserting: one active
      warning renders the collapsed summary; clicking/tapping it reveals the full description,
      area name, and validity period; zero warnings renders nothing

**Checkpoint**: US1 is independently complete — a single active warning is visible and
expandable from anywhere in the app.

---

## Phase 4: User Story 2 - See the most serious warning first when several are active (Priority: P2)

**Goal**: When multiple warnings are active for the viewed location, the banner leads with the
highest-severity one and every warning is reachable, most-to-least severe.

**Independent Test**: Load a location with two active warnings of different severity; the banner
leads with the higher-severity warning, and the lower-severity one is still reachable (per
quickstart.md).

### Implementation for User Story 2

- [X] T012 [US2] Extend `WarningBanner.tsx`'s collapsed state to indicate when more than one
      warning is active (e.g. "+N more"), and its expanded state to list every warning in
      `warnings` (already sorted by T004) in order
- [X] T013 [P] [US2] Add an integration test in `tests/integration/warningBanner.test.tsx`
      asserting: given two warnings of different severity (already-sorted input, matching T004's
      contract), the collapsed view leads with the more severe one and shows a "+1 more"-style
      indicator; the expanded view lists both, most-severe first

**Checkpoint**: US1 and US2 both independently complete — multiple simultaneous warnings are
handled without hiding any of them.

---

## Phase 5: User Story 3 - Nothing breaks for locations outside Sweden (Priority: P3)

**Goal**: Guarantee no banner, no error, and no delay to the rest of the page for a non-Swedish
location or a warnings-fetch failure.

**Independent Test**: Load a non-Swedish location; the page renders exactly as it does today,
with no warning banner and no console errors (per quickstart.md).

### Implementation for User Story 3

- [X] T014 [US3] Add a unit test in `tests/unit/weatherApi.test.ts` asserting
      `getWarningsForLocation` returns `[]` (and never calls `smhiProvider.getActiveWarnings`)
      for a location where `isCovered` resolves `false`
- [X] T015 [P] [US3] Add a unit test in `tests/unit/smhiProvider.test.ts` asserting
      `getActiveWarnings` resolves to `[]` (never throws) when the underlying `fetch` rejects or
      returns a non-OK response
- [X] T016 [P] [US3] Verify (via `tests/unit/useObservationData.test.ts`) that a warnings-fetch
      rejection never delays or affects `series`/`weeklySeries` resolution — add a test case if
      none already covers this shape of independent-effect failure isolation (mirrors
      `027-uv-index-alert`'s equivalent T013)

**Checkpoint**: All three user stories independently complete — the feature is fully guarded
against every "no data" case identified in the spec's Edge Cases.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 Run `TZ=UTC npx vitest run` and fix any regressions introduced by T001-T016
- [X] T018 Run `npm run lint` and fix any issues
- [X] T019 Run `npm run build` and confirm a clean build
- [X] T020 Start `npm run dev` and manually walk through quickstart.md's live Playwright
      verification steps: a currently-warned Swedish location, an unwarned Swedish location, and
      a non-Swedish location — confirming the banner, its expand/collapse, and no console errors
      in every case
- [X] T021 Bump `package.json`'s version as the final step before commit, per standing practice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped — no new project setup
- **Foundational (Phase 2)**: BLOCKS every user story — `getWarningsForLocation` must exist and
  be correctly filtered/sorted before any story's UI work can be verified
- **User Stories (Phase 3-5)**: US1 (single warning) → US2 (multi-warning ordering, extends
  `WarningBanner.tsx`'s already-built structure) → US3 (guardrail tests against behavior US1/
  Foundational already establish) — a natural, though not strictly required, sequence
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each Phase

- Foundational: T001 (parallel) → T002 → T003 → T004 (needs T001, T002, T003) → T005 (needs T004)
  → T006/T007 (tests, mutually parallel, can be written alongside T001/T004)
- US1: T008 → T009 (needs T008 + T005) → T010 (styling, parallel with T009) → T011 (test)
- US2: T012 (extends T008's component) → T013 (test)
- US3: T014/T015/T016 mutually parallel

### Parallel Opportunities

- T001 can proceed in parallel with T002/T003 (different files)
- T006, T007 are mutually parallel with each other and with T005
- T010, T011 are mutually parallel
- T014, T015, T016 are mutually parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (the data plumbing)
2. Complete Phase 3: User Story 1 (a single warning banner)
3. **STOP and VALIDATE**: Run quickstart.md's US1 scenario live
4. Deploy/demo if ready

### Incremental Delivery

1. Foundational → US1 (P1, the core visible feature) → validate → MVP
2. US2 (P2, multi-warning severity ordering) → validate
3. US3 (P3, guardrail tests confirming no clutter/errors) → validate
4. Phase 6 polish pass across everything → commit + push (per standing memory: commit+push
   automatically after `/speckit-implement`, with the version bump from T021 included in that
   same commit)
