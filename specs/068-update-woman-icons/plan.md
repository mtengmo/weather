# Implementation Plan: Refresh the Woman Character's Icon Artwork (Sheets 1-6)

**Branch**: `068-update-woman-icons` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/068-update-woman-icons/spec.md`

## Summary

Re-run the established icon-splitting + size-optimization pipeline (063-replace-weather-icons,
067-fix-rain-brief-icons) against source sheets 1-6 only (`docs/weathericons/01_kvinna-frozen.png`
through `06_kvinna-hot.png`), which the user has already replaced in place, then copy the
resulting 36 files over their existing counterparts in `src/assets/weather-icons-v2/` and shrink
them to match the rest of the already-optimized icon set. No code changes — a pure asset refresh
scoped to a subset of the existing icon set.

## Technical Context

**Language/Version**: Python 3.9/3.13 (either works — `split_icons.py` was patched for 3.9
compatibility in 067) + Pillow/numpy/scipy, already installed; no application code changes

**Primary Dependencies**: None new — reuses `docs/weathericons/split_icons.py` and
`docs/weathericons/resize_icons.py` unchanged

**Storage**: N/A (static asset files)

**Testing**: The existing test suite (`npm test`) is the regression guard — a missing or
mismatched icon file would surface via `import.meta.glob`-driven lookups failing; no new tests
needed since no code path changes

**Target Platform**: Web (existing PWA), no platform change

**Project Type**: Single-project web app; this feature only touches `docs/weathericons/` (source)
and `src/assets/weather-icons-v2/` (output)

**Performance Goals**: N/A — build-time asset regeneration only

**Constraints**: Must touch only the 36 files corresponding to sheets 1-6
(clear/nearly-clear/variable/cloudy/overcast/fog × 6 bands × day/night) — every other icon file
(sheets 7-19) must remain byte-for-byte unchanged (FR-003/SC-002). Must apply the same
size-optimization step 067 established, or risk reintroducing the ~33MB-vs-~1MB bloat already
fixed once.

**Scale/Scope**: One-time regeneration of 36 static image files, no code change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no gates to evaluate. N/A.

## Project Structure

### Documentation (this feature)

```text
specs/068-update-woman-icons/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — no new entities)
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
docs/weathericons/
├── 01_kvinna-frozen.png ... 06_kvinna-hot.png   # user-replaced source sheets (already in place)
├── split_icons.py                                # unchanged, re-run as-is
├── resize_icons.py                                # unchanged, re-run as-is
└── icons_split/                                   # script output (not committed — scratch dir)

src/assets/weather-icons-v2/
└── weather_{clear|nearly-clear|variable|cloudy|overcast|fog}_{day|night}_{band}.png  # 36 files replaced
```

**Structure Decision**: No new directories — reuses the exact pipeline and layout 067 established.

## Complexity Tracking

*No constitution violations — table not needed.*
