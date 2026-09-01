# Tasks: Combined Weather Icon Overview

**Input**: Design documents from `C:\GitRepos\weather\specs\007-weather-icon-overview\`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested in spec.md, but this repo has paired implementation with tests under `tests/unit/`/`tests/integration/` for every prior feature (001–006) — this plan continues that convention.

**Organization**: Tasks are grouped by user story (spec.md priorities: US1=P1 24h icon overview, US2=P2 7-day icon overview, US3=P3 responsive/screen-filling layout) so each can be implemented, tested, and demoed independently — with one noted exception under Dependencies (US3 refines markup US1 creates).

## Path Conventions

Single-project web frontend (unchanged). Source under `src/`; tests under the top-level `tests/unit/` and `tests/integration/`.

---

## Phase 1: Setup

- [X] T001 Add the `lucide-react` dependency (`npm install lucide-react`); confirm `npm run build` and `npm test` still succeed with it added, before any feature code depends on it (plan.md, research.md §1).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The condition-derivation logic, icon lookup, and the new view's shell/navigation are used by every user story below — none of them can render anything without this.

- [X] T002 Add the `WeatherCondition` type (data-model.md) and its deriving function to new `src/services/weatherCondition.ts`: given `{ temperature, precipitation, windSpeed, cloudCoverPercent, timestamp? }`, return one of `"clear-day" | "clear-night" | "cloudy" | "rainy" | "windy" | "snowy"` or `null`, evaluated in this exact priority order (contracts/weather-condition.md, research.md §2): (1) `null` when `temperature === null && precipitation === null` (reusing the existing gap-detection rule from `ObservationDetails.tsx`/`chartData.ts`); (2) `"snowy"` when `precipitation` is a positive number and `temperature <= 0`; (3) `"rainy"` when `precipitation` is a positive number; (4) `"windy"` when `windSpeed >= 8` (m/s, Beaufort "Fresh Breeze"); (5) `"cloudy"` when `cloudCoverPercent >= 50`; (6) otherwise `"clear-day"`, or `"clear-night"` when `timestamp` is provided and its local hour is before 06:00 or at/after 20:00 (research.md §3) — when `timestamp` is omitted, a clear result is always `"clear-day"`.
- [X] T003 [P] Create `src/components/weatherIcons.tsx`: a lookup from each non-null `WeatherCondition` to its `lucide-react` icon component and an accessible text label — `"clear-day"` → `{ Icon: Sun, label: "Clear" }`, `"clear-night"` → `{ Icon: Moon, label: "Clear" }`, `"cloudy"` → `{ Icon: Cloud, label: "Cloudy" }`, `"rainy"` → `{ Icon: CloudRain, label: "Rain" }`, `"windy"` → `{ Icon: Wind, label: "Windy" }`, `"snowy"` → `{ Icon: CloudSnow, label: "Snow" }` (contracts/weather-icon-overview-ui.md).
- [X] T004 Create `src/components/WeatherIconOverview.tsx` with the same `location`/`unit`/`series`/`window`/`onWindowChange` prop shape `ObservationChart` already receives (contracts/weather-icon-overview-ui.md), rendering a heading and a loading/empty state for now (grid content added in US1/US2 below); in `src/App.tsx`, extend `type View = "graph" | "details"` to include `"overview"`, add a navigation button (alongside the existing "View details" button) to reach it, and render `<WeatherIconOverview>` with a `onBack`-style return to the graph view, mirroring the existing details-view navigation pattern (FR-009).

**Checkpoint**: The new view is reachable and renders an empty shell; each user story phase below fills it in.

---

## Phase 3: User Story 1 - See the next 24 hours at a glance with icons (Priority: P1) 🎯 MVP

**Goal**: The overview view's 24-hour period shows one weather icon per hour, derived from that hour's temperature/precipitation/wind/cloud, with forecast hours and data gaps both visually distinguished.

**Independent Test**: Load the overview view for a location with a full 24 hours of data (mixing observed, forecast, and at least one gap); confirm one correct icon per hour, a moon (not sun) for clear night hours, and distinct treatment for forecast/no-data hours.

### Implementation for User Story 1

- [X] T005 [US1] In `WeatherIconOverview.tsx`, for the `"last-24-hours"` window, map `series.observations` to one grid cell per hour: call `weatherCondition.ts` (T002) with each observation's values and `timestamp`, look up its icon via `weatherIcons.tsx` (T003), and render the icon, the hour label (same format as the existing charts' hourly X-axis ticks), and the period's key values (temperature always; precipitation/wind/cloud when non-null) — per FR-005, values stay visible next to the icon, not replaced by it.
- [X] T006 [US1] In the same mapping, render a distinct "no data" cell (text/icon, not a guessed condition) when `weatherCondition.ts` returns `null` for an hour (FR-008), and apply a forecast-distinguishing treatment (reduced opacity, matching 005/006's existing `fillOpacity`/`strokeOpacity` convention, plus a visible "Forecast" text label for accessibility) when `observation.isForecast` is `true` (FR-007, research.md §4).
- [X] T007 [P] [US1] Unit tests for `weatherCondition.ts` in new `tests/unit/weatherCondition.test.ts`: one test per priority level (no-data, snowy, rainy, windy, cloudy, clear-day, clear-night) plus boundary cases (exactly 0°C, exactly the windy/cloudy thresholds) and a case confirming a period with multiple simultaneous true conditions (e.g., rain + high wind) resolves to the higher-priority one only.
- [X] T008 [US1] Extend `tests/integration/weatherIconOverview.test.tsx` (new file) with a `describe("US1: 24h icon overview", ...)` block: renders one icon per hour for a mocked series with mixed observed/forecast/gap hours; a clear night hour shows the moon icon; a forecast hour is visually distinguished; a gap hour shows the no-data indicator instead of any condition icon.

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable — this alone is a shippable MVP.

---

## Phase 4: User Story 2 - See the week ahead the same way (Priority: P2)

**Goal**: The overview view's 7-day period shows one weather icon per day, using the same condition-derivation logic at daily granularity.

**Independent Test**: Switch the overview view to the 7-day period for a location with a full week of data (including at least one forecast day); confirm one icon per day, always using the sun (never the moon) for a clear day, and a forecast day visually distinguished the same way as User Story 1's forecast hours.

### Implementation for User Story 2

- [X] T009 [US2] In `WeatherIconOverview.tsx`, add the `"last-7-days"` window option to its window toggle (scoped to only these two windows per contracts/weather-icon-overview-ui.md — no 30-day option, per spec Edge Cases) and, for that window, map `toDailyAggregates(series.observations, 7)` to one grid cell per day: call `weatherCondition.ts` with each day's `high`/`totalPrecipitation`/`windAverage`/`cloudAverage`-derived values and no `timestamp` (so a clear day always resolves `"clear-day"`, research.md §3), reusing the same icon lookup, forecast treatment (`DailyAggregate.isForecast`), and no-data handling as User Story 1.
- [X] T010 [P] [US2] Extend `tests/unit/weatherCondition.test.ts`: confirms that omitting `timestamp` always yields `"clear-day"` (never `"clear-night"`) for an otherwise-clear input, regardless of what time of day the underlying data might represent.
- [X] T011 [US2] Extend `tests/integration/weatherIconOverview.test.tsx` with a `describe("US2: 7-day icon overview", ...)` block: switching to the 7-day window renders one icon per day with daily values (e.g., high/low temperature); a forecast day is visually distinguished; no 30-day option is offered by this view's window toggle.

**Checkpoint**: User Stories 1 and 2 both work independently and together.

---

## Phase 5: User Story 3 - A view that actually uses the screen (Priority: P3)

**Goal**: The overview view's icon grid visibly scales with the browser window — occupying substantially more space than the existing fixed-height charts on a large window, and reflowing to stay legible on a smaller one.

**Independent Test**: With User Story 1's 24h grid already rendering (this story styles that existing markup rather than adding new data), resize the browser window and confirm the grid's column count and icon size visibly adapt rather than overflowing or becoming illegibly small.

### Implementation for User Story 3

- [X] T012 [US3] Add responsive grid CSS to `src/index.css` for the overview's period-cell container: `display: grid; grid-template-columns: repeat(auto-fit, minmax(<cell-width>, 1fr))` (research.md §5), and size the overview's outer container to grow with the viewport (no fixed `height: 320px` the way the existing chart `<ResponsiveContainer>`s use) so FR-011's "substantially more space than the existing charts" holds on a typical desktop window. Apply the same theme CSS variables (`--surface`, `--border`, `--text-muted`, etc.) the rest of the app already uses, so it matches the active theme (FR-010).
- [X] T013 [P] [US3] Extend `tests/integration/weatherIconOverview.test.tsx` with a `describe("US3: responsive layout", ...)` block: confirms the overview's grid container carries the new CSS-grid class/styling (not the fixed-height chart container class) — a structural smoke check, since actual visual reflow at different widths isn't something jsdom can verify (matches this repo's existing precedent — see 006's `ObservationChart` tests — of not asserting real rendered dimensions under jsdom).

**Checkpoint**: All three user stories are independently functional; User Story 3 visibly changes how User Story 1/2's already-correct content is presented.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T014 [P] Run `npm run lint` and fix any issues in the touched files.
- [X] T015 Run `npm test` and `npm run build`; fix any failures across the extended test suite and the TypeScript build.
- [X] T016 Manually execute `specs/007-weather-icon-overview/quickstart.md` scenarios 1–4 against the running dev server (`npm run dev`) for a real location; note in the PR/commit description any deviation found, and if no browser-automation tool is available in this environment (as was the case for 005/006), do best-effort checks (dev server boots and serves) and say so explicitly rather than claiming a full visual pass. **Partial**: as with 005/006, no browser-automation tool was available in this environment — confirmed the dev server boots and serves the page (`curl` 200). Unlike the Recharts-based views, `WeatherIconOverview` renders fully and testably under jsdom (confirmed by T008/T011/T013's real, non-smoke assertions — e.g. finding icon labels, forecast markers, and high/low text by content), which gives materially higher confidence than 005/006's chart-internals coverage could. A real click-through (icon appearance, actual grid reflow on resize, theme/unit visuals) still needs a live browser pass before shipping.
- [X] T017 [P] Confirm the overview view's icon colors/backgrounds follow the active theme (Midnight/Ivory/Glass) and its values follow the active unit system, by inspecting `WeatherIconOverview.tsx`'s CSS-variable usage and its use of the existing `convertTemperature`/`convertPrecipitation`/`convertWindSpeed` functions (`src/services/units.ts`) for displayed values — condition *derivation* itself (T002) intentionally stays unit-independent (contracts/weather-condition.md), only the displayed numbers convert. **Confirmed by code inspection**: `OverviewCard` calls `convertTemperature`/`convertPrecipitation`/`convertWindSpeed` for every displayed value (never the raw metric value); `.weather-overview-cell` and its icon (`color: var(--accent)`) use the same theme CSS variables (`--surface`, `--border`, `--text-muted`, `--accent`) as the rest of the app, plus an explicit `[data-theme="glass"]` override matching the existing glass-theme pattern for other panels (`.app-header`, `.error-banner`, etc.) in `src/index.css`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T002/T003 don't need the new dependency, but T004's component shell is a natural place to first import `weatherIcons.tsx`) — BLOCKS all three user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. Independent of Phase 4.
- **User Story 2 (Phase 4)**: Depends on Foundational. Independent of Phase 3's *data* handling, though it extends the same `WeatherIconOverview.tsx` file — sequence Phase 3 before Phase 4 if one person/agent is doing both, to avoid merge conflicts within that file.
- **User Story 3 (Phase 5)**: Depends on Foundational **and** on Phase 3 (T012/T013 style and verify the grid markup Phase 3 creates) — this is the one exception to full story independence in this feature, noted here rather than glossed over: US3 is a presentation refinement of content US1 already renders, not new data or logic.
- **Polish (Phase 6)**: Depends on whichever of Phases 3–5 are in scope for this delivery.

### Within Each Phase

- T002 before T003 (icons keyed off the type T002 defines) before T004 (component imports both) before Phase 3/4's rendering work.
- T005 before T006 (no-data/forecast handling extends the same mapping) before T007/T008 (tests).
- T009 before T010/T011 (tests).
- T012 before T013 (test verifies the CSS T012 adds).

### Parallel Opportunities

- T003 is [P] relative to T002 only in the sense that it can be *written* in parallel (it only needs T002's *type*, not its implementation) — but see the file note above; in practice sequencing them is simplest.
- T007 can run alongside T005/T006 (different files: test file vs. component file) once T002 lands.
- T010 is [P] once T009 lands.
- T013 is [P] once T012 lands.
- T014 and T017 are [P] within Polish.

---

## Parallel Example: Foundational Phase

```bash
# T002 first (defines the type), then in parallel:
Task: "Create src/components/weatherIcons.tsx icon lookup"
# ...then T004 (component shell) once both land.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (User Story 1) — the 24h icon overview.
3. **STOP and VALIDATE**: run quickstart.md scenario 1 against a real/mocked location.
4. Demo/ship if ready — spec.md notes this alone "delivers the primary value on its own."

### Incremental Delivery

1. Setup + Foundational → the new view exists and is reachable, empty.
2. Add User Story 1 → validate independently → ship (MVP).
3. Add User Story 2 → validate independently → ship.
4. Add User Story 3 → validate (visually resize the window) → ship — remember this one depends on US1's markup already existing, unlike this repo's other recent features.
