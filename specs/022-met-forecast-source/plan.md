# Implementation Plan: MET Norway Forecast Source & Richer Conditions

**Branch**: `022-met-forecast-source` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-met-forecast-source/spec.md`

## Summary

Adds MET Norway's public locationforecast API as a third independent forecast source alongside
SMHI and Open-Meteo, with its own genuine "generated at" timestamp threaded through the existing
freshness disclosure; fixes the 7-day forecast strip's icons never receiving the per-condition
color treatment the main timeline already has; classifies weather conditions using each source's
own official weather-symbol code (SMHI's numeric Wsymb2 table, MET Norway's string-based symbol
codes) to distinguish three new conditions (thunderstorm, fog, sleet) beyond today's six, applied
consistently everywhere icons appear; extends the *already-partially-existing* per-source chart
line overlay (discovered during research — Temperature/24h already renders per-source dashed
lines today, just not on other tabs/windows or the Overview) to all metric tabs and both windows,
plus a new compact source-count indicator on the Overview; and widens the footer's disclosure to
name however many sources (of up to three) genuinely contributed to the current blend.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: Vite 5, Recharts 3.10, `lucide-react`, Vitest 2 + Testing Library

**Storage**: N/A (no backend)

**Testing**: Vitest + `@testing-library/react`; live dev-server + Playwright verification for the
new provider's real API shape and the CSS/icon changes, matching this session's established
practice of grounding provider integrations in a live API response rather than guessed shapes

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: One additional parallel network call per forecast fetch (MET Norway,
alongside the existing SMHI/Open-Meteo calls already fetched via `Promise.allSettled`) — no
material change to perceived load time since all three run concurrently

**Constraints**: No backend/server component, so MET Norway's requested User-Agent
self-identification cannot be set from browser `fetch()` (browsers forbid scripts from
overriding the `User-Agent` header) — mitigated per research.md §1's live-verified finding that
MET Norway's service accepts ordinary browser default User-Agent strings; must not fabricate data
for a genuine gap (FR-011); reuses the existing 6-decimal coordinate-rounding fix (from
021-dashboard-polish-round-six's follow-up) for MET Norway's request URL too, since it also
degrades gracefully rather than erroring on this class of malformed input, but rounding keeps
requests well-formed and cacheable

**Scale/Scope**: Touches `smhiProvider.ts` (symbol_code parsing), a new `metNoProvider.ts`,
`weatherApi.ts` (3-source `MultiSourceForecastEntry`), `weatherCondition.ts` (3 new conditions),
`weatherIcons.tsx` (3 new icon/label entries), `WeeklyForecastStrip.tsx` (color class),
`WeatherIconOverview.tsx` (compact source-count indicator), `ObservationChart.tsx` (per-source
lines extended to all tabs/windows), `format.ts`/`Footer.tsx` (N-source disclosure), `index.css`
(3 new `--wx-*` color variables per theme)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions (gap-vs-fabrication, unit-conversion-at-display, reusing
existing patterns, live-API-verification-before-coding). No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── components/     # WeeklyForecastStrip.tsx, WeatherIconOverview.tsx, ObservationChart.tsx,
│                   # weatherIcons.tsx, chartData.ts, timelineData.ts, Footer.tsx
├── services/       # smhiProvider.ts, metNoProvider.ts (new), weatherApi.ts, weatherCondition.ts,
│                   # format.ts
├── models/         # types.ts
└── index.css

tests/
├── unit/
└── integration/
```

**Structure Decision**: Existing single-project structure — one new file (`src/services/metNoProvider.ts`,
mirroring `openMeteoProvider.ts`'s shape), every other change is to an already-existing file.

## Complexity Tracking

*No constitution violations — section not needed.*
