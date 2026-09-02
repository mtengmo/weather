# Implementation Plan: Timeline Visual Styling from Mockup

**Branch**: `010-timeline-visual-styling` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-timeline-visual-styling/spec.md`

## Summary

Restyle the existing 008 timeline's condition icons, line/bar row colors, and "now" column/marker
using a palette inspired by the reference mockup (`docs/mockup/2331ca69-...png`), entirely through
CSS custom properties and small class additions — no data, layout, or row-set changes. Each of the
three themes (Midnight, Bright/ivory, Glass) gets its own token values so the new palette stays
legible everywhere, per FR-008.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3, Vite 5

**Primary Dependencies**: `lucide-react` (existing icon set, unchanged per Assumptions), the
existing `src/index.css` theme-token system (`:root`/`[data-theme="..."]` CSS custom properties)

**Storage**: N/A

**Testing**: Vitest 2 + `@testing-library/react` for structural/class-presence assertions (jsdom
cannot assert real computed colors — see research.md §3); manual Playwright visual verification
against all three themes, matching this repo's established polish-phase pattern (008/011)

**Target Platform**: Browser (GitHub Pages static SPA)

**Project Type**: Single-project web frontend (unchanged)

**Performance Goals**: N/A — pure CSS/class changes, no new renders or computation

**Constraints**: No new dependencies; must not change `TimelineData`/`TimelineRow` shapes or which
rows render (FR-009); must remain legible on all three existing themes (FR-008)

**Scale/Scope**: Touches `WeatherIconOverview.tsx` (adds a handful of conditional class names) and
`src/index.css` (new theme-scoped color tokens + row/icon/now-column rules) — no other files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no ratified project-specific
gates apply. Proceeding per this repo's established conventions: theme-variable-driven styling
(never hardcoded colors outside the token blocks), no new dependencies, and preserving every
existing data/rendering contract untouched.

## Project Structure

### Documentation (this feature)

```text
specs/010-timeline-visual-styling/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── style-tokens.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── WeatherIconOverview.tsx   # + per-condition class on ConditionRow's icon wrapper,
│                                  #   + per-row-key class on LineRow/BarRow/WindRow containers,
│                                  #   + a "now column" class on the boundary-adjacent cell
└── index.css                     # + per-theme color tokens (condition palette, row palette,
                                   #   now-column accent) + rules consuming them

tests/
└── integration/
    └── weatherIconOverview.test.tsx  # + structural assertions: distinct classes present per
                                        #   condition/row/now-column (see research.md §3 for why
                                        #   this can't assert real computed color under jsdom)
```

**Structure Decision**: Single-project web frontend (unchanged from 001-011). This is a styling-only
slice through the existing 008 timeline component and its stylesheet — no new modules.

## Complexity Tracking

*No constitution violations — table omitted.*
