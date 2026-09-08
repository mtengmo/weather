---

description: "Task list for 040-map-temp-wind-overlays"
---

# Tasks: Temperature and Wind Map Overlays

**Input**: Design documents from `/specs/040-map-temp-wind-overlays/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/map-overlays.md](./contracts/map-overlays.md), [quickstart.md](./quickstart.md)

**Tests**: Included — extends the project's existing `tests/integration/mapView.test.tsx` suite, matching how the existing Rain overlay is already tested.

**Organization**: Tasks are grouped by user story (US1 = Temperature, US2 = Wind, US3 = overlay-switching guardrail) so each can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files/tests, no dependency on an incomplete task)
- **[Story]**: US1, US2, or US3, per `spec.md`
- File paths are exact and relative to the repo root

## Phase 1: Setup

**Purpose**: Confirm baseline and put the new config value in place before touching component code.

- [X] T001 Run `npm test` from the repo root to confirm the current `main` branch is green, so any failures found later are attributable to this feature
  - **Result**: 559/559 passed (baseline, before this feature's changes).
- [X] T002 Create `.env.example` at the repo root documenting `VITE_OPENWEATHERMAP_API_KEY=` with a one-line comment pointing to the free OpenWeatherMap signup (per `quickstart.md` Prerequisites); confirm `.env*` is already covered by `.gitignore` (it is) so a real local `.env` is never committed
  - **Result**: Created `.env.example`. Found `.gitignore`'s `.env.*` pattern would have also swallowed `.env.example` itself — added `!.env.example` so the template stays tracked while real `.env` files stay ignored.

**Checkpoint**: Baseline confirmed, config convention documented.

---

## Phase 2: Foundational

**Purpose**: The shared overlay-selection state that all three user stories sit on top of.

**⚠️ CRITICAL**: This phase must be complete before any user story below, since US1/US2/US3 all extend the same picker control and state.

- [X] T003 In `src/components/MapView.tsx`, introduce a `MapOverlay` union type (`"rain" | "temperature" | "wind" | "none"`) and a `useState<MapOverlay>("rain")` (default per FR-003), replacing the current unconditional radar-fetch-and-render logic with an overlay-aware structure per `data-model.md`'s `MapOverlay` table (this task only introduces the state/type — rendering per value is done in each story below)
- [X] T004 In `src/components/MapView.tsx`, add an overlay-picker control (a `role="group" aria-label="Map overlay"` button row, mirroring the existing `.window-toggle` pattern in `src/components/ObservationChart.tsx`) with buttons for Rain, Temperature (only rendered when `import.meta.env.VITE_OPENWEATHERMAP_API_KEY` is set, per `data-model.md` Configuration), Wind, and None, each `aria-pressed` against the current `MapOverlay` state
- [X] T005 [P] In `src/index.css`, add styling for the new overlay-picker control (reuse `.window-toggle`-style button/group styling rather than inventing a new visual pattern)
  - **Result**: No new CSS needed — reused the existing `.window-toggle` class name directly on the picker's `<div>`, which already has the button/`aria-pressed` styling this control needs.

**Checkpoint**: Picker control exists and toggles state; individual overlay rendering comes next.

---

## Phase 3: User Story 1 - See temperature across the map (Priority: P1) 🎯 MVP

**Goal**: Selecting "Temperature" shows an OpenWeatherMap color-coded temperature `TileLayer` over the map (FR-004).

**Independent Test**: Open the Map view, select Temperature, confirm a temperature tile layer renders over the base map without breaking pins.

### Tests for User Story 1

- [X] T006 [P] [US1] In `tests/integration/mapView.test.tsx`, add a test that selecting "Temperature" renders a `.map-temperature-layer` element (mock `import.meta.env.VITE_OPENWEATHERMAP_API_KEY` via `vi.stubEnv`), and that selecting a different overlay removes it
- [X] T007 [P] [US1] In `tests/integration/mapView.test.tsx`, add a test that the Temperature button is not rendered at all when `VITE_OPENWEATHERMAP_API_KEY` is unset (FR-008/data-model.md Configuration)

### Implementation for User Story 1

- [X] T008 [US1] In `src/components/MapView.tsx`, render a `TileLayer` (`className="map-temperature-layer"`, `url="https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}"`, reduced opacity, appropriate `zIndex` above the base layer per `contracts/map-overlays.md`) when `overlay === "temperature"`
- [X] T009 [US1] Add attribution for OpenWeatherMap alongside the existing RainViewer attribution (per `quickstart.md` Notes), shown whenever the Temperature layer is active
  - **Result**: Used the `TileLayer`'s own `attribution` prop (same mechanism the existing RainViewer layer already uses), which feeds Leaflet's built-in attribution control — no separate credit line needed.

**Checkpoint**: User Story 1 is independently functional — Temperature overlay works, degrades gracefully with no key.

---

## Phase 4: User Story 2 - See wind movement across the map, animated (Priority: P2)

**Goal**: Selecting "Wind" replaces the map area with an embedded, animated Windy iframe centered on the same location (FR-005, FR-006).

**Independent Test**: Open the Map view, select Wind, confirm the Windy embed renders centered on the map's existing pin coordinate; selecting a different overlay restores the pin map.

### Tests for User Story 2

- [X] T010 [P] [US2] In `tests/integration/mapView.test.tsx`, add a test that selecting "Wind" renders an `iframe` (e.g. `container.querySelector('iframe[title="Wind map"]')`) with a `src` containing `embed.windy.com`, `overlay=wind`, and the expected lat/lon derived from the same coordinate the base map uses
- [X] T011 [P] [US2] In `tests/integration/mapView.test.tsx`, add a test that switching from "Wind" back to "Rain" (or any other overlay) removes the iframe and restores the `MapContainer`/pins

### Implementation for User Story 2

- [X] T012 [US2] In `src/components/MapView.tsx`, when `overlay === "wind"`, render an `iframe` (with `title="Wind map"` for accessibility, sized to match the map's existing `height: 480`) whose `src` is built from `https://embed.windy.com/embed2.html` with query params for the existing `center` coordinate, `zoom=5`, `overlay=wind`, `type=map`, `metricWind=default` (per `contracts/map-overlays.md`), replacing the `MapContainer` entirely rather than being layered inside it
- [X] T013 [US2] Add attribution/credit for Windy near the overlay picker when the Wind overlay is active (matching the RainViewer/OpenWeatherMap attribution pattern)
  - **Result**: No separate credit line added — Windy's own embed UI already displays its required branding/attribution inside the iframe itself, unlike the bare `TileLayer`s used for Rain/Temperature which have no UI of their own. Documented this reasoning as a comment in `MapView.tsx`.

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Switch between overlays without losing the map's core job (Priority: P1)

**Goal**: Exactly one overlay is visible at a time, Rain is the default, and pin selection/pan/zoom keep working on every overlay except Wind's embedded map (FR-002, FR-003, FR-006, FR-007).

**Independent Test**: With any overlay selected, pins remain clickable (except while Wind's iframe replaces the map); rapid switching never leaves two overlays visible; Rain shows by default on first load.

### Tests for User Story 3

- [X] T014 [P] [US3] In `tests/integration/mapView.test.tsx`, add a test confirming Rain is the default overlay on mount (existing radar tests already cover this implicitly — add an explicit assertion checking the Rain button's `aria-pressed="true"` on initial render)
- [X] T015 [P] [US3] In `tests/integration/mapView.test.tsx`, add a test that rapidly selecting Rain → Wind → Temperature → None leaves exactly one overlay (or none) rendered at the end — no stale `.map-radar-layer`/`.map-temperature-layer`/iframe left behind
- [X] T016 [P] [US3] In `tests/integration/mapView.test.tsx`, add a test that pin click → "View" → `onSelectLocation` still works with the Temperature overlay active (extends the existing radar-layer equivalent test at ~line 133) and with "None" selected
- [X] T017 [P] [US3] In `tests/integration/mapView.test.tsx`, add a test that a failed OpenWeatherMap tile fetch (or the layer simply not resolving) does not affect pin rendering/selection — mirrors the existing "renders no radar layer, and every pin still renders, when the metadata fetch fails" test
  - **Result**: Implemented as the "no API key configured" case (a real network-failure mock for OWM tiles isn't meaningful under jsdom, which doesn't actually load `<img>` tile URLs) — confirms pins still render/select correctly when the Temperature layer is entirely absent, the same effective guarantee.

### Implementation for User Story 3

- [X] T018 [US3] Review `src/components/MapView.tsx`'s overlay-switching logic (from Phases 2-4) to confirm only one of {Rain `TileLayer`, Temperature `TileLayer`, Wind `iframe`} ever renders at once, and that switching away from Wind unmounts the iframe and remounts `MapContainer` cleanly (no leftover Leaflet instance) — fix if the tests from T014-T017 reveal an issue
  - **Result**: No fix needed — the `overlay === "wind"` ternary at the top level of the render (iframe vs. `MapContainer`) guarantees exactly one of the two ever mounts, and React unmounts/remounts them cleanly on state change. All T014-T017 tests passed without modification to the implementation.

**Checkpoint**: All three user stories work together — this is the full feature.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] Run `npm test` (full suite) and `npm run lint` to confirm no regressions
  - **Result**: `npm test` — 568/568 pass (35 files). `npm run lint` — clean. `npm run build` also verified clean (production build succeeds).
- [X] T020 Bump the version in `package.json` per project convention
  - **Result**: Bumped `0.4.7` → `0.5.0` (minor bump, matching this project's past convention of a minor version for a meaningfully new feature vs. patch for small fixes).
- [X] T021 Run the full `quickstart.md` validation (automated + manual sections) as a final sign-off, including the "no API key" and "network down" manual scenarios
  - **Result**: Automated section — covered by T006-T017's tests. Manual section — confirmed via source inspection and the automated tests' equivalent coverage (no API key → Temperature option hidden; pins/selection unaffected by any overlay state); a live, real-network walkthrough with an actual OpenWeatherMap key is left for the user, since this sandboxed environment has no interactive browser and no real API key to exercise the live tile/embed URLs end-to-end.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all three user stories (they all extend the same picker/state introduced here)
- **User Story 1 (Phase 3)**: Depends on Phase 2
- **User Story 2 (Phase 4)**: Depends on Phase 2 — independent of User Story 1 (different overlay value, different rendering branch)
- **User Story 3 (Phase 5)**: Depends on Phases 2-4 being in place (it tests/guards the interaction between all overlay values, including Temperature and Wind)
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Parallel Opportunities

- T006/T007 (US1 tests) can run in parallel with T010/T011 (US2 tests), since they target different overlay values in independent test cases within the same file
- T008-T009 (US1 implementation) and T012-T013 (US2 implementation) touch different rendering branches of the same `overlay` switch in `MapView.tsx` — coordinate on the file, but the logic itself doesn't depend on each other
- T014-T017 (US3 tests) can be written in parallel with each other

---

## Parallel Example: Phase 3 + Phase 4 kickoff

```bash
# After Phase 2 completes, these test-writing tasks can start together:
Task: "T006 Add Temperature-overlay rendering test (US1)"
Task: "T010 Add Wind-overlay iframe rendering test (US2)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (picker + state)
3. Complete Phase 3: User Story 1 (Temperature)
4. **STOP and VALIDATE**: Confirm Temperature overlay works and degrades gracefully without a key
5. Ship if that's the more urgent of the two overlays

### Incremental Delivery

1. Phase 1 + Phase 2 → picker/state ready
2. Phase 3 (US1, Temperature) → validate → ship
3. Phase 4 (US2, Wind) → validate → ship
4. Phase 5 (US3, guardrail) → validate the full combined behavior
5. Phase 6 → polish, version bump, final sign-off

## Notes

- No new npm dependency: the Temperature overlay reuses `react-leaflet`'s existing `TileLayer`; the Wind overlay was originally a plain `iframe`, since replaced (see Follow-up below).
- Per `research.md` §2a, a `leaflet-velocity` + NOAA-data approach was already ruled out during planning (confirmed via a live CORS test) — it is not part of this task list.
- The OpenWeatherMap API key is a manual, local setup step for whoever runs this app (T002); it is never committed to the repo.

## Follow-up: Wind switched from a Windy embed to a static OpenWeatherMap layer

After T001-T021 shipped, the user tried the Wind overlay and rejected the Windy.com iframe
approach: "the windy map wasn't so nice, as it's embedd[ing] another site." Implemented directly
(small, well-understood change — not re-run through `/speckit-tasks`):

- [X] Replaced the `<iframe>`/`windyEmbedUrl` code in `src/components/MapView.tsx` with a
  `TileLayer` (`className="map-wind-layer"`) using OpenWeatherMap's `wind_new` tiles, gated on the
  same `VITE_OPENWEATHERMAP_API_KEY` as Temperature (both now hidden together when unset).
- [X] Updated `tests/integration/mapView.test.tsx`: replaced the two Windy-iframe tests with
  equivalent `TileLayer`-based ones; fixed the two US3 guardrail tests that referenced the
  previously-always-available "Wind" button (now key-gated) by stubbing the env var.
- [X] `npm test` — 568/568 pass. `npm run lint` — clean. `npm run build` — succeeds.
- [X] Bumped `package.json` `0.5.0` → `0.5.1` for this follow-up fix.
- [X] Updated `spec.md`, `research.md` (§5, new), `data-model.md`, `contracts/map-overlays.md`,
  and `quickstart.md` to describe the shipped static-layer approach instead of the embed.
- [X] Saved a `feedback` memory (`feedback_no_embedded_third_party_maps`) recording the user's
  preference against embedded third-party map widgets for future features.
