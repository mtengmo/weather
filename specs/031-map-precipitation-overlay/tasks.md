---

description: "Task list for Forecast Precipitation Overlay on the Map"
---

# Tasks: Forecast Precipitation Overlay on the Map

**Input**: Design documents from `/specs/031-map-precipitation-overlay/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the spec; regression/unit tests are added alongside each
change per this session's established practice.

**Organization**: Tasks are grouped by user story (P1: US1, P2: US2, P3: US3), matching
spec.md's priorities.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No new project setup required — no new runtime dependency (`CircleMarker` is already part of the
existing `react-leaflet` dependency, research.md §3).

---

## Phase 2: Foundational

**Purpose**: The data plumbing every user story below depends on — computing per-pin
precipitation and making it available to the render layer, without touching the existing
pins/`Marker` computation at all.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 In `src/components/MapView.tsx`, add a `precipitationByPin: Map<string, number>`
      state (`useState`) and a `useEffect` keyed on the `pins` array that fetches
      `openMeteoProvider.getForecastOnly(pin, "last-24-hours")` for every pin in parallel via
      `Promise.allSettled`, populating the map with `pin key -> mm` only for fulfilled results
      whose first forecast entry's `precipitation` is a positive number, per data-model.md
- [X] T002 [P] Add a small helper (e.g. `precipitationVisualIntensity(mm): { radius: number;
      opacity: number }`) in `src/components/MapView.tsx` mapping an mm value to a capped
      radius/opacity pair (monotonically increasing, capped at a fixed maximum), per research.md
      §3
- [X] T003 [P] Add unit tests for the mm→radius/opacity helper in `tests/unit/mapView.test.ts`
      (new file) — increasing mm increases both radius and opacity; a very large mm value is
      capped, not unbounded

**Checkpoint**: Foundation ready — `precipitationByPin` is correctly populated per pin,
independent of the existing pins/`Marker` rendering; user story implementation (the visible
circles) can now begin.

---

## Phase 3: User Story 1 - See at a glance where rain is expected near my saved places (Priority: P1) 🎯 MVP

**Goal**: Render a `CircleMarker` under each pin with positive forecast precipitation, sized/
colored by amount, clearly distinguishable from a dry pin (which gets none).

**Independent Test**: Open the Map view with at least one favorite location; areas with forecast
rain show a visible tint distinct from areas with none (per quickstart.md).

### Implementation for User Story 1

- [X] T004 [US1] In `src/components/MapView.tsx`, render one `CircleMarker` per pin present in
      `precipitationByPin`, positioned at that pin's coordinates, using T002's radius/opacity
      helper, per contracts/precipitation-overlay.md
- [X] T005 [P] [US1] Add a visible "Forecast precipitation" label/legend near the map (not on
      individual circles) so the overlay reads as forecast, not live radar, per FR-002
- [X] T006 [P] [US1] Add an integration test in `tests/integration/mapView.test.tsx` asserting: a
      pin with positive forecast precipitation renders a `CircleMarker`; a pin with zero/no
      forecast data renders none

**Checkpoint**: US1 is independently complete — a user can visually distinguish wet vs. dry
pinned locations on the map.

---

## Phase 4: User Story 2 - The map still works exactly as before (Priority: P2)

**Goal**: Guarantee the overlay never interferes with existing pin selection or map navigation.

**Independent Test**: With the overlay showing, every pin remains clickable and selects its
location exactly as before; panning/zooming works normally (per quickstart.md).

### Implementation for User Story 2

- [X] T007 [US2] Ensure every `CircleMarker` added in T004 sets `interactive={false}`, per
      contracts/precipitation-overlay.md, so it never intercepts clicks meant for the `Marker`/
      `Popup` beneath it
- [X] T008 [P] [US2] Add a non-regression integration test in `tests/integration/mapView.test.tsx`
      asserting that clicking a pin's "View" button still calls `onSelectLocation` with the
      correct location when the precipitation overlay is showing

**Checkpoint**: US1 and US2 both independently complete — the overlay and existing pin behavior
coexist without conflict.

---

## Phase 5: User Story 3 - Nothing breaks when the overlay data can't be fetched (Priority: P3)

**Goal**: Guarantee a failed precipitation fetch never breaks or delays the map's pins/
navigation.

**Independent Test**: Simulate a failed overlay fetch; the map still renders its pins and remains
fully navigable, simply without the precipitation tint (per quickstart.md).

### Implementation for User Story 3

- [X] T009 [US3] Add an integration test in `tests/integration/mapView.test.tsx` asserting: when
      `getForecastOnly` rejects for every pin, every `Marker` still renders and no error is shown
- [X] T010 [P] [US3] Add an integration test asserting that when `getForecastOnly` rejects for
      only some pins (`Promise.allSettled` partial failure), the other pins' circles still render
      correctly

**Checkpoint**: All three user stories independently complete — the feature is fully guarded
against every "no data" case identified in the spec's Edge Cases.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T011 Run `TZ=UTC npx vitest run` and fix any regressions introduced by T001-T010
- [X] T012 Run `npm run lint` and fix any issues
- [X] T013 Run `npm run build` and confirm a clean build
- [X] T014 Start `npm run dev` and manually walk through quickstart.md's live Playwright
      verification steps: favorites with differing forecasts, pin click-through, pan/zoom, and a
      screenshot for the record
- [X] T015 Bump `package.json`'s version as the final step before commit, per standing practice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped — no new project setup
- **Foundational (Phase 2)**: BLOCKS every user story — `precipitationByPin` must exist and be
  correctly populated before any story's UI/test work can be verified
- **User Stories (Phase 3-5)**: US1 (visible circles) → US2 (non-interference guardrail on T004's
  circles) → US3 (fetch-failure guardrail on T001's effect) — a natural, though not strictly
  required, sequence
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each Phase

- Foundational: T001 → T002 (parallel-safe once T001's shape is known) → T003 (test, parallel
  with T002)
- US1: T004 (needs T002's helper) → T005 (parallel with T004) → T006 (test)
- US2: T007 (a one-line addition to T004's circles) → T008 (test)
- US3: T009, T010 mutually parallel

### Parallel Opportunities

- T002, T003 are mutually parallel with each other
- T005, T006 are mutually parallel
- T009, T010 are mutually parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (the data plumbing)
2. Complete Phase 3: User Story 1 (the visible circles)
3. **STOP and VALIDATE**: Run quickstart.md's US1 scenario live
4. Deploy/demo if ready

### Incremental Delivery

1. Foundational → US1 (P1, the core visible feature) → validate → MVP
2. US2 (P2, non-interference guardrail) → validate
3. US3 (P3, fetch-failure guardrail) → validate
4. Phase 6 polish pass across everything → commit + push (per standing memory: commit+push
   automatically after `/speckit-implement`, with the version bump from T015 included in that
   same commit)
