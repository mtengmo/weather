# Implementation Plan: Cartoon Weather Companion

**Branch**: `061-cartoon-weather-companion` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/061-cartoon-weather-companion/spec.md`

## Summary

Show a small cartoon character next to the "Today" hero weather icon, dressed to match current
conditions (5 precipitation categories × 5 temperature bands = 25 pre-drawn outfits). The user has
already supplied the finished character artwork as one 1536×1024 sprite sheet
(`docs/weathericons/b883b079-47e5-41c1-99b5-1dce1b1449e7.png`, already true-alpha transparent —
generated per the improved prompt in `docs/weathericons/vaderikoner-dalle-addendum.md`). The work
is: (1) a one-off script to crop that sheet into 25 individual PNG assets, (2) a small mapping
module (mirroring the existing `smhiSymbolIcons.ts` pattern) that picks the right asset from a
condition + temperature, and (3) rendering it beside the icon in `TodaySummaryCard`.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (app code); Python 3 + Pillow/NumPy (one-off asset
cropping script, matching the existing `docs/logos/split_symbols*.py` precedent — not an app
runtime dependency)

**Primary Dependencies**: React, Vite, `lucide-react` (existing icon set) — no new runtime
dependency needed

**Storage**: N/A — static bundled image assets, same as the existing 31 SMHI weather-icon PNGs

**Testing**: Vitest + `@testing-library/react` (existing unit/integration test setup)

**Target Platform**: Web (existing PWA)

**Project Type**: Single-page web app (existing `src/` structure)

**Performance Goals**: No additional network request (FR-007) — asset ships in the existing build
bundle, same loading strategy as `smhiSymbolIcons.ts`'s imports

**Constraints**: Must not obscure existing `TodaySummaryCard` text (FR-006); must degrade to
"no character" rather than a broken image for unclassifiable conditions (FR-005)

**Scale/Scope**: 25 static image assets (5 precipitation categories × 5 temperature bands); one
new small mapping module; one small rendering change in one existing component

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no project-specific principles
defined) — no gates apply. PASS (nothing to check against).

## Project Structure

### Documentation (this feature)

```text
specs/061-cartoon-weather-companion/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — this feature has no external interface (no new API, no new props
contract beyond a small internal TS module); skipped per the phase 1 instructions.

### Source Code (repository root)

```text
docs/weathericons/
├── b883b079-47e5-41c1-99b5-1dce1b1449e7.png   # user-supplied source sheet (already in repo)
└── split_character_sheet.py                    # NEW: one-off crop script (dev tool, not shipped)

src/assets/weather-characters/                  # NEW directory, 25 PNGs
├── character_dry_frozen.png
├── character_dry_cold.png
├── ... (25 total: {dry,rain,thunder,sleet,snow} × {frozen,cold,mild,warm,hot})
└── character_snow_hot.png

src/components/
├── weatherCharacterIcons.ts   # NEW: mapping module (mirrors smhiSymbolIcons.ts's pattern)
└── TodaySummaryCard.tsx        # MODIFIED: renders the character beside today-summary-icon

tests/unit/
└── weatherCharacterIcons.test.ts   # NEW: precip/temp-band → asset resolution tests

tests/integration/
└── weatherIconOverview.test.tsx    # MODIFIED (or TodaySummaryCard's own integration test):
                                     # character renders/omits per FR-002–FR-005
```

**Structure Decision**: Follows the existing `smhiSymbolIcons.ts` precedent exactly — a small
resolver module colocated in `src/components/`, image assets imported as ES modules (Vite inlines
the `import` paths into hashed build assets, matching every existing weather-icon PNG), and the
one-off Python cropping script lives beside its source sheet in `docs/weathericons/`, mirroring
where `docs/logos/split_symbols*.py` already lives beside the SMHI reference sheets — not part of
the shipped app or its dependency list.

## Complexity Tracking

*No constitution violations — section not applicable.*
