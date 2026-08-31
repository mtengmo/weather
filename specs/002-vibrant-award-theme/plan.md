# Implementation Plan: Vibrant "Award-Worthy" Theme and Elevated Graph Styling

**Branch**: `002-vibrant-award-theme` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-vibrant-award-theme/spec.md`

## Summary

A visual-only refinement of the existing themed weather app (`001-weather-history-locations`): the light theme currently labeled "Ivory" is restyled into a bright, near-white, high-saturation "popping colors" palette (coral `#e01050` + lime/cyan `#00d4b5`) inspired by contemporary "dopamine design" trends in award-caliber web/dashboard design (FR-001, FR-003b — see [research.md](./research.md) §1), replacing the prior soft/muted look one-for-one — same `Theme` identifier (`"ivory"`), same persistence key, just a new CSS palette and a picker label change to "Bright" (FR-003a, §2–3). Alongside this, the 24-hour and 7-day observation graphs (`ObservationChart.tsx`) get elevated, theme-aware chrome — themed grid lines/axis text/tooltip instead of Recharts' unstyled defaults, plus a gradient-filled precipitation bar and an active-point highlight — applied under **all three themes**, not just the new one (FR-004, FR-007, §4–5). No data, aggregation, chart type, or non-visual behavior changes; existing series-distinguishing techniques (color + dash pattern, up to 6 series) are preserved and re-verified for contrast against the new bright background (FR-005, FR-006, §6).

## Technical Context

**Language/Version**: TypeScript 5.x, React 18 (unchanged from `001-weather-history-locations`)

**Primary Dependencies**: Same as `001-weather-history-locations` — Vite, React, Recharts. No new dependency: chart chrome theming and gradient fills use Recharts' existing `<defs>`/`contentStyle` capabilities plus CSS, not a new charting or design-system library (research.md §4, §5).

**Storage**: Browser `localStorage`, unchanged (same key, same three-value `Theme` union — research.md §2). No new storage.

**Testing**: Vitest + React Testing Library, consistent with `001-weather-history-locations`. New/updated assertions: theme label text ("Bright" not "Ivory"), `--accent-2` defined under all three `[data-theme]` blocks, and a documented contrast check for the new palette (research.md §6) rather than a new automated a11y-testing dependency.

**Target Platform**: Same static GitHub Pages deployment, same target browsers — no change (this feature touches no build/deploy configuration).

**Project Type**: Single-page web application (frontend-only) — unchanged.

**Performance Goals**: Theme switch still applies within 1s with no reload (SC-002, unchanged mechanism — CSS attribute toggle, research.md §2/§4). No new network calls are introduced, so SC-001/SC-003 (from `001-weather-history-locations`) are unaffected.

**Constraints**: Purely additive/visual change layered on the existing no-backend, static-hosted constraints from `001-weather-history-locations`; MUST NOT alter any FR/SC from that feature (spec Assumptions). New colors MUST meet WCAG contrast expectations (FR-005, SC-004, research.md §6).

**Scale/Scope**: One theme palette redefinition + one new CSS variable (`--accent-2`, defined for all 3 themes) + chart-chrome styling in one component (`ObservationChart.tsx`) and one stylesheet (`index.css`) + one label change (`ThemePicker.tsx`). No new components, hooks, services, or routes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no project-specific principles ratified), same as when `001-weather-history-locations` was planned. No constitution gates apply; this plan proceeds using standard best practices (simplicity, no unnecessary layers/dependencies, testability). Re-checked after Phase 1: still N/A — no violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/002-vibrant-award-theme/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── theme-css-variables.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ObservationChart.tsx     # MODIFIED: themed grid/axis/legend/tooltip styling, gradient precipitation-bar fill, activeDot (FR-004, FR-007)
│   └── ThemePicker.tsx          # MODIFIED: label "Ivory" → "Bright" (FR-003a/§3); no prop/behavior change
├── services/
│   └── theme.ts                 # UNCHANGED — identifier/persistence contract untouched (research.md §2)
├── models/
│   └── types.ts                 # UNCHANGED — Theme union and DEFAULT_THEME untouched (research.md §2)
└── index.css                    # MODIFIED: [data-theme="ivory"] palette redefined (research.md §1); --accent-2 added to all 3 theme blocks (data-model.md); new .recharts-* chrome rules per theme (research.md §4)

tests/
└── unit/
    └── theme.test.ts            # EXTENDED: assert "Bright" label, --accent-2 present for all 3 themes; contrast-ratio assertions for the new palette (research.md §6)
```

**Structure Decision**: No structural change to `001-weather-history-locations`'s layout — this feature edits three existing files (`index.css`, `ObservationChart.tsx`, `ThemePicker.tsx`) and extends one existing test file. It intentionally introduces no new component, hook, service, or model, matching its scope (visual restyling + graph chrome polish, no new capability) and keeping the existing separation of concerns (business logic in `services/`/`hooks/`, presentation in `components/`, theme tokens centralized in `index.css`) fully intact.

## Complexity Tracking

*No constitution violations to justify — table intentionally omitted.*
