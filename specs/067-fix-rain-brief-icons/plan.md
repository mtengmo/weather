# Implementation Plan: Stop Brief Morning Rain From Marking the Whole Day, and Refresh Weather Icon Artwork

**Branch**: `067-fix-rain-brief-icons` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/067-fix-rain-brief-icons/spec.md`

## Summary

Two independent fixes bundled from one user report:

1. **US1** — `WeeklyForecastStrip.tsx`'s daily condition still shows rain for a day when rain is
   confined to a minority of that day's daytime hours (e.g. a couple of morning hours), because
   `dailyAggregation.ts`'s daytime precipitation figure is a plain *sum* over the whole 6 AM-8 PM
   window — any nonzero total, however briefly accumulated, crosses `deriveWeatherCondition`'s
   rain threshold. Fix: only let that sum drive the day's condition when rain covers a majority of
   the day's daytime hours, *or* when a single daytime hour was heavy enough to matter on its own
   (reusing the app's existing heavy-rain threshold) — otherwise treat the day's precipitation
   signal as zero for condition purposes only. Every other consumer of `DailyAggregate` (high/low
   temperature, actual rain totals, etc.) is untouched.
2. **US2** — Re-run the existing icon-splitting pipeline (`docs/weathericons/split_icons.py` +
   `sheet-manifest.json`) against the source sprite-sheet PNGs the user already replaced in place
   under `docs/weathericons/`, then copy the regenerated 124 files over
   `src/assets/weather-icons-v2/`, replacing artwork content only — no filename, path, or
   selection-logic changes.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (US1); Python 3.9 + Pillow/numpy/scipy, already
installed and used by the existing splitting script (US2) — no new dependencies for either story

**Primary Dependencies**: None new. US1 reuses `deriveWeatherCondition`'s existing
`PRECIPITATION_HEAVY_THRESHOLD_MM` (exported for reuse, mirroring how `NIGHT_START_HOUR`/
`NIGHT_END_HOUR` were exported for 066). US2 reuses `docs/weathericons/split_icons.py` unchanged.

**Storage**: N/A (US1: pure client-side derived data; US2: static asset files)

**Testing**: Vitest + React Testing Library (US1: unit tests for the new hour-count/heavy-override
aggregation fields, integration test for the Uppsala-shaped scenario); US2 is verified by file
count/coverage comparison and the existing icon-rendering test suite (no code path changes, so
existing tests function as a regression guard)

**Target Platform**: Web (existing PWA), no platform change

**Project Type**: Single-project web app (existing `src/` + `tests/` + `docs/weathericons/` layout)

**Performance Goals**: N/A — US1 is a pure client-side derived-data change; US2 is a build-time
asset regeneration, not a runtime concern

**Constraints**: US1 must not change any other consumer of `DailyAggregate`/`toDailyAggregates`
(temperature high/low, `daytimeTotalPrecipitation`'s own raw value must stay a true sum for
anything that might read it later — the "is this rain meaningful" decision is a separate derived
signal, not a mutation of the existing sum field) or any other view's rain display (hourly
timeline, 3-day/7-day sub-day periods, Today card). US2 must reproduce exactly the same 124
filenames as today — a coverage mismatch must be caught before considering the task done, not
silently shipped.

**Scale/Scope**: US1 — one new derived field set in `dailyAggregation.ts` + one consuming change
in `WeeklyForecastStrip.tsx`. US2 — a one-time regeneration of 124 static image files, no code
change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no ratified project-specific
principles) — no gates to evaluate. N/A.

## Project Structure

### Documentation (this feature)

```text
specs/067-fix-rain-brief-icons/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` — client-only app, no external interface (consistent with every prior feature).

### Source Code (repository root)

```text
src/
├── components/
│   └── WeeklyForecastStrip.tsx      # US1: condition derivation call site (modified)
├── services/
│   ├── dailyAggregation.ts          # US1: new daytime hour-count/max-hourly fields (modified)
│   └── weatherCondition.ts          # US1: export PRECIPITATION_HEAVY_THRESHOLD_MM (modified)
├── models/
│   └── types.ts                     # US1: DailyAggregate additions (modified)
└── assets/
    └── weather-icons-v2/*.png       # US2: regenerated artwork (124 files replaced, no renames)

docs/weathericons/
├── split_icons.py                   # US2: unchanged, re-run as-is
├── sheet-manifest.json              # US2: unchanged
├── 01_kvinna-frozen.png ... 19_*.png  # US2: user-replaced source sheets (already in place)
└── icons_split/                     # US2: script output, copied into src/assets/weather-icons-v2/

tests/
├── unit/
│   └── dailyAggregation.test.ts     # US1: hour-count/heavy-override assertions (existing file, extended)
└── integration/
    └── weatherIconOverview.test.tsx # US1: Uppsala-shaped scenario assertion (existing file, extended)
```

**Structure Decision**: Single existing project — US1 extends the current `src/services`/
`src/components`/`src/models` layout; US2 is a static-asset regeneration under the existing
`docs/weathericons/` → `src/assets/weather-icons-v2/` pipeline, no new directories.

## Complexity Tracking

*No constitution violations — table not needed.*
