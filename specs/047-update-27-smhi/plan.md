# Implementation Plan: Update SMHI Symbol Icons to Ver6 Artwork

**Branch**: `047-update-27-smhi` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/047-update-27-smhi/spec.md`

## Summary

Extract 27 individual, transparent-background icon PNGs from `docs/logos/symbols_logos_ver6.png` (a 5-column × 6-row grid of numbered cells, cell size 204.8×256px, 30 cells with 27 used) and overwrite the corresponding files under `src/assets/weather-icons/`. The source sheet has no real alpha channel — its "transparent" background is a low-contrast checkerboard baked in as opaque pixels (confirmed identical across four generated variants: ver3/ver4/ver5/ver6) — so extraction uses a flood-fill-from-corners technique per cell to reliably separate true background from icon content without depending on a hard color threshold. No code outside the 27 image files changes (`SMHI_SYMBOL_ICONS` in `smhiSymbolIcons.ts` already just imports each file by its existing name).

## Technical Context

**Language/Version**: Python 3 (Pillow + numpy, already installed) for one-off extraction script; TypeScript/React unchanged for the app itself

**Primary Dependencies**: Pillow, numpy (extraction script only, not shipped); no new app dependencies

**Storage**: N/A — static image assets only

**Testing**: Visual spot-check of extracted crops (as done for prior icon features) + existing Vitest suite (unchanged, since no code changes)

**Target Platform**: Web (existing PWA), extraction script run locally/one-off

**Project Type**: Single web app; this feature is an asset-only change plus a one-off local script

**Performance Goals**: N/A — static assets, same bundling as today

**Constraints**: Output crops must (a) contain no number badge/caption text, (b) have a real transparent background (alpha), (c) not visibly clip icon content, (d) keep the same 27 filenames already referenced by `smhiSymbolIcons.ts` so no import lines need to change

**Scale/Scope**: 27 image files replaced; one new one-off Python script (not part of the shipped app, mirrors `docs/logos/split_symbols*.py` precedent from 043)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file is an unfilled template — no project-specific gates apply. Proceeding.

## Project Structure

### Documentation (this feature)

```text
specs/047-update-27-smhi/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
docs/logos/
├── symbols_logos_ver6.png        # Source reference sheet (already supplied)
├── split_symbols_ver6.py         # New one-off extraction script (this feature)
└── symbols_ver6_icons/           # New: 27 extracted, transparent icon crops (source of truth)

src/assets/weather-icons/
└── 01-clear.png … 27-heavy-snowfall.png   # Overwritten in place with ver6 crops (same filenames)

src/components/smhiSymbolIcons.ts  # Unchanged — verified, not edited
```

**Structure Decision**: Same pattern as 043-smhi-27-symbol-icons: a one-off Python cropping script under `docs/logos/`, its output copied into `src/assets/weather-icons/` under the existing 27 filenames. No new app source directories.

## Complexity Tracking

*No violations — nothing to justify.*
