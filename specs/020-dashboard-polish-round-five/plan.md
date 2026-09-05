# Implementation Plan: Dashboard Polish Round Five

**Branch**: `020-dashboard-polish-round-five` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-dashboard-polish-round-five/spec.md`

## Summary

A further bug-fix and simplification pass: fixes a real, permanent gap in the 3-day/7-day
sub-day bucketing that silently drops every 00:00-06:00 observation; removes the
Automatic/Combined forecast-source picker entirely in favor of always-averaged forecasts and
always-SMHI-first observations; fixes a genuine CSS positioning bug (the "Now" line and 3-day
day-boundary lines have been mis-positioned, ignoring the sticky label column's width, since
018's redesign); consolidates navigation so "Back" always means "go to the Overview" everywhere,
removing three inconsistent, duplicated local page headers; trims the persistent weekly forecast
strip to 7 cards; adds condition icons to the Details page to match the Overview; simplifies
forecast-freshness display now that there's only one forecast to be fresh; and a mobile pass.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: Vite 5, Recharts 3.10, lucide-react, Leaflet 1.9.4 + react-leaflet 4.2.1, Vitest 2 + Testing Library

**Storage**: N/A (no backend; browser `localStorage` for preferences/cache only)

**Testing**: Vitest + `@testing-library/react`, plus manual Playwright verification (dev server) for CSS/layout fixes and the mobile-viewport pass, matching this session's established practice for anything jsdom can't meaningfully assert

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com), evergreen browsers, phone-sized viewports specifically for User Story 8

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: No regression to existing fetch/render behavior; `getMultiSourceForecast` becomes an always-on fetch rather than conditional, matching what `getObservations`'s own `last-7-days` weekly fetch already does unconditionally

**Constraints**: No backend/server component; must not fabricate data for a genuine gap (existing gap-vs-fabrication convention, FR-012)

**Scale/Scope**: Removes one control (Forecast sources) and two components (`ForecastSourcesControl`, the `combineForecastSources` preference hook/service); consolidates three separate page-local navigation headers into the existing App-level persistent header; touches the sub-day bucketing service, the timeline's absolute-positioned overlay CSS, the Details table, and the weekly forecast strip

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions, which this plan follows: gap-vs-fabrication, unit
conversion at display, and reusing existing patterns (the Map view's already-shipped "Back →
previous view" mechanism is extended to graph/details rather than inventing a new one). No
violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/020-dashboard-polish-round-five/
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
├── components/     # WeatherIconOverview.tsx, ObservationChart.tsx, ObservationDetails.tsx,
│                    # DisplayMenu.tsx, WeeklyForecastStrip.tsx, timelineData.ts, weatherIcons.tsx
│                    # ForecastSourcesControl.tsx — removed
├── services/        # weatherApi.ts, dailyAggregation.ts, format.ts
│                    # combineForecastSourcesPreference.ts — removed
├── hooks/           # useObservationData.ts
│                    # useCombineForecastSourcesPreference.ts — removed
└── App.tsx

tests/
├── unit/
└── integration/
```

**Structure Decision**: Existing single-project structure — no new top-level directories; two
existing files are deleted as dead code once the Forecast-sources control is removed.

## Complexity Tracking

*No constitution violations — section not needed.*
