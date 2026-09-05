# Implementation Plan: Dashboard Polish Round Four

**Branch**: `019-dashboard-polish-round-four` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/019-dashboard-polish-round-four/spec.md`

## Summary

A bug-fix and refinement pass on the just-shipped 018 dashboard redesign: restore the location
name to the persistent header, give the map view a way back, fix dropdown legibility in the
"glass" theme, fix the rain bar's baseline/scaling for forecast periods, restore wind-direction
arrows on the 3-day/7-day views, label paired high/low temperatures, cap the 7-day timeline to
exactly 7 dated columns, and make "Automatic"/"Combined" forecast-source behavior match user
expectations (SMHI-preferred, single averaged reading when combined, source freshness shown).

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: Vite 5, Recharts 3.10, lucide-react, Leaflet 1.9.4 + react-leaflet 4.2.1, Vitest 2 + Testing Library

**Storage**: N/A (no backend; browser `localStorage` for preferences/cache only)

**Testing**: Vitest + `@testing-library/react`, plus manual Playwright verification for CSS/visual fixes jsdom can't assert (theme legibility, bar alignment)

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com), evergreen browsers (desktop + mobile)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: No regression to existing fetch/render behavior; no new network calls beyond what SMHI's forecast endpoint already returns (its freshness timestamp is already present in the response payload)

**Constraints**: No backend/server component (GitHub Pages static hosting); must not fabricate data for a genuine gap (existing gap-vs-fabrication convention, FR-013)

**Scale/Scope**: 8 targeted fixes/refinements across the header, map, two dropdowns, and the Overview timeline/summary components; no new screens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template (no project-specific principles defined) — no gates apply beyond this repo's own established conventions, which this plan follows: gap-vs-fabrication (never invent a value for missing data), unit-conversion-at-display (not derivation), and the existing localStorage-preference pattern. No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/019-dashboard-polish-round-four/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── components/     # WeatherIconOverview.tsx, MapView.tsx, DisplayMenu.tsx,
│                    # ForecastSourcesControl.tsx, TodaySummaryCard.tsx, timelineData.ts, weatherIcons.tsx
├── services/        # weatherApi.ts, smhiProvider.ts, openMeteoProvider.ts, dailyAggregation.ts, format.ts
├── hooks/           # useObservationData.ts
├── models/          # types.ts
└── App.tsx

tests/
├── unit/
└── integration/
```

**Structure Decision**: Existing single-project structure (React SPA, no backend) — this feature
only touches files already present under `src/` and adds no new top-level directories.

## Complexity Tracking

*No constitution violations — section not needed.*
