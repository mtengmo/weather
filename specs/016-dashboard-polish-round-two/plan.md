# Implementation Plan: Dashboard Polish Round Two

**Branch**: `016-dashboard-polish-round-two` | **Date**: 2026-09-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/016-dashboard-polish-round-two/spec.md`

## Summary

Ten items bundled into one round: a 3-day-view bug investigation, extending "Combine forecast
sources" to the Overview, a day-boundary marker on the 3-day/7-day timelines, clearer window/detail
button labels and placement, a header consistency guarantee, PWA installability, a version+privacy
footer, Google Analytics, and a minimal favorites/recents map screen. Live investigation during
planning (dev server + Playwright, multiple locations, multiple toggle sequences) found **no
reproduction** of the reported "3-day view only shows one day" bug on the current, already-deployed
code — every path tested returned the correct 15 (or fewer, when genuinely limited by forecast
reach) columns. That story is treated as a regression-guard (more test coverage, no behavior
change) rather than a fresh fix, mirroring how 015 handled the High/Low false alarm.

## Technical Context

**Language/Version**: TypeScript 5.5 (React 18.3, Vite 5)

**Primary Dependencies**: React 18.3, Recharts 3.10 (classic graph, unaffected), Vitest 2 +
`@testing-library/react`. New: `vite-plugin-pwa` (installability/service worker/manifest),
`leaflet` + `react-leaflet` (client-only map, no API key/backend required — OpenStreetMap tiles).

**Storage**: N/A beyond existing `localStorage` usage (favorites, cached location, preferences) —
the map screen reads the same favorites/cached-location data already persisted, no new storage.

**Testing**: Vitest (`tests/unit/`, `tests/integration/`)

**Target Platform**: Static web app (GitHub Pages), evergreen browsers + PWA-capable mobile browsers

**Project Type**: Single-project web app (`src/`, `tests/` at repo root)

**Performance Goals**: No new network fetches for US1-US6 (all reuse existing fetched data); the
map (US10) makes zero weather-data fetches of its own — it only reads favorites/cache and renders
pins, weather itself is fetched only after a pin is selected (existing Overview flow).

**Constraints**: PWA service worker must not interfere with the app's existing live-forecast
fetches — only the app shell (HTML/CSS/JS) is cached for offline use, never weather API responses
(stale forecast data would be actively misleading). Map tiles come from a free, no-API-key,
no-billing source (OpenStreetMap) to keep the app backend-free and cost-free, per the user's own
"is that possible without backend?" framing.

**Scale/Scope**: Touches `src/App.tsx`, `src/components/WeatherIconOverview.tsx`,
`src/components/ObservationChart.tsx` (multi-source colors only, no new logic), new
`src/components/Footer.tsx`, `src/components/PrivacyNotice.tsx`, `src/components/MapView.tsx`,
`index.html`, `vite.config.ts`, `package.json`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No `.specify/memory/constitution.md` gates are defined for this project (template only) — no gates
to evaluate.

## Project Structure

### Documentation (this feature)

```text
specs/016-dashboard-polish-round-two/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── overview-fixes.md          # US1 (regression guard), US3 (day marker), US4 (button labels),
    │                                # US5 (Details button + placement), US6 (header consistency)
    ├── multi-source-overview.md   # US2
    ├── pwa.md                     # US7
    ├── footer-analytics.md        # US8, US9
    └── map.md                     # US10
```

### Source Code (repository root)

```text
src/
├── App.tsx                       # header layout (Details button, justify-content), new "map"
│                                  # View state, Footer mount, multiSourceForecast passed to Overview
├── components/
│   ├── WeatherIconOverview.tsx   # day-boundary markers, button label text, multi-source temperature
│   │                              # rendering, "Details" button removed from its own inner header
│   ├── ObservationChart.tsx      # unchanged logic — only shares seriesColor/seriesDash already used
│   ├── timelineData.ts           # TimelineRow/TimelineRowPoint gain optional per-source fields
│   ├── Footer.tsx                # NEW — version + privacy link
│   ├── PrivacyNotice.tsx         # NEW — the privacy notice content, opened from the footer
│   └── MapView.tsx               # NEW — Leaflet map of favorites/recent locations
├── services/
│   └── appVersion.ts             # NEW — reads the build-time-injected version string
index.html                        # GTM/gtag snippet, PWA manifest link, theme-color meta
vite.config.ts                    # vite-plugin-pwa registration, __APP_VERSION__ define (package.json
                                   # version + short git hash, computed at build time)
package.json                      # vite-plugin-pwa, leaflet, react-leaflet dependencies

tests/
├── unit/
│   ├── appVersion.test.ts        # NEW
│   └── timelineData.test.ts      # multi-source temperature row population
└── integration/
    ├── weatherIconOverview.test.tsx  # day markers, button labels, Details button, multi-source
    ├── footer.test.tsx           # NEW
    └── mapView.test.tsx          # NEW
```

**Structure Decision**: Single-project web app (existing layout). Three genuinely new subsystems
(PWA tooling, a map screen, a footer) are added alongside targeted edits to the two existing
Overview-related files; the classic graph (`ObservationChart.tsx`) is touched only for shared color
helpers, never its own rendering logic.

## Complexity Tracking

*No constitution gates defined — no violations to justify. Two new runtime dependencies
(`vite-plugin-pwa`, `leaflet`+`react-leaflet`) are added; both are directly required by explicitly
requested capabilities (US7, US10) with no lighter-weight alternative that meets the "no backend"
constraint (see research.md §7, §10 for alternatives considered).*
