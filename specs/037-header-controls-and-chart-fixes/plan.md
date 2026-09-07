# Implementation Plan: Header Controls Cleanup and Chart Bug Fixes

**Branch**: `037-header-controls-and-chart-fixes` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/037-header-controls-and-chart-fixes/spec.md`

## Summary

Six independently-shippable changes to the dashboard: (1) replace the header's "Display" dropdown with a single Dark/Light toggle button; (2) move units and the high/low toggle into a new Settings control, defaulting high/low to off and removing the "Glass" theme entirely; (3) fix a temperature degree-scale bug; (4) fix a 3-day/7-day timeline layout bug that leaves dead space under certain browser zoom levels; (5) default the Details view's "Nearby stations" control to 0; (6) color the temperature line by a fixed 11-band temperature-to-color scale instead of a single flat color.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: Recharts 3.10 (Details/graph view's `ObservationChart`), no new dependencies

**Storage**: Existing `localStorage`-backed preference services (`theme.ts`, `highLowVisibility.ts`, `nearbyStationCount.ts`, `unitPreference` equivalent)

**Testing**: Vitest + React Testing Library (`tests/integration`, `tests/unit`)

**Target Platform**: Web (Vite-built SPA)

**Project Type**: Single-project web app (`src/`)

**Performance Goals**: N/A — no new data fetching or heavy computation

**Constraints**: Must preserve every viewer's existing saved preference (theme, high/low, nearby-station count) — only *defaults for new viewers* change; must not regress existing tests

**Scale/Scope**: Header (`App.tsx`, `DisplayMenu.tsx` → replaced, `ThemePicker.tsx`, `HighLowToggle.tsx`, `UnitToggle.tsx`), theme/preference services and their default constants (`models/types.ts`, `theme.ts`), the dashboard timeline (`WeatherIconOverview.tsx` + `index.css`), and the Details/graph view (`ObservationChart.tsx`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Project constitution (`.specify/memory/constitution.md`) is an unfilled template — no concrete principles to gate against. No violations possible.

## Project Structure

### Documentation (this feature)

```text
specs/037-header-controls-and-chart-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

No `contracts/` — purely internal UI/component work, no external interface.

### Source Code (repository root)

```text
src/
├── App.tsx                              # header-actions wiring: swap DisplayMenu for ThemeToggle + SettingsMenu
├── components/
│   ├── ThemeToggle.tsx                  # NEW — single Dark/Light button (US1)
│   ├── SettingsMenu.tsx                 # NEW — replaces DisplayMenu (US2), holds UnitToggle + HighLowToggle
│   ├── DisplayMenu.tsx                  # REMOVED (US1/US2)
│   ├── ThemePicker.tsx                  # REMOVED — folded into ThemeToggle (US1/US2, drops "glass")
│   ├── UnitToggle.tsx                   # unchanged, now rendered from SettingsMenu
│   ├── HighLowToggle.tsx                # unchanged, now rendered from SettingsMenu
│   ├── NearbyStationCountControl.tsx    # unchanged (US5 only changes its default)
│   ├── WeatherIconOverview.tsx          # buildTicks/dedupeCloseTicks verification + tick-label
  │                                      #   margin tightening (US3); temperature-line gradient
  │                                      #   stroke (US6)
│   └── ObservationChart.tsx             # temperature-line gradient stroke, all views (US6)
├── models/types.ts                       # Theme = "midnight" | "ivory" (drop "glass"); new
│                                          #   DEFAULT_HIGH_LOW_VISIBLE=false, DEFAULT_NEARBY_STATION_COUNT=0
├── services/
│   ├── theme.ts                          # VALID_THEMES drops "glass"; getThemePreference falls
│   │                                      #   back to DEFAULT_THEME for a stored "glass" (US2)
│   └── temperatureColorScale.ts          # NEW — shared band table + gradient-stop builder (US6)
└── index.css                             # remove .display-menu*/[data-theme="glass"] rules (US1/US2);
                                           #   tighten temp-scale label margin (US3); timeline width
                                           #   fix (US4); temperature-gradient defs (US6)

tests/
├── integration/
│   ├── appHeader.test.tsx                # header control tests updated for US1/US2
│   └── weatherIconOverview.test.tsx      # US3/US6 tests
└── unit/
    └── temperatureColorScale.test.ts      # NEW — US6 pure-function tests
```

**Structure Decision**: Existing single-project layout. Two new small modules (`ThemeToggle.tsx`, `SettingsMenu.tsx`, `temperatureColorScale.ts`); two files removed (`DisplayMenu.tsx`, `ThemePicker.tsx`); everything else is an edit to an existing file.

## Complexity Tracking

*No constitution violations — section not applicable.*
