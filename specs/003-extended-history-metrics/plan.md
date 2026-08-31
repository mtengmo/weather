# Implementation Plan: Extended History Window, Additional Weather Metrics, and Display Controls

**Branch**: `003-extended-history-metrics` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-extended-history-metrics/spec.md`

## Summary

Extends the existing weather-history app (`001-weather-history-locations`, `002-vibrant-award-theme`) along six independent axes: a new **"Last 30 days"** observation window reusing the existing daily-aggregation mechanism (FR-001/FR-002, research.md §1); two new weather metrics — **wind speed** and **cloud coverage** — sourced from SMHI (parameters 4 and 16, both already in the target units — m/s and percent respectively, confirmed against SMHI's own parameter metadata) and Open-Meteo (`wind_speed_10m` with `wind_speed_unit=ms`, `cloud_cover`), surfaced via four **metric tabs** (Temperature/Rain/Wind/Cloud coverage, FR-003-FR-005, research.md §2-§3); the Rain tab's precipitation bar chart gains **one bar per shown nearby station**, not just the primary location (FR-006, research.md §3); a new **nearby-station-count dropdown** (0-4, default 4) that lowers and replaces the old fixed maximum of 5 (FR-007-FR-010, research.md §5); a single shared **decimal-rounding helper** applied to every tooltip and table cell (FR-011, research.md §6); and a **fixed metric unit default** (Celsius/m per s/mm) that replaces browser-locale detection for first-time users while leaving the existing manual toggle untouched (FR-012/FR-013, research.md §7). No backend, no new dependencies, no change to deployment (GitHub Pages, unchanged from `001-weather-history-locations` research.md §9) — every change is additive to the existing client-only React/TypeScript app.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18 (unchanged)

**Primary Dependencies**: Vite, React, Recharts (unchanged) — no new dependency. Grouped multi-series bar rendering (User Story 3) uses Recharts' existing default behavior for multiple `<Bar>` elements without a shared `stackId` (already how the app avoids needing a stacking library).

**Storage**: Browser `localStorage`, extended with one new key for the nearby-station-count preference (`weather-app:nearby-station-count:v1`), following the exact shape of the existing theme/unit preference keys (research.md §5, data-model.md).

**Testing**: Vitest + React Testing Library, unchanged. New/updated test files: `dailyAggregation.test.ts` (parameterized bucket count + wind/cloud averages), `format.test.ts` (new), `nearbyStationCount.test.ts` (new), `smhiProvider.test.ts`/`openMeteoProvider.test.ts`/`weatherApi.test.ts` (extended for wind/cloud fields, 30-day window, station-count parameter), `units.test.ts` (extended for the new default and wind conversion), plus integration coverage for metric-tab switching and the comparison-bar rendering.

**Target Platform**: Unchanged — modern evergreen browsers, static GitHub Pages deployment. No build/deploy config changes.

**Project Type**: Single-page web application (frontend-only), unchanged.

**Performance Goals**: 30-day view loads within the same budget as the existing 7-day view (SC-001) — it's the same number of network requests (one `getObservations` + up to 4 `getNearbyStationSeries` calls, still run via `Promise.all`/`Promise.allSettled` as today), just a longer SMHI/Open-Meteo query range on an already-cheap endpoint. Metric-tab switching (SC-002) and nearby-station-count changes reflecting in the chart (SC-004) both target 1 second — tab switching is pure client-side re-render (no re-fetch, per FR-005/data-model.md's "not persisted, doesn't affect fetching" design for `WeatherMetric`), while a station-count change does re-fetch (research.md §5) but reuses the same already-fast SMHI nearest-station-list cache from `001-weather-history-locations` (research.md §1b).

**Constraints**: No backend/server component (unchanged). Both providers remain called directly from the browser with no new auth/keys. Existing "no client-side routing" and "no unnecessary re-fetch on theme/unit change" constraints are preserved — only `WeatherMetric` (display-only) and `NearbyStationCount`/`ObservationWindow` (fetch-affecting) exist as new pieces of state, and only the latter two trigger a re-fetch, consistent with how `obsWindow` already triggers a re-fetch today.

**Scale/Scope**: Per location: 3 windows (was 2) × 4 metrics sharing one fetch (not 4 separate fetches — all fields come back on the same `WeatherObservation`) × up to 5 series (primary + up to 4 comparison stations, was up to 6). Net request shape is unchanged from today (one primary + up to N station calls) — only field count per observation and the count bound change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no project-specific principles ratified), same as for `001-weather-history-locations` and `002-vibrant-award-theme`. No constitution gates apply; this plan proceeds using standard best practices (simplicity, no unnecessary layers/dependencies, testability, additive/backward-compatible data-shape changes). Re-checked after Phase 1: still N/A — no violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/003-extended-history-metrics/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── weather-metrics-service.md
│   ├── daily-aggregation.md
│   ├── nearby-station-count-service.md
│   └── format-service.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ObservationChart.tsx        # MODIFIED: metric tabs (US2), per-station bars on Rain tab (US3), Tooltip rounding (US5)
│   ├── ObservationDetails.tsx      # MODIFIED: rounding via services/format.ts (US5), new wind/cloud columns, 30-day table support
│   ├── MetricTabs.tsx              # NEW: Temperature/Rain/Wind/Cloud coverage tab control (US2)
│   ├── NearbyStationCountControl.tsx # NEW: 0-4 dropdown (US4)
│   └── seriesColors.ts             # UNCHANGED — same distinguishing colors/dash patterns reused for the new bar series
├── hooks/
│   ├── useObservationData.ts       # MODIFIED: accepts nearbyStationCount, forwards to weatherApi
│   ├── useUnitPreference.ts        # MODIFIED: no behavior change needed (default change lives in services/units.ts)
│   └── useNearbyStationCountPreference.ts # NEW (US4)
├── services/
│   ├── weatherApi.ts               # MODIFIED: getNearbyStationSeries takes a count param; NEARBY_STATION_COUNT constant removed
│   ├── smhiProvider.ts             # MODIFIED: wind (param 4) + cloud (param 16, already percent) fetching; "last-30-days" window support
│   ├── openMeteoProvider.ts        # MODIFIED: wind_speed_10m + cloud_cover hourly vars, wind_speed_unit=ms, pastDaysFor("last-30-days")
│   ├── dailyAggregation.ts         # MODIFIED: toDailyAggregates(observations, bucketCount) — parameterized, + windAverage/cloudAverage
│   ├── units.ts                    # MODIFIED: fixed metric default (US6), + convertWindSpeed; locale-detection code removed
│   ├── nearbyStationCount.ts       # NEW (US4)
│   └── format.ts                   # NEW: formatValue(value, decimals=1) (US5)
├── models/
│   └── types.ts                    # MODIFIED: ObservationWindow gains "last-30-days"; WeatherObservation/DailyAggregate gain wind/cloud fields; new WeatherMetric, NearbyStationCount types
└── App.tsx                         # MODIFIED: wires MetricTabs, NearbyStationCountControl, and the new preference hook

tests/
├── unit/
│   ├── dailyAggregation.test.ts    # EXTENDED: bucketCount param, windAverage/cloudAverage
│   ├── format.test.ts              # NEW
│   ├── nearbyStationCount.test.ts  # NEW
│   ├── units.test.ts               # EXTENDED: fixed default, convertWindSpeed
│   ├── smhiProvider.test.ts        # EXTENDED: wind/cloud fetching + conversion, 30-day window
│   ├── openMeteoProvider.test.ts   # EXTENDED: wind/cloud hourly vars, 30-day past_days
│   └── weatherApi.test.ts          # EXTENDED: station-count parameter, count=0 short-circuit
└── integration/
    ├── chartAndDetails.test.tsx    # EXTENDED: metric-tab switching, comparison bars on Rain tab, 30-day details table
    └── nearbyStationCount.test.tsx # NEW: dropdown changes propagate to chart + persist
```

**Structure Decision**: Single frontend-only project, unchanged from `001-weather-history-locations`/`002-vibrant-award-theme` (Option 1, simplified). Every new concept follows an already-established pattern in this codebase rather than introducing a new one: `nearbyStationCount.ts` + `useNearbyStationCountPreference` mirror `theme.ts`/`useThemePreference` exactly (research.md §5); `format.ts` is a single small pure-function module like `units.ts`; `MetricTabs.tsx` and `NearbyStationCountControl.tsx` are presentational components following the existing `ThemePicker.tsx`/`UnitToggle.tsx` shape (a `role="group"` button set or a `<select>`, wired to a hook-provided value/setter). No new directories, no state-management library, no router — `WeatherMetric` is local UI state in `App.tsx` exactly like the existing `view`/`obsWindow` state.

## Complexity Tracking

*No constitution violations to justify — table intentionally omitted.*
