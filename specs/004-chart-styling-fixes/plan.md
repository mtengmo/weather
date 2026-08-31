# Implementation Plan: Nearby-Station Name Fix and Temperature/Wind Chart Styling

**Branch**: `004-chart-styling-fixes` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-chart-styling-fixes/spec.md`

## Summary

A bug fix plus three chart-styling refinements, all layered on the existing weather-history app (`001`-`003`): a **fallback label** ("Unnamed station") for any nearby comparison station whose name is blank in SMHI's own data, fixed at its single construction point in `smhiProvider.ts` so every consumer inherits it (FR-001/FR-002, research.md §1); the temperature graph's 7-day/30-day **high line rendered red and low line rendered blue** for the primary location only, via two new fixed color constants, leaving the average line and every nearby-station line unchanged (FR-003/FR-004, research.md §2); a new **high/low visibility toggle** (default on), persisted like the app's other display preferences, that purely hides/shows the high/low lines on the temperature and wind 7-day/30-day charts without triggering a re-fetch (FR-005-FR-008, research.md §3); and the wind graph's 7-day/30-day view **gains its own high/low/average presentation**, sourced from two new `windHigh`/`windLow` daily-aggregate fields and rendered via a row-builder factored out and shared with temperature's existing high/low/average logic (FR-009/FR-010, research.md §4). No backend, no new dependencies, no deployment change.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18 (unchanged)

**Primary Dependencies**: Vite, React, Recharts (unchanged) — no new dependency.

**Storage**: Browser `localStorage`, extended with one new key for the high/low visibility preference (`weather-app:high-low-visible:v1`), following the exact shape of the existing preference keys.

**Testing**: Vitest + React Testing Library, unchanged. New/updated test files: `smhiProvider.test.ts` (station-name fallback), `dailyAggregation.test.ts` (windHigh/windLow), `chartData.test.ts` (shared high/low/average row builder, wind variant), `highLowVisibility.test.ts` (new), plus integration coverage for the toggle and the wind graph's new three-line presentation.

**Target Platform**: Unchanged — modern evergreen browsers, static GitHub Pages deployment (now served from `weather.tengmo.com`, unaffected by this feature). No build/deploy config changes.

**Project Type**: Single-page web application (frontend-only), unchanged.

**Performance Goals**: The high/low toggle updates rendered lines within 1 second with no re-fetch (SC-003) — a pure client-side conditional render over already-fetched/aggregated data, the same mechanism that already makes theme-switching instant (`002-vibrant-award-theme` SC-008). The wind graph's new high/low lines add no new network request — `windHigh`/`windLow` are computed client-side from data already fetched for the existing wind-average line.

**Constraints**: No backend/server component (unchanged). This feature touches no provider-fetch logic beyond the one-line station-name fallback (which changes a value, not a request). The high/low toggle must not affect the 24-hour view, the Rain/Cloud tabs, or the details table (FR-008) — enforced by scoping the conditional rendering to exactly the temperature/wind 7-day/30-day `<Line>` elements for "...High"/"...Low", nothing else.

**Scale/Scope**: One provider fix (1 line, 1 function), two new color constants, one new boolean preference (service + hook + control), two new `DailyAggregate` fields, one shared row-builder refactor (temperature's existing logic factored out, reused by a new wind variant). No new screens, routes, or major components — one new small control component (`HighLowToggle.tsx`), following the existing `UnitToggle.tsx` shape.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no project-specific principles ratified), same as for every prior feature in this repo. No constitution gates apply; this plan proceeds using standard best practices (simplicity, no unnecessary layers/dependencies, testability, additive/backward-compatible data-shape changes, factor-don't-duplicate for the shared row-builder). Re-checked after Phase 1: still N/A — no violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/004-chart-styling-fixes/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   ├── daily-aggregation.md
│   ├── high-low-visibility-service.md
│   └── station-name-and-chart-rows.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ObservationChart.tsx    # MODIFIED: HIGH_COLOR/LOW_COLOR on primary temp high/low (US2); highLowVisible prop conditionally renders High/Low lines on temp + new wind branch (US3); wind 7d/30d branch switches to buildWindDailyRows, three lines (US4)
│   ├── HighLowToggle.tsx       # NEW: on/off control, mirrors UnitToggle.tsx (US3)
│   ├── chartData.ts            # MODIFIED: buildDailyRows refactored to use new shared buildHighLowAverageDailyRows; new buildWindDailyRows (US4)
│   └── seriesColors.ts         # MODIFIED: + HIGH_COLOR, LOW_COLOR constants (US2)
├── hooks/
│   └── useHighLowVisibilityPreference.ts # NEW (US3)
├── services/
│   ├── smhiProvider.ts         # MODIFIED: nearestActiveStations falls back to "Unnamed station" (US1)
│   ├── dailyAggregation.ts     # MODIFIED: + windHigh/windLow computation (US4)
│   └── highLowVisibility.ts    # NEW: get/set preference (US3)
├── models/
│   └── types.ts                # MODIFIED: DailyAggregate gains windHigh/windLow; new HighLowVisibility type + default
└── App.tsx                     # MODIFIED: wires useHighLowVisibilityPreference + HighLowToggle into header controls and ObservationChart props

tests/
├── unit/
│   ├── smhiProvider.test.ts        # EXTENDED: blank-name station falls back to "Unnamed station"
│   ├── dailyAggregation.test.ts    # EXTENDED: windHigh/windLow computation
│   ├── chartData.test.ts           # EXTENDED: buildDailyRows unchanged output (regression), new buildWindDailyRows coverage
│   └── highLowVisibility.test.ts   # NEW
└── integration/
    └── chartAndDetails.test.tsx    # EXTENDED: toggle hides/shows high/low on temp + wind, unaffected 24h/details/Rain/Cloud
```

**Structure Decision**: Single frontend-only project, unchanged from prior features (Option 1, simplified). Every new concept follows an already-established pattern: `highLowVisibility.ts` + `useHighLowVisibilityPreference` mirror `theme.ts`/`useThemePreference` and `003`'s `nearbyStationCount.ts` exactly; `HighLowToggle.tsx` follows `UnitToggle.tsx`'s two-button shape; the two new color constants live alongside the existing `SERIES_COLORS` in the same file. The one deliberate refactor — factoring `buildDailyRows`'s high/low/average row-building into a shared `buildHighLowAverageDailyRows` helper — is scoped narrowly (temperature and wind only) so it doesn't touch `003-extended-history-metrics`'s separate single-value `buildMetricDailyRows`/`METRIC_FIELDS` machinery used by Rain/Cloud.

## Complexity Tracking

*No constitution violations to justify — table intentionally omitted.*
