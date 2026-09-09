# Implementation Plan: 27 Distinct Icons for SMHI's Weather Symbol Codes

**Branch**: `043-smhi-27-symbol-icons` | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/043-smhi-27-symbol-icons/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add a raw `smhiSymbolCode` (1-27) field to `WeatherObservation`, populated only by SMHI's own forecast path, alongside the existing collapsed `symbolCondition`. Add a new `SMHI_SYMBOL_ICONS` lookup (27 entries, one per code) backed by real icon artwork already cropped from the user's reference sheet this session. A shared icon-resolution helper checks `smhiSymbolCode` first and falls back to today's existing `deriveWeatherCondition`/`WEATHER_ICONS` logic when it's absent (every other provider, and observed/historical data). No existing logic (the low-confidence rain guard, `WeatherCondition`, `WEATHER_ICONS`) changes — this is purely additive, confined to icon selection.

## Technical Context

**Language/Version**: TypeScript 5.5 (React 18.3, Vite 5.4)

**Primary Dependencies**: None new — 27 static image assets, rendered via existing patterns (`<img>`, same as other bundled images in `src/`)

**Storage**: N/A (static assets bundled at build time)

**Testing**: Vitest (`npm test`); new unit tests for the icon lookup, extended integration tests for two previously-collapsed codes now rendering distinctly

**Target Platform**: Browser (responsive web app)

**Project Type**: Single-page web application (Vite + React)

**Performance Goals**: N/A — 27 small PNGs is negligible against the app's existing live data fetches

**Constraints**: Must not change `WeatherCondition`, `deriveWeatherCondition`, `WEATHER_ICONS`, or any non-SMHI provider (research.md §1/§2); every one of the 27 codes must resolve to a real icon, no blanks (FR-004)

**Scale/Scope**: One new field on an existing type, one new lookup module, one new shared icon-resolution helper, ~4-5 consuming components updated to use it, 27 new image assets

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no project-specific principles have been ratified), so there are no project-specific gates to evaluate. No violations to justify.

**Post-design re-check**: Unchanged — still no ratified gates.

## Project Structure

### Documentation (this feature)

```text
specs/043-smhi-27-symbol-icons/
├── plan.md                          # This file (/speckit-plan command output)
├── research.md                      # Phase 0 output (/speckit-plan command)
├── data-model.md                    # Phase 1 output (/speckit-plan command)
├── quickstart.md                    # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── smhi-symbol-icons.md         # Phase 1 output (/speckit-plan command)
└── tasks.md                         # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── assets/
│   └── weather-icons/            # 27 icon files copied in from docs/logos/smhi_symbols_ver2_icons/
├── components/
│   ├── smhiSymbolIcons.ts        # New: SMHI_SYMBOL_ICONS lookup (27 entries)
│   ├── ConditionIcon.tsx         # New: shared icon-resolution helper (research.md §5)
│   ├── weatherIcons.tsx          # Unchanged — still the fallback WEATHER_ICONS registry
│   ├── WeatherIconOverview.tsx   # ConditionRow updated to use the new helper (hourly periods)
│   ├── WeeklyForecastStrip.tsx   # Unchanged — daily periods, no smhiSymbolCode (research.md §5)
│   ├── TodaySummaryCard.tsx      # Unchanged — daily aggregate, no smhiSymbolCode (research.md §5)
│   ├── ObservationDetails.tsx    # Updated to use the new helper (its 24h table is hourly)
│   └── timelineData.ts           # TimelinePeriod gains smhiSymbolCode (hourly builder only)
├── models/
│   └── types.ts                  # WeatherObservation gains smhiSymbolCode
└── services/
    ├── smhiProvider.ts           # Populates smhiSymbolCode alongside existing symbolCondition
    └── weatherCondition.ts       # Unchanged — still the fallback classification logic

tests/
├── unit/
│   ├── smhiSymbolIcons.test.ts   # New: 27-entry coverage, resolution-order tests
│   └── timelineData.test.ts      # Extended: smhiSymbolCode carried onto hourly periods only
└── integration/
    └── weatherIconOverview.test.tsx   # Extended with a couple of distinct-code cases
```

**Structure Decision**: Single Vite/React project. Additive changes only — one new field, one new
lookup module, one new shared component, and small updates to existing consumers to call it instead
of looking up `WEATHER_ICONS` directly. No existing file's core logic (`weatherCondition.ts`,
`weatherIcons.tsx`) changes.

## Complexity Tracking

*No constitution violations to justify — table intentionally omitted.*
