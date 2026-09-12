# Implementation Plan: Daytime-Weighted Daily Forecast & Manual Language Setting

**Branch**: `066-daily-forecast-language-setting` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/066-daily-forecast-language-setting/spec.md`

## Summary

Two independent fixes bundled from one user request:

1. **US1** — The 7-day forecast strip's per-day condition/icon is currently derived from the
   whole rolling 24-hour bucket's aggregated precipitation/chance-of-rain, so a single
   early-morning shower can make an otherwise-dry day show as "rain." Fix: derive the
   condition-driving values (precipitation, chance of rain, wind, cloud cover, temperature) from
   only that bucket's daytime hours (6 AM–8 PM local clock, the same boundary `isNight` already
   uses elsewhere), falling back to the existing whole-bucket values when a bucket has no daytime
   observations at all.
2. **US2** — Add a language setting (Automatic / English / Svenska) to the existing Settings menu,
   backed by a new localStorage-persisted preference, wired to `i18next.changeLanguage()` so the
   whole app's translated text updates instantly with no reload — building directly on
   064-swedish-translation's i18n infrastructure.

## Technical Context

**Language/Version**: TypeScript 5 / React 18, existing Vite app (no version change)

**Primary Dependencies**: `i18next` + `react-i18next` (already added in 064-swedish-translation) — no new dependencies for either story

**Storage**: Browser `localStorage` only (no backend), matching the existing theme/unit/high-low preference pattern (`src/services/theme.ts`, `src/services/units.ts`)

**Testing**: Vitest + React Testing Library (existing project convention — unit tests for the new aggregation/service logic, integration tests for the rendered UI)

**Target Platform**: Web (existing PWA), no platform change

**Project Type**: Single-project web app (existing `src/` + `tests/` layout)

**Performance Goals**: N/A — both changes are pure client-side rendering logic, no measurable performance target beyond "no regression"

**Constraints**: US1 must not alter any other consumer of `toDailyAggregates`/`DailyAggregate` (used by `ObservationChart.tsx`, `ObservationDetails.tsx`, `WeatherIconOverview.tsx`, `chartData.ts`) — the new daytime-filtered fields must be additive, not replace the existing whole-day fields those other views rely on for high/low and other non-condition displays

**Scale/Scope**: Two small, independent slices — a new aggregation helper + one component's condition-derivation call site (US1); one new preference service + hook + UI control + i18n wiring (US2)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no ratified project-specific
principles) — no gates to evaluate. N/A.

## Project Structure

### Documentation (this feature)

```text
specs/066-daily-forecast-language-setting/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` — this is a client-only app with no external interface to document (consistent
with every prior feature in this repo, e.g. 064-swedish-translation, 065-larger-weather-icons).

### Source Code (repository root)

```text
src/
├── components/
│   ├── WeeklyForecastStrip.tsx      # US1: condition derivation call site (modified)
│   ├── SettingsMenu.tsx             # US2: renders the new language control (modified)
│   └── LanguageToggle.tsx           # US2: new — Automatic/English/Svenska control
├── services/
│   ├── dailyAggregation.ts          # US1: new daytime-filtered aggregation (modified)
│   └── language.ts                  # US2: new — localStorage get/set, mirrors theme.ts
├── hooks/
│   └── useLanguagePreference.ts     # US2: new — mirrors useThemePreference.ts
├── models/
│   └── types.ts                     # US1 + US2: DailyAggregate additions, LanguagePreference type
├── i18n/
│   ├── en.ts / sv.ts                # US2: new settingsMenu/languageToggle keys
│   └── index.ts                     # US2: exports detectLanguage (already exported) for the hook's "Automatic" mode
└── App.tsx                          # US2: wires the new hook/component into Settings

tests/
├── unit/
│   ├── dailyAggregation.test.ts     # US1: daytime-filtering assertions (existing file, extended)
│   └── language.test.ts             # US2: new — localStorage persistence
└── integration/
    ├── weatherIconOverview.test.tsx # US1: WeeklyForecastStrip is rendered inside this suite today
    └── languageSetting.test.tsx     # US2: new — Settings menu language switch end-to-end
```

**Structure Decision**: Single existing project — both stories extend the current `src/components`,
`src/services`, `src/hooks`, `src/models`, `src/i18n` layout with no new top-level directories.

## Complexity Tracking

*No constitution violations — table not needed.*
