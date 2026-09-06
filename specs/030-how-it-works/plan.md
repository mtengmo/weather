# Implementation Plan: "How This Works" Documentation Page

**Branch**: `030-how-it-works` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/030-how-it-works/spec.md`

## Summary

Adds a new `HowItWorks` panel component, opened via a new footer button, that mirrors
`PrivacyNotice`'s exact open/close/dialog pattern (same CSS class family, same
`role="dialog"`/close-button/focus convention). Its content is a static, plain-language
explanation of the app's three time-range views, the observed/forecast visual distinction, the
weather data sources, the UV risk badge, and the weather-warning banner — all authored directly
in the component (no fetch, no state beyond open/closed), so closing it can never disturb the
app's actual data or navigation state (FR-003).

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: None new — reuses the existing `PrivacyNotice`/`Footer` pattern exactly

**Storage**: N/A (static content, no state persisted)

**Testing**: Vitest + `@testing-library/react` — an integration test asserting the footer button
opens the panel, its content mentions every feature FR-002 requires, and closing it returns to
the prior screen/state unchanged

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: N/A — a static panel with no data fetch

**Constraints**: Must not fetch anything or touch app-level state (FR-003's "no fresh data fetch,
no navigation away") — the panel is rendered as a sibling overlay the same way `PrivacyNotice`
already is, never replacing the current view in the component tree.

**Scale/Scope**: One new component (`HowItWorks.tsx`), one small change to `Footer.tsx` (a second
button + open state, alongside the existing Privacy one), plus CSS reusing/extending the existing
`.privacy-notice` rules rather than duplicating them.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions (reuse an existing UI pattern rather than invent a new
one; static content needs no data-fetching infrastructure). No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/030-how-it-works/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md              # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
src/components/
├── HowItWorks.tsx     # NEW: static explanatory panel, mirrors PrivacyNotice.tsx
└── Footer.tsx          # + a second button/open-state, alongside the existing Privacy one

src/index.css            # + a shared/extended rule for the new panel's content layout
```

**Structure Decision**: Existing single-project structure, plus one small new component file
that follows the exact shape of an existing sibling (`PrivacyNotice.tsx`).

## Complexity Tracking

*No constitution violations — section not needed.*
