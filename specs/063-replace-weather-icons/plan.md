# Implementation Plan: Replace Weather Icons With Character Artwork

**Branch**: `063-replace-weather-icons` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/063-replace-weather-icons/spec.md`

## Summary

Split the 19 user-supplied sprite sheets (`docs/weathericons/*.png`) into the 124 individual
character-artwork icons per `sheet-manifest.json`, bundle them as app assets, and swap them in for
every existing icon placement. The app already has two different "current icon" systems to
replace: the richer per-SMHI-code PNG set (`smhiSymbolIcons.ts`, used by the hourly timeline and
the Details table) and a simpler generic lucide-icon set (`weatherIcons.tsx`'s `WEATHER_ICONS`,
used by the Today card and the 7-day forecast strip). Both get the same new artwork; the resolution
logic is unified in `smhiSymbolIcons.ts` since it already has the richer SMHI-code-aware machinery
the new system also needs (a temperature band, in addition to a code).

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (app code); Python 3 + Pillow/NumPy/SciPy (one-off
sheet-splitting script, already authored by the user at `docs/weathericons/split_icons.py` per
`docs/weathericons/splitting-guide.md` — not an app runtime dependency)

**Primary Dependencies**: React, Vite — no new runtime dependency

**Storage**: N/A — static bundled image assets, same as every existing weather-icon PNG

**Testing**: Vitest + `@testing-library/react` (existing setup)

**Target Platform**: Web (existing PWA)

**Project Type**: Single-page web app (existing `src/` structure)

**Performance Goals**: No additional network request (SC-003) — assets ship in the existing build
bundle, same loading strategy as every existing icon import

**Constraints**: Must not change what condition/temperature data drives icon selection (FR-007) —
only the artwork changes; existing text labels are reused unchanged (see research.md §5)

**Scale/Scope**: 124 new static image assets; one core resolver module (`smhiSymbolIcons.ts`)
substantially rewritten; four consuming components touched
(`WeatherIconOverview.tsx`, `ObservationDetails.tsx`, `TodaySummaryCard.tsx`,
`WeeklyForecastStrip.tsx`); one shared type (`TimelinePeriod`) gains a field; a one-off Python
script run once to produce the assets

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no gates apply. PASS.

## Project Structure

### Documentation (this feature)

```text
specs/063-replace-weather-icons/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not created by /speckit-plan)
```

No `contracts/` directory — internal-only change, no new external interface.

### Source Code (repository root)

```text
docs/weathericons/
├── sheet-manifest.json          # existing — adjusted to match the 19 sheets' ACTUAL filenames
├── split_icons.py               # existing — run as-is
└── icons_split/                 # script output (124 PNGs), copied into src/assets/ once verified

src/assets/weather-icons-v2/     # NEW: 124 PNGs (12 weather types × 6 bands × day/night, minus
                                  # the 20 combinations the fallback rule covers instead)

src/components/
├── smhiSymbolIcons.ts           # MODIFIED: new WeatherType/IconTempBand resolution, replacing
                                  # the old per-code SMHI_SYMBOL_ICONS/NIGHT_VARIANT_ICONS tables;
                                  # resolveConditionIconFromCondition gains a temperature parameter
├── TodaySummaryCard.tsx         # MODIFIED: now calls resolveConditionIconFromCondition instead
                                  # of indexing WEATHER_ICONS directly
├── WeeklyForecastStrip.tsx      # MODIFIED: same change as TodaySummaryCard
├── WeatherIconOverview.tsx      # MODIFIED: passes period.temperature to the existing call
├── ObservationDetails.tsx       # MODIFIED: no signature change (temperature already passed in
                                  # its input object) — just benefits from the resolver's new logic
└── timelineData.ts              # MODIFIED: TimelinePeriod gains a `temperature` field, populated
                                  # in both buildHourlyTimelineData and daysToTimelineData

tests/unit/
└── smhiSymbolIcons.test.ts      # MODIFIED: substantial rewrite — old tests assert per-code image
                                  # identity and the old 4-code-only night-variant rule, both gone

tests/integration/
├── weatherIconOverview.test.tsx # MODIFIED: new-artwork assertions for the timeline, Today card,
                                  # and 7-day strip describe blocks
└── chartAndDetails.test.tsx     # MODIFIED (if needed): Details table icon assertions
```

**Structure Decision**: Extends the existing `smhiSymbolIcons.ts` module rather than creating a
parallel one — it already owns exactly the concern this feature changes (resolving a
code/condition/day-or-night combination to a piece of artwork); adding temperature to that same
resolution is additive to its existing responsibility, not a new one.

## Complexity Tracking

*No constitution violations — section not applicable.*
