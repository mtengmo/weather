# Implementation Plan: Overview Default, Location Panel, and Graph Readability

**Branch**: `013-overview-default-and-layout` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-overview-default-and-layout/spec.md`

## Summary

Six independent slices through the existing app: (1) default `App.tsx`'s `view` state to
`"overview"` instead of `"graph"`; (2) replace the header's three always-visible
search/favorites/switcher sections with a single "Change location" button that opens a new
`LocationPanel` component containing all three; (3) auto-scroll the 24-hour timeline to center
the "now" column on initial render whenever it overflows; (4) add an explicit `primarySource`
field to `ObservationSeries` (set in `weatherApi.ts`, which already knows whether SMHI or
Open-Meteo supplied the observed data) and render it as a visible note on both views; (5) mirror
every single-scale chart's Y-axis on the right edge and enable point dots on every `<Line>`; (6)
compute and display the observed-only high/low temperature callout on the temperature chart.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3, Vite 5

**Primary Dependencies**: Recharts 3.10 (existing `ObservationChart.tsx`), existing
`App.tsx`/`LocationSwitcher`/`PlaceSearch`/`FavoritesList` components, existing
`WeatherIconOverview.tsx` (008-012), existing `weatherApi.ts` provider-selection logic

**Storage**: N/A beyond what already exists (favorites/location-cache localStorage, unchanged)

**Testing**: Vitest 2 + `@testing-library/react`, matching this repo's existing unit/integration split

**Target Platform**: Browser (GitHub Pages static SPA)

**Project Type**: Single-project web frontend (unchanged)

**Performance Goals**: N/A beyond existing profile — no new network calls; the centering scroll
and axis/dot changes are pure rendering, no added computation cost of consequence

**Constraints**: No new dependencies; the Location Panel must work at every viewport width (spec
FR-009), not just mobile or just desktop; must not change the underlying favorites/search/current-
location behaviors themselves, only their presentation

**Scale/Scope**: Touches `App.tsx`, `ObservationChart.tsx`, `WeatherIconOverview.tsx`,
`weatherApi.ts`, `models/types.ts`, plus one new `LocationPanel.tsx` component and its styles

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no ratified gates apply.
Proceeding per established conventions: no new dependencies, reuse existing components inside the
new panel rather than rebuilding them, and keep provider-selection logic in `weatherApi.ts` as the
single source of truth for "which source served this data" rather than re-deriving it in the UI.

## Project Structure

### Documentation (this feature)

```text
specs/013-overview-default-and-layout/
├── plan.md               # This file (/speckit-plan command output)
├── research.md           # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   ├── location-panel.md
│   └── chart-readability.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── models/
│   └── types.ts                    # + primarySource on ObservationSeries
├── services/
│   └── weatherApi.ts                # + sets primarySource in all three return paths
├── components/
│   ├── App.tsx                      # default view="overview"; header renders LocationPanel
│   │                                 #   trigger instead of inline search/favorites/switcher
│   ├── LocationPanel.tsx             # NEW — wraps LocationSwitcher/FavoritesList/PlaceSearch
│   │                                 #   behind a single "Change location" control
│   ├── ObservationChart.tsx         # + mirrored right-edge axis on single-scale charts,
│   │                                 #   dot markers on every Line, data-source note,
│   │                                 #   observed high/low note on the temperature chart
│   └── WeatherIconOverview.tsx      # + center-on-"now" initial scroll, data-source note
└── index.css                        # LocationPanel styles, data-source note styles,
                                      #   high/low note styles

tests/
├── unit/
│   └── weatherApi.test.ts           # + primarySource set correctly in all three paths
└── integration/
    ├── appHeader.test.tsx            # + LocationPanel open/select/dismiss behavior,
    │                                  #   default view is Overview
    ├── weatherIconOverview.test.tsx  # + center-on-now scroll, data-source note
    └── chartAndDetails.test.tsx      # + mirrored axis, dot markers, high/low note
```

**Structure Decision**: Single-project web frontend (unchanged from 001-012). Six narrow vertical
slices through existing files, plus one new `LocationPanel` component that composes three
already-existing components rather than rebuilding their logic.

## Complexity Tracking

*No constitution violations — table omitted.*
