# Implementation Plan: Dashboard Visual Redesign

**Branch**: `018-dashboard-visual-redesign` | **Date**: 2026-09-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/018-dashboard-visual-redesign/spec.md`

## Summary

A cohesive visual redesign of the Overview: a consolidated header (location + current conditions
inline, a "Display" menu replacing separate Theme/Unit/High-Low buttons, a "Forecast sources"
selector replacing the on/off Combine toggle, Map/Details preserved), explicit Observed/Forecast
section labels on the timeline with a restyled "Now" marker, a sticky left-hand row-label column
so metric labels stay visible while scrolling, a new persistent "Today" summary card and 7-day
forecast strip (shown on all three tabs), and a footer that discloses data sources and freshness.

## Technical Context

**Language/Version**: TypeScript 5.5 (React 18.3, Vite 5)

**Primary Dependencies**: React 18.3 only — no new runtime dependencies. Reuses existing
`deriveWeatherCondition`, `deriveFeelsLike`, `getSunTimes`, `toDailyAggregates`,
`dataSourceNote` services unchanged.

**Storage**: N/A — no new persistence; the "Forecast sources" selector persists via the existing
`combineForecastPreference.ts` mechanism (still a boolean under the hood, see research.md §1).

**Testing**: Vitest (`tests/unit/`, `tests/integration/`)

**Target Platform**: Static web app (GitHub Pages), evergreen browsers

**Project Type**: Single-project web app (`src/`, `tests/` at repo root)

**Performance Goals**: The always-on 7-day summary fetch (for the Today card / 7-day strip while
the 24h tab is active) must not duplicate a fetch already in flight for the same window — see
research.md §4.

**Constraints**: This redesign changes layout and consolidates controls but must not change what
any existing toggle *does* — only how it's presented (spec Assumptions, FR-003/FR-004/FR-011's
"MUST preserve...existing toggle behavior").

**Scale/Scope**: Touches `src/App.tsx`, `src/components/WeatherIconOverview.tsx`,
`src/components/Footer.tsx`, `src/hooks/useObservationData.ts`, `src/services/dailyAggregation.ts`,
`src/services/format.ts`, `src/index.css`; adds `DisplayMenu.tsx`, `ForecastSourcesControl.tsx`,
`TodaySummaryCard.tsx`, `WeeklyForecastStrip.tsx`. The classic graph (`ObservationChart.tsx`) and
map (`MapView.tsx`) are unaffected — this redesign is Overview- and header-scoped.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No `.specify/memory/constitution.md` gates are defined for this project (template only) — no gates
to evaluate.

## Project Structure

### Documentation (this feature)

```text
specs/018-dashboard-visual-redesign/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── header-redesign.md       # US1
    ├── timeline-structure.md    # US2, US3
    ├── summary-cards.md         # US4, US5
    └── footer-redesign.md       # US6
```

### Source Code (repository root)

```text
src/
├── App.tsx                          # header restructure (DisplayMenu, ForecastSourcesControl,
│                                     # current-conditions summary), weeklySeries/lastUpdated
│                                     # threaded to WeatherIconOverview and Footer
├── hooks/
│   └── useObservationData.ts        # gains weeklySeries (always last-7-days) and lastUpdated
├── components/
│   ├── DisplayMenu.tsx              # NEW — consolidates ThemePicker + UnitToggle + HighLowToggle
│   ├── ForecastSourcesControl.tsx   # NEW — replaces CombineForecastToggle's two-button UI
│   ├── TodaySummaryCard.tsx         # NEW
│   ├── WeeklyForecastStrip.tsx      # NEW
│   └── WeatherIconOverview.tsx      # Observed/Forecast section labels, restyled Now marker,
│                                    # sticky row-label column, mounts the two new summary
│                                    # components, current-conditions header row removed (moved
│                                    # to App.tsx's header)
├── services/
│   ├── dailyAggregation.ts          # aggregateBucket gains a last-known windDirection field
│   └── format.ts                    # new directionToCompass helper (N/NE/E/SE/S/SW/W/NW)
└── index.css                        # header layout, section-label row, sticky label column,
                                      # summary-card/strip styling, footer styling

tests/
├── unit/
│   ├── dailyAggregation.test.ts     # windDirection aggregation
│   └── format.test.ts               # directionToCompass
└── integration/
    ├── appHeader.test.tsx           # DisplayMenu, ForecastSourcesControl, current-conditions row
    └── weatherIconOverview.test.tsx # section labels, sticky column, Today card, weekly strip
```

**Structure Decision**: Single-project web app (existing layout). No new top-level architecture —
this is a layout/composition redesign of already-existing pieces plus two new, self-contained
summary components that reuse existing daily-aggregation and condition-derivation logic.

## Complexity Tracking

*No constitution gates defined — no violations to justify.*
