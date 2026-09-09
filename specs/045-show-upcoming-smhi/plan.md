# Implementation Plan: Show Upcoming Weather Warnings

**Branch**: `045-show-upcoming-smhi` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/045-show-upcoming-smhi/spec.md`

## Summary

`getWarningsForLocation` (`src/services/weatherApi.ts`) currently drops any SMHI warning whose `approximateStart` is still in the future, so a warning published for tomorrow is invisible today. This feature widens the filter to also include warnings starting within the next 48 hours, adds an `isActive`/`validFrom`-derived flag the UI can use to tell upcoming warnings apart from active ones, and updates `WarningBanner` to group/label them accordingly ("starts in X" vs. already-active). No new data source, no backend change — purely a filter and presentation change on data the app already fetches.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18 (existing stack, unchanged)

**Primary Dependencies**: None new — reuses `smhiProvider.getActiveWarnings()`, existing `WeatherWarning` model, `WarningBanner` component, `useWarningDismissal` hook

**Storage**: N/A (no persistence changes; dismissal already persisted client-side, unchanged)

**Testing**: Vitest + Testing Library (existing `npm test`)

**Target Platform**: Web (existing PWA)

**Project Type**: Single web app (existing `src/` structure)

**Performance Goals**: No new network calls; same single warnings-feed fetch already made today

**Constraints**: Must not change behavior for locations outside SMHI coverage or on fetch failure (still empty list); must not regress existing active-warning ordering/dismissal

**Scale/Scope**: One field addition to `WeatherWarning`, one filter-window change, one banner-rendering change

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file is an unfilled template (no project-specific principles defined) — no gates apply. Proceeding.

## Project Structure

### Documentation (this feature)

```text
specs/045-show-upcoming-smhi/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── models/types.ts                  # WeatherWarning gains isActive + startsInLabel-ready field
├── services/weatherApi.ts           # getWarningsForLocation: widen filter window, tag active/upcoming
├── components/WarningBanner.tsx     # Render upcoming warnings distinctly, grouped after active ones
├── hooks/useWarningDismissal.ts     # Unchanged — dismissal already keyed by warning id
└── index.css                        # New style hook for upcoming warning state (e.g. .warning-upcoming)

tests/ (colocated *.test.tsx / *.test.ts alongside the files above, existing convention)
```

**Structure Decision**: Single existing web app — no new directories. All changes land in the existing four files above (`types.ts`, `weatherApi.ts`, `WarningBanner.tsx`, `index.css`), following the same shape as `028-severe-weather-warnings`.

## Complexity Tracking

*No violations — nothing to justify.*
