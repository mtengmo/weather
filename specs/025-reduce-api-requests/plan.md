# Implementation Plan: Reduce API Requests & Hide 0% Rain Chance

**Branch**: `025-reduce-api-requests` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-reduce-api-requests/spec.md`

## Summary

Cuts the Overview's initial request volume (measured live at 57 weather-data requests against
both the dev server and a production preview build, ruling out React StrictMode as the cause) two
ways: (1) defers nearby-station comparison data — confirmed via code review to be fetched
unconditionally by `useObservationData` regardless of which view is active, yet only ever
rendered by the Details/graph view — until that view is opened at least once in the session; (2)
eliminates a confirmed redundant fetch where `getMultiSourceForecast`'s SMHI branch calls the
*entire* 6-parameter observation pipeline (`smhiProvider.getObservations`) solely to discard
everything except the forecast portion, by adding a forecast-only SMHI path mirroring the
existing `openMeteoProvider.getForecastOnly`/`metNoProvider.getForecastOnly` shape. Also hides a
genuine-0% chance-of-rain percentage on the Rain row.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: Vite 5, Vitest 2 + Testing Library

**Storage**: N/A (no backend)

**Testing**: Vitest + `@testing-library/react`; live Playwright request-count verification against
both `npm run dev` and a production `npm run build && npm run preview` (to rule out dev-only
artifacts like React StrictMode's effect double-invocation before attributing a request count to
a real production issue — confirmed both environments show the same 57-request count, so the
finding is genuine, not a dev-tooling artifact)

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: Reduce the Overview's initial weather-data request count by at least 50%
(SC-001); eliminate confirmed duplicate identical requests (SC-003)

**Constraints**: Must not change what the Overview or Details/graph view actually display (FR-007)
— only *when* nearby-station data is fetched, and whether a genuine-zero rain percentage prints,
change; must not fabricate data

**Scale/Scope**: Touches `useObservationData.ts` (splits nearby-station fetching into its own
lazily-triggered effect), `App.tsx` (tracks whether Details/graph has been opened), a new
`smhiProvider.getForecastOnly` function (mirroring the existing Open-Meteo/MET Norway shape),
`weatherApi.ts`'s `getMultiSourceForecast` (uses the new function instead of the full pipeline),
and `WeatherIconOverview.tsx`'s Rain row (hide 0%)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions (gap-vs-fabrication, reusing existing provider-shape
patterns, live-verification-before-attributing-a-root-cause). No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/025-reduce-api-requests/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md              # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
src/
├── hooks/useObservationData.ts
├── App.tsx
├── services/smhiProvider.ts, weatherApi.ts
└── components/WeatherIconOverview.tsx
```

**Structure Decision**: Existing single-project structure — no new files; every change is to an
already-existing file.

## Complexity Tracking

*No constitution violations — section not needed.*
