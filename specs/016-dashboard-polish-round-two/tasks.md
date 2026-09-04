---

description: "Task list for 016-dashboard-polish-round-two"
---

# Tasks: Dashboard Polish Round Two

**Input**: Design documents from `/specs/016-dashboard-polish-round-two/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested in the spec, but included per this repo's established convention (every prior feature paired implementation tasks with unit/integration test tasks in the same phase).

**Organization**: Tasks are grouped by user story (spec.md priorities: US1/US2 = P1, US3-US7 = P2, US8-US10 = P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Paths are relative to the repo root (`c:\GitRepos\weather`)

---

## Phase 1: Setup

- [X] T001 Add `vite-plugin-pwa`, `leaflet`, `react-leaflet` to `package.json` dependencies and `@types/leaflet` to devDependencies; run `npm install`
- [X] T002 Run `npm test` and `npm run build` to confirm a clean baseline before starting

---

## Phase 2: Foundational

No cross-cutting scaffolding is required before user story work can begin — every story's changes
are additive to existing files or entirely new files. Proceed directly to Phase 3. Several stories
touch the same files (`App.tsx`, `WeatherIconOverview.tsx`) — file-level ordering is called out in
Dependencies & Execution Order below rather than a separate foundational merge step.

---

## Phase 3: User Story 1 - The 3-day view actually shows 3 days (Priority: P1) 🎯 MVP

**Goal**: Confirm (with tests) the 3-day Overview correctly shows every day its location's forecast reaches — no reproducible defect was found during planning (research.md §1).

**Independent Test**: Open the 3-day Overview directly (skipping 7-day), for both an SMHI and an Open-Meteo-only location; confirm the correct column count every time, across repeated window switches.

- [X] T003 [US1] In `tests/integration/weatherIconOverview.test.tsx`, add regression tests per `contracts/overview-fixes.md` §User Story 1: direct 24h→3-day click (15 periods), the toggle sequence 3-day→7-day→3-day→24h→3-day (correct count at each step), and a location whose forecast reaches only 1 day out (exactly 5 periods, not 15 or 0)

**Checkpoint**: The 3-day view's correctness is locked in by tests, independent of every other story in this set.

---

## Phase 4: User Story 2 - Combined forecast sources also available on the Overview (Priority: P1)

**Goal**: With "Combine forecast sources" on, the Overview's temperature row shows each source's own reading for forecast periods.

**Independent Test**: Turn the toggle on, open the Overview for a location with 2+ forecast sources; confirm each source's reading is distinguishable, not blended into one value.

- [X] T004 [US2] In `src/components/timelineData.ts`, add the optional `sources?: { label: string; value: number | null }[]` field to `TimelineRowPoint` and `RowSource`, and the new `mergeMultiSourceIntoTimelinePoints(temperatureRow, periods, multiSourceForecast)` function, per `contracts/multi-source-overview.md`
- [X] T005 [US2] In `src/components/WeatherIconOverview.tsx`, add `combineForecastSources`/`multiSourceForecast` props, call `mergeMultiSourceIntoTimelinePoints` after building `timeline`, and extend `LineRow`'s temperature-row text/SVG rendering to show the per-source breakdown per `contracts/multi-source-overview.md` (depends on T004)
- [X] T006 [US2] In `src/App.tsx`, pass `combineForecastSources`/`multiSourceForecast` (already computed in this file since 014) through to `WeatherIconOverview` (depends on T005)
- [X] T007 [P] [US2] In `tests/unit/timelineData.test.ts`, add `mergeMultiSourceIntoTimelinePoints` tests: 2+ sources populate `sources`, a single source does not, observed periods are never touched
- [X] T008 [US2] In `tests/integration/weatherIconOverview.test.tsx`, add a test toggling "Combine forecast sources" and asserting per-source values appear on the Overview's temperature row, and are absent when the toggle is off (depends on T006)

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - A day-boundary marker makes new days easy to spot (Priority: P2)

**Goal**: A subtle vertical marker appears at each day boundary on the 3-day view.

**Independent Test**: Open the 3-day view; confirm 2 markers appear (between days 1-2 and 2-3), visually distinct from the "Now" line; confirm no marker appears on the 7-day view.

- [X] T009 [US3] In `src/components/WeatherIconOverview.tsx`, add the `dayBoundaryPercents` derived value and render one `.weather-timeline-day-boundary` div per boundary, per `contracts/overview-fixes.md` §User Story 3 (depends on T005 — same file as US2's change, apply after)
- [X] T010 [P] [US3] In `src/index.css`, add the `.weather-timeline-day-boundary` rule (soft shadow, distinct from `.weather-timeline-now`)
- [X] T011 [US3] In `tests/integration/weatherIconOverview.test.tsx`, add a test asserting 2 day-boundary markers render on the 3-day view and 0 on the 7-day view (depends on T009)

**Checkpoint**: US1-US3 all work independently.

---

## Phase 6: User Story 4 - Overview window buttons describe what they show (Priority: P2)

**Goal**: The three window buttons read "24 Hours" / "3 Days" / "7 Days."

**Independent Test**: Open the Overview; read the three buttons; confirm each directly names its own time span.

- [X] T012 [US4] In `src/components/WeatherIconOverview.tsx`, relabel `OVERVIEW_WINDOWS` per `contracts/overview-fixes.md` §User Story 4 (depends on T009 — same file, apply after)
- [X] T013 [US4] Update every existing test referencing `"Last 24 hours"` / `"Last 3 days"` / `"Last 7 days"` button names (in `tests/integration/weatherIconOverview.test.tsx`) to the new labels (depends on T012)

**Checkpoint**: US1-US4 all work independently.

---

## Phase 7: User Story 5 - A clearer "Details" action, repositioned (Priority: P2)

**Goal**: The Overview's "Back to graph" button is renamed "Details" and moved into the persistent top header's right edge.

**Independent Test**: Open the Overview; confirm a "Details" button sits in the header's top-right; click it; confirm it opens the classic graph view.

- [X] T014 [US5] In `src/components/WeatherIconOverview.tsx`, remove the `onBack` prop and its local header button entirely, per `contracts/overview-fixes.md` §User Story 5 (depends on T012 — same file, apply after)
- [X] T015 [US5] In `src/App.tsx`, add the "Details" button (shown only when `view === "overview"`) to a new `.header-actions` wrapper in the persistent header, calling `setView("graph")` directly; remove the now-unused `onBack`/`viewOverview`-related prop passed to `WeatherIconOverview` (depends on T014, T006 — same file as US2's App.tsx change, apply after)
- [X] T016 [P] [US5] In `src/index.css`, add `justify-content: space-between` to `.app-header` and the new `.header-actions` rule, per `contracts/overview-fixes.md`
- [X] T017 [US5] Update `tests/integration/weatherIconOverview.test.tsx`'s and `tests/integration/appHeader.test.tsx`'s references to `"Back to graph"` — move the button-click assertion to the app-level header test file, renamed to `"Details"` (depends on T015)

**Checkpoint**: US1-US5 all work independently.

---

## Phase 8: User Story 6 - Change location is reachable from every screen (Priority: P2)

**Goal**: "Change location" is present in the header on every view.

**Independent Test**: Visit each view; confirm "Change location" is present in the header on all of them.

- [X] T018 [US6] In `tests/integration/appHeader.test.tsx`, add a test asserting "Change location" is present for the graph, details, and overview views (the map view's own case is added in US10's T032, once that view exists) (depends on T015)

**Checkpoint**: US1-US6 all work independently — this story required no production code change, only a regression test over the app's already-correct layout (research.md §5).

---

## Phase 9: User Story 7 - The app can be installed like a native app (Priority: P2)

**Goal**: The app is installable (PWA) with a standalone launch and an offline-capable app shell.

**Independent Test**: Build and preview the app; install it in a supporting browser; confirm standalone launch and offline shell availability.

- [X] T019 [US7] In `vite.config.ts`, add the `VitePWA` plugin registration (manifest, `workbox.runtimeCaching: []`, `navigateFallbackDenylist`) and the `__APP_VERSION__` `define` (package.json version + `git rev-parse --short HEAD`), per `contracts/pwa.md` (depends on T001)
- [X] T020 [P] [US7] Add `public/icon-192.png` and `public/icon-512.png` app icon assets
- [X] T021 [P] [US7] Add a `src/pwa-env.d.ts` ambient declaration for `__APP_VERSION__`, per `contracts/pwa.md`
- [X] T022 [US7] Run `npm run build && npm run preview`; manually verify installability and offline-shell behavior per `quickstart.md` Scenario 6 (depends on T019, T020, T021)

**Checkpoint**: US1-US7 all work independently.

---

## Phase 10: User Story 8 - A footer shows the current version and a privacy notice (Priority: P3)

**Goal**: Every screen shows a small footer with the build version and a privacy notice link.

**Independent Test**: Open any screen; confirm the footer shows a version string and a working "Privacy" link.

- [X] T023 [P] [US8] Create `src/services/appVersion.ts` exposing `APP_VERSION`, per `contracts/footer-analytics.md` (depends on T021 for the `__APP_VERSION__` type)
- [X] T024 [P] [US8] Create `src/components/PrivacyNotice.tsx`, per `contracts/footer-analytics.md`
- [X] T025 [US8] Create `src/components/Footer.tsx` (uses T023, T024), per `contracts/footer-analytics.md` (depends on T023, T024)
- [X] T026 [US8] In `src/App.tsx`, mount `<Footer />` (depends on T025, T015 — same file as US5's change, apply after)
- [X] T027 [P] [US8] In `src/index.css`, add `.app-footer` and `.privacy-notice` rules, per `contracts/footer-analytics.md`
- [X] T028 [P] [US8] Add `tests/unit/appVersion.test.ts` — asserts the `"dev"` fallback when `__APP_VERSION__` is undefined
- [X] T029 [US8] Add `tests/integration/footer.test.tsx` — version text renders, "Privacy" opens/closes `PrivacyNotice` with the expected disclosures (depends on T026)

**Checkpoint**: US1-US8 all work independently.

---

## Phase 11: User Story 9 - Anonymous usage analytics (Priority: P3)

**Goal**: The app loads Google Analytics via the provided gtag.js snippet.

**Independent Test**: Load the app with dev tools open; confirm a request to `googletagmanager.com/gtag/js?id=G-GPT0MTFG6S` fires.

- [X] T030 [US9] In `index.html`, add the gtag.js snippet (measurement ID `G-GPT0MTFG6S`) to `<head>`, exactly as supplied, per `contracts/footer-analytics.md`
- [X] T031 [P] [US9] Add a smoke check in `tests/integration/footer.test.tsx` (or a new lightweight test) confirming the script tag with `id=G-GPT0MTFG6S` is present in `index.html`'s built output — a static string check, not a live network test (jsdom doesn't execute the tag's actual network request)

**Checkpoint**: US1-US9 all work independently.

---

## Phase 12: User Story 10 - A map of the user's favorite/recent locations (Priority: P3)

**Goal**: A new map screen shows pins for favorited/recently-viewed locations, each opening its Overview.

**Independent Test**: Favorite a location, open the map screen, confirm its pin appears, select it, confirm the Overview opens for it.

- [X] T032 [US10] Create `src/components/MapView.tsx` (pins from favorites + cached location, empty state, "View" action), per `contracts/map.md`
- [X] T033 [US10] In `src/App.tsx`, extend `View` to include `"map"`, add a header control to switch to it, and render `<MapView favorites={favorites} cachedLocation={getCachedLocation()} onSelectLocation={selectLocation} />` when `view === "map"` (depends on T032, T026 — same file as US8's change, apply after)
- [X] T034 [P] [US10] Import Leaflet's base stylesheet (`leaflet/dist/leaflet.css`) in `src/main.tsx` or `src/index.css`, per `contracts/map.md`
- [X] T035 [US10] Add `tests/integration/mapView.test.tsx` — pins render from favorites and cached location (deduplicated), selecting a pin calls `onSelectLocation`, empty state renders with no favorites/cache (depends on T032)
- [X] T036 [US10] In `tests/integration/appHeader.test.tsx`, extend User Story 6's test (T018) to also assert "Change location" is present on the map view (depends on T033, T018)

**Checkpoint**: All 10 user stories are independently functional.

---

## Phase 13: Polish & Cross-Cutting Concerns

- [X] T037 [P] Run the manual validation scenarios in `specs/016-dashboard-polish-round-two/quickstart.md` (desktop + mobile, all 3 themes) via Playwright/production preview, covering all 10 user stories
- [X] T038 Run `npm test` (full suite), `npm run lint`, and `npm run build`; fix any regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: None required — proceed directly to Phase 3
- **User Stories (Phase 3-12)**: Ordered here by priority (P1 → P2 → P3); each is independently
  testable, but several share files that must be edited in the order listed below within a single
  session to avoid merge conflicts:
  - `src/components/WeatherIconOverview.tsx`: T005 (US2) → T009 (US3) → T012 (US4) → T014 (US5)
  - `src/App.tsx`: T006 (US2) → T015 (US5) → T026 (US8) → T033 (US10)
  - `src/index.css`: additive rules from US3/US5/US8/US10 — no real conflict risk, order-independent
- **Polish (Phase 13)**: Depends on all 10 user stories being complete.

### Within Each User Story

- Type/data-layer changes before the UI that consumes them.
- Implementation before its own tests (tests can be written alongside; TDD not required since not
  explicitly requested).

### Parallel Opportunities

- T007 (US2 unit tests) is file-disjoint from T004-T006, T008 and can run once T004 lands.
- T010 (US3 CSS), T016 (US5 CSS), T020/T021 (US7 icons/types), T023/T024/T027/T028 (US8),
  T031 (US9), T034 (US10 CSS import) are each file-disjoint from their story's main task and safe
  to parallelize.

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (regression guard) → validate independently
3. Complete Phase 4: User Story 2 (multi-source Overview) → validate independently
4. **STOP and VALIDATE**: both P1 items are done — deploy/demo if ready

### Incremental Delivery

1. Setup → US1 → US2 (MVP: both P1 items)
2. US3 → US4 → US5 → US6 → US7 (P2: Overview polish + installability)
3. US8 → US9 → US10 (P3: footer/analytics/map)
4. Each story adds value without breaking previously-shipped stories

---

## Notes

- [P] tasks touch different files with no dependency on an incomplete task
- [Story] label maps each task to its user story for traceability
- Commit after each story's checkpoint, per this session's standing "commit and push after every
  /speckit-implement" preference
- PWA installability (US7) and the live analytics request (US9) are best verified manually against
  a production build/preview — neither is meaningfully testable under jsdom
