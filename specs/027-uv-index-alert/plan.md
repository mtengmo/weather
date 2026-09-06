# Implementation Plan: UV Index Risk Indicator

**Branch**: `027-uv-index-alert` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-uv-index-alert/spec.md`

## Summary

Adds a new SMHI-only data fetch (STRÅNG analysed-irradiance, parameter 116) alongside the
existing observation/forecast fetches, converts its hourly values to the standard 0–11+ UV
Index, and threads a per-period "is this period risky (UV Index ≥ 6)?" flag through the same
`TimelinePeriod` structure the existing Weather condition icon row already renders from. The
existing `ConditionRow` icon cell gets one small conditional badge — no new row, chart, or
section. Non-Swedish locations and forecast (future) periods simply never carry the flag, so
they render byte-identical to today.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: Vite 5, Vitest 2 + Testing Library; no new runtime dependency —
reuses `fetch` the same way every other provider in `src/services/` already does

**Storage**: N/A (no backend; per-load fetch only, same as every other weather data source)

**Testing**: Vitest + `@testing-library/react` (unit tests for the irradiance→UV-Index
conversion and threshold logic; integration test asserting the badge appears/doesn't appear on
`ConditionRow`); live Playwright verification against the real STRÅNG endpoint before merging,
following this session's established practice

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: One additional lightweight per-location fetch (a single STRÅNG point
query), fired in parallel with existing fetches — no measurable added load time on top of the
app's existing multi-source fetch pattern (`useObservationData`'s `Promise.all`)

**Constraints**: Must never block or delay the rest of the overview (FR-006) — fetched and
merged the same "own effect, independent failure" way `025-reduce-api-requests` already
established for nearby-station data; must not alter `ConditionRow`'s rendering for any period
that has no UV reading (FR-002, FR-005), which today is every period outside Sweden and every
forecast period, since STRÅNG only ever publishes analysed (already-happened) data.

**Scale/Scope**: One new provider function (`smhiProvider.getUvIndex`), one new field threaded
through `TimelinePeriod`/the three `daysToTimelineData`/`buildHourlyTimelineData` builders in
`timelineData.ts`, one new badge element in `WeatherIconOverview.tsx`'s `ConditionRow`, plus CSS
for the badge.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions (provider isolation with per-source try/catch,
"never fabricate data, only show what's real," reusing the existing `TimelinePeriod`/
`ConditionRow` rendering path rather than adding a parallel one). No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/027-uv-index-alert/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md              # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
src/services/
├── smhiProvider.ts        # + getUvIndex(location, window): fetch + irradiance→UV Index conversion
└── weatherApi.ts          # + getUvRisk(location, window): SMHI-coverage gate, try/catch degrade to []

src/hooks/
└── useObservationData.ts  # + its own independent effect/fetch, mirrors the nearby-station pattern

src/components/
├── timelineData.ts         # TimelinePeriod gains `uvRisk: boolean`; each builder merges it in
└── WeatherIconOverview.tsx # ConditionRow renders a small badge when period.uvRisk is true

src/index.css               # badge styling (all three themes)
```

**Structure Decision**: Existing single-project structure — extends already-existing
provider/hook/component files with one new field and one new fetch function; no new files
beyond this feature's own `specs/` documentation.

## Complexity Tracking

*No constitution violations — section not needed.*
