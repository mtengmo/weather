# Tasks: Timeline Polish and Header Consolidation

**Input**: Design documents from `C:\GitRepos\weather\specs\009-timeline-polish-and-header\`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested in spec.md, but this repo has paired implementation with tests under `tests/unit/`/`tests/integration/` for every prior feature (005–011) — this plan continues that convention.

**Organization**: Tasks are grouped by user story (spec.md priorities: US1=P1 header, US2=P2 leaner rows, US3=P2 defect fixes, US4=P3 location cache).

## Path Conventions

Single-project web frontend (unchanged). Source under `src/`; tests under the top-level `tests/unit/` and `tests/integration/`.

---

## Phase 1: Setup

- [X] T001 Verify the pre-009 baseline is clean: run `npm test`, `npx tsc -b --noEmit`, and `npm run build` against the current codebase before starting, so any failure surfaced later is known to be from this feature's changes.

---

## Phase 2: Foundational

No blocking prerequisites shared by all four stories — each touches a distinct slice (header JSX,
`timelineData.ts` row/format logic, and a brand-new `locationCache.ts` file). US2 and US3 do share
`timelineData.ts`/`WeatherIconOverview.tsx`, so sequence those two after each other rather than in
true parallel (see Dependencies below); this doesn't require a separate blocking phase.

**Checkpoint**: Skip directly to Phase 3 — no foundational tasks to complete first.

---

## Phase 3: User Story 1 - A compact, consolidated header (Priority: P1) 🎯 MVP

**Goal**: The header is a single compact strip with no standalone title row, containing the search input and favorites list alongside the existing theme/unit/window controls, usable at both mobile and laptop widths.

**Independent Test**: Load the app on a phone-sized viewport; confirm search and favorites are reachable from the header without scrolling past a large title, and the header wraps (not clips) at narrow widths.

### Implementation for User Story 1

- [X] T002 [US1] Edit `src/App.tsx` (research.md §6): remove the standalone `<h1>Weather History</h1>`; move the existing `<PlaceSearch onSelect={...} />` and `<FavoritesList ... />` JSX (currently rendered below the graph/timeline views) into `<header className="app-header">`, alongside the existing `<div className="header-controls">` block. Keep both components' props/behavior unchanged — this is a JSX relocation only.
- [X] T003 [P] [US1] Edit `src/index.css`: extend `.app-header`'s existing `flex-wrap` layout rules so the relocated `.place-search`/`.favorites` sit cleanly alongside `.header-controls` at both mobile and laptop widths (FR-004), reusing the existing wrapping behavior rather than introducing a new layout system.
- [X] T004 [US1] Create `tests/integration/appHeader.test.tsx` (new file, renders `<App />` directly — mock `weatherApi`/`geolocation` the same way `tests/integration/observationFlow.test.tsx` mocks its dependencies): assert the header contains the search input (`getByLabelText("Search for a place")` or similar) and the favorites heading, and that no standalone "Weather History" heading is rendered as its own top-level element.

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable — this alone is a shippable MVP polish pass.

---

## Phase 4: User Story 2 - A leaner set of timeline rows (Priority: P2)

**Goal**: No cloud-cover or feels-like row renders; the wind row shows `12 (18) m/s`-style combined speed+gust text, both values whole numbers, falling back to plain speed when gust is unavailable.

**Independent Test**: Open the timeline for a location with full data; confirm no cloud-cover/feels-like rows exist, and the wind row's formatting matches the combined pattern.

### Implementation for User Story 2

- [X] T005 [US2] Edit `src/components/timelineData.ts` (data-model.md, contracts/timeline-changes.md): remove the `cloud` and `feelsLike` `TimelineRow` construction blocks in `buildRows` and their fields from the `TimelineData` interface; remove the standalone `gust` `TimelineRow` construction block and its `TimelineData` field; add `gust?: number | null` to `TimelineRowPoint`; set it on each `wind` row point from `s.windGust` (already available on `RowSource`), converted the same way the old standalone gust row was. Remove the now-unused `feelsLike` computation in both `buildHourlyTimelineData`'s and `buildDailyTimelineData`'s `RowSource` mapping (the `deriveFeelsLike`/`day.feelsLikeAverage` calls feeding it) since nothing reads it anymore — leave `deriveFeelsLike` itself and `dailyAggregation.ts`'s `feelsLikeAverage` field untouched (contracts/timeline-changes.md "No changes to").
- [X] T006 [US2] Edit `src/components/WeatherIconOverview.tsx` (contracts/timeline-changes.md): remove the `<LineRow row={timeline.cloud} .../>` and `<LineRow row={timeline.feelsLike} .../>` call sites and any now-unused references. In `WindRow`, replace the `formatRowValue(row, point.value)` call with whole-number formatting: `${Math.round(point.value)}` alone, or `${Math.round(point.value)} (${Math.round(point.gust)})` when `point.gust != null`, followed by the row's unit label (FR-007/FR-008/FR-009).
- [X] T007 [P] [US2] Unit tests in `tests/unit/timelineData.test.ts`: `TimelineData` no longer has `cloud`/`feelsLike` fields (type-level — covered implicitly by `tsc`) and the wind row's points carry a `gust` value equal to the converted `windGust`/`windGustHigh` source; a point with no gust source data has `gust: null`.
- [X] T008 [US2] Integration tests in `tests/integration/weatherIconOverview.test.tsx`: a fully-populated series renders no cloud-cover row and no feels-like row (`queryByText(/Cloud cover/)`/`queryByText(/Feels like/)` both null); a wind column with gust data renders text matching `/12 \(18\) m\/s/`-style whole-number-parenthetical pattern; a wind column without gust data renders plain whole-number speed with no parentheses.

**Checkpoint**: User Stories 1 and 2 both work independently and together.

---

## Phase 5: User Story 3 - Fix timeline display and navigation defects (Priority: P2)

**Goal**: Hour labels are locale-independent (always 24-hour), the timeline pans horizontally via plain mouse-wheel input (not just trackpad/scrollbar-drag), and the single "now" boundary column shows an interpolated estimate instead of a blank gap when its immediate neighbors both have data.

**Independent Test**: On a mobile viewport with a non-Swedish locale but Swedish timezone, hour labels are still 24-hour; on a laptop viewport with overflowing content, plain mouse-wheel scroll pans the timeline; a series with data-having neighbors around the boundary column shows an estimated value there.

### Implementation for User Story 3

- [X] T009 [US3] Edit `src/components/timelineData.ts`'s `buildHourlyTimelineData` (research.md §1, data-model.md): change the period `label` computation from `new Date(obs.timestamp).toLocaleTimeString([], { hour: "2-digit" })` to `new Date(obs.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", hourCycle: "h23" })`.
- [X] T010 [P] [US3] Unit test in `tests/unit/timelineData.test.ts`: for a fixed timestamp, the hourly period label matches a 2-digit 24-hour pattern (`/^\d{2}$/`) with no `AM`/`PM` substring, regardless of the test runner's own default locale.
- [X] T011 [US3] Edit `src/components/timelineData.ts`'s `buildHourlyTimelineData` (research.md §3, data-model.md): after `buildRows` returns, if `nowBoundaryIndex !== null`, for each of the core numeric rows (temperature, precipitation, wind, snow — whichever currently exist post-T005), check `row.points[nowBoundaryIndex + 1]`; if its `value === null` and both `row.points[nowBoundaryIndex].value` and `row.points[nowBoundaryIndex + 2]?.value` are non-null, set the boundary point's `value` to their midpoint average and `interpolated: true`. Leave it as a plain gap otherwise (including when `nowBoundaryIndex + 2` is out of bounds). Do not add this logic to `buildDailyTimelineData` (Edge Cases). Depends on T005 (touches the same row set).
- [X] T012 [P] [US3] Unit tests in `tests/unit/timelineData.test.ts`: the boundary column is interpolated (midpoint value, `interpolated: true`) when both neighbors have data; remains a plain gap (`interpolated` falsy) when either neighbor is null or `nowBoundaryIndex + 2` doesn't exist; `buildDailyTimelineData`'s output never sets `interpolated` on any point.
- [X] T013 [US3] Edit `src/components/WeatherIconOverview.tsx`'s `LineRow`/`BarRow`/`WindRow` (contracts/timeline-changes.md): when rendering a point's value, if `point.interpolated` is true, wrap it in a `weather-timeline-interpolated` class (in addition to its normal rendering) so it's visually distinguished from a genuinely observed or forecast value. Depends on T011.
- [X] T014 [P] [US3] Add `.weather-timeline-interpolated` styling to `src/index.css`: a visual treatment distinct from `.weather-timeline-gap` (which shows nothing but a dash) and from plain observed/forecast values — e.g. italic text with a subtle border or icon, using existing theme variables (`--text-muted`).
- [X] T015 [US3] Add an `onWheel` handler to the `.weather-timeline-wrap` element in `src/components/WeatherIconOverview.tsx` (research.md §2): when the container's `scrollWidth > clientWidth` and the wheel event's `deltaY` is non-zero, call `event.currentTarget.scrollLeft += event.deltaY` (and `event.preventDefault()` only when the redirect actually applies, so vertical page-scroll still works when the timeline isn't overflowing).
- [X] T016 [US3] Integration tests in `tests/integration/weatherIconOverview.test.tsx`: a series with data-having neighbors around the boundary column renders that column's value with the `weather-timeline-interpolated` class in a core row; a series where a neighbor is also missing still renders a plain gap there. (The wheel-to-scroll behavior in T015 isn't meaningfully assertable under jsdom's non-real layout — covered by quickstart.md Scenario 4's manual Playwright pass instead, matching this repo's existing precedent for untestable-under-jsdom scroll/dimension behavior.)

**Checkpoint**: User Stories 1, 2, and 3 all work independently and together.

---

## Phase 6: User Story 4 - Remember the last-viewed location (Priority: P3)

**Goal**: A location explicitly selected (favorite, search result, or current-position) is remembered across reloads and restored automatically, falling back gracefully when absent, unavailable, or stale.

**Independent Test**: Select a favorite, reload, confirm it's shown again without re-selection; clear storage and reload, confirm default behavior; remove a cached favorite and reload, confirm graceful fallback.

### Implementation for User Story 4

- [X] T017 [P] [US4] Create `src/services/locationCache.ts` (contracts/location-cache.md, data-model.md): `getCachedLocation(): Location | null` and `setCachedLocation(location: Location): void`, both `localStorage`-backed under key `"weather-app:last-location:v1"`, wrapped in `try/catch` for graceful degradation, with minimal shape validation on read (reject anything not matching `Location`'s required fields).
- [X] T018 [P] [US4] Unit tests in new `tests/unit/locationCache.test.ts`: `setCachedLocation` then `getCachedLocation` round-trips the same location; `getCachedLocation` returns `null` when nothing is stored, when the stored value is malformed JSON, or when `localStorage` itself throws; `setCachedLocation` doesn't throw when `localStorage` throws.
- [X] T019 [US4] Edit `src/App.tsx` (research.md §4/§5, contracts/location-cache.md): add a mount-time effect that runs once, reads `getCachedLocation()`, and — only while `selected` is still `null` — calls `setSelected(cached)` if the cache is non-null and (for `source: "favorite"`) a favorite with matching `latitude`/`longitude` still exists in the loaded `favorites` list; otherwise leaves `selected` for the existing `currentLocation`-sync effect to populate as today. Add `setCachedLocation(location)` as the first line of `selectLocation`. Depends on T017.
- [X] T020 [US4] Extend `tests/integration/appHeader.test.tsx` (from T004) or add a new test file: a pre-populated cached favorite is restored as the selected location on a fresh render, without waiting on the geolocation flow; with no cache present, the existing default flow is unaffected; a cached favorite that isn't in the loaded favorites list falls back to the default flow rather than showing a broken state. Depends on T004, T019.

**Checkpoint**: All four user stories are independently functional and work together.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T021 [P] Run `npm run lint` and fix any issues in the touched files.
- [X] T022 Run `npm test`, `npx tsc -b --noEmit`, and `npm run build`; fix any failures across the extended/new test suite and the TypeScript build.
- [X] T023 Manually execute `specs/009-timeline-polish-and-header/quickstart.md` scenarios 1-6 against the running dev server, using the Playwright setup already proven working in this repo's prior polish phases — pay particular attention to Scenario 3 (hour-label locale independence, best emulated via a mobile viewport/locale override), Scenario 4 (plain mouse-wheel horizontal scroll, not just trackpad), and Scenario 6 (cached-location restore across a real reload).
- [X] T024 [P] Confirm the new header layout and the `.weather-timeline-interpolated` marker both follow the active theme (spot-check Midnight/Bright/Glass) and remain legible/usable at both mobile and laptop viewport widths.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: None — skipped.
- **User Story 1 (Phase 3)**: Independent of every other story — different files (`App.tsx`, `index.css` header rules) than US2/US3's `timelineData.ts`/`WeatherIconOverview.tsx` work.
- **User Story 2 (Phase 4)**: Independent of US1/US4. Shares `timelineData.ts`/`WeatherIconOverview.tsx` with US3 — sequence before US3 if one person/agent is doing both, to avoid merge conflicts within those two files.
- **User Story 3 (Phase 5)**: Independent of US1/US4. T011 (interpolation) depends on T005 (US2's row removal) only in the sense that both touch `buildRows`'s output shape — land US2 first if doing both.
- **User Story 4 (Phase 6)**: Independent of US2/US3. T019/T020 depend on T004 (US1's new `appHeader.test.tsx` harness) only for the *test* reuse — the `locationCache.ts` service itself (T017/T018) has no dependency on US1 at all and can be built in parallel.
- **Polish (Phase 7)**: Depends on whichever of Phases 3-6 are in scope for this delivery.

### Within Each Story

- T002 before T003 (CSS targets the relocated markup) before T004 (tests assert the result).
- T005 before T006 (rendering reads the new row shape) before T007/T008 (tests).
- T009 before T010 (test). T005/T009 before T011 (interpolation reads the post-row-removal, post-relabel row set) before T012 (test) before T013 before T014 (styling) before T016 (test). T015 (wheel handler) is independent of T009-T014 within this story.
- T017 before T018 (test) before T019 (wiring) before T020 (test).

### Parallel Opportunities

- T003 is `[P]` relative to T002's completion (CSS vs. component markup, though targets what T002 introduces).
- T007 is `[P]` relative to T006 (test file vs. source file).
- T010, T012, T014 are each `[P]` relative to their sibling implementation tasks.
- T017/T018 are `[P]` relative to the entire US1/US2/US3 work — no shared files.
- T021 and T024 are `[P]` within Polish.

---

## Parallel Example: Independent Story Kickoff

```bash
# These four can all start immediately after Setup, by different people/agents:
Task: "US1 — relocate header JSX (T002)"
Task: "US2 — remove cloud/feelsLike rows, merge gust into wind (T005)"
Task: "US4 — create locationCache.ts (T017)"
# US3's T009 (hour label) can also start immediately; T011 (interpolation) waits on T005.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 3 (User Story 1) — the header consolidation.
3. **STOP and VALIDATE**: run quickstart.md Scenario 1 on a real mobile viewport.
4. Demo/ship if ready — spec.md frames this as the highest-leverage, lowest-risk change.

### Incremental Delivery

1. Setup → User Story 1 → validate → ship (header polish).
2. Add User Story 2 → validate → ship (leaner rows).
3. Add User Story 3 → validate → ship (defect fixes).
4. Add User Story 4 → validate → ship (location memory).
