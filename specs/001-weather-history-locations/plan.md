# Implementation Plan: Weather Observation History for Current Position and Favorite Places

**Branch**: `001-weather-history-locations` | **Date**: 2026-08-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-weather-history-locations/spec.md`

## Summary

A client-only single-page web app that shows observed (historical) weather — last 24 hours (hourly) and last 7 days (one aggregated daily high/low/average temperature + total precipitation point per day, FR-014) — for the user's current geolocation and for up to 10 saved favorite places, presented as graphs (FR-017, FR-018) with a "View details" control opening a tabular details view (FR-019). No backend/auth is required: geolocation comes from the browser, favorites persist in the browser via `localStorage`, and the whole app is deployed as a static site on **GitHub Pages**. Historical weather comes from **SMHI's open-data observations API** for locations it covers (Sweden), with **Open-Meteo** as an automatic fallback everywhere else, so favorites/current-location worldwide (FR-004) keep working outside Sweden (2026-08-30 tech-stack decision — see [research.md](./research.md) §1, §1b, §9). For SMHI-covered locations, both graphs also show comparison series for the 5 nearest observation stations (FR-020, User Story 4); this is omitted elsewhere (FR-021). Temperature/precipitation units default from browser locale with a manual metric/imperial toggle (FR-015), and a favorite that can no longer be resolved stays in the list with an inline per-place error instead of being removed (FR-016). The app offers 3 user-selectable, persisted visual themes — Midnight (dark), Ivory (light), Glass (glassmorphism) — applied consistently across every screen (FR-023–FR-025, User Story 5, 2026-08-31 tech-stack decision — see [research.md](./research.md) §14, §15).

## Technical Context

**Language/Version**: TypeScript 5.x, React 18

**Primary Dependencies**: Vite (build/dev server), React, **Recharts** (charting for FR-017/FR-018/FR-020, see [research.md](./research.md) §10), a lightweight fetch wrapper (native `fetch`, no heavy HTTP client needed). No router: the details view (FR-019) is a client-side UI-state toggle, not a route (§11), so `react-router-dom` — listed in the original Technical Context, then dropped as unused — stays dropped.

**Storage**: Browser `localStorage` for the favorites list, unit preference, and theme preference (no server-side persistence; no accounts)

**Testing**: Vitest + React Testing Library (component/unit), Playwright (optional end-to-end smoke test for the quickstart flow)

**Target Platform**: Modern evergreen browsers (Chrome, Edge, Firefox, Safari), responsive layout for desktop and mobile viewports; deployed as a static site on **GitHub Pages** (see [research.md](./research.md) §9)

**Project Type**: Single-page web application (frontend-only, no backend service, statically hosted)

**Performance Goals**: Initial current-location observation view rendered within 5s of location grant (SC-001); location switch reflects new data within 3s for 95% of switches (SC-003) — the SMHI-vs-Open-Meteo provider selection (§1b) plus, for SMHI locations, up to 5 parallel nearby-station fetches (§13) must all stay within this budget, which is why the SMHI station list is cached in memory rather than re-fetched per switch and nearby-station fetches run concurrently via `Promise.all`; details-page access from a graph is a single interaction with no new network request (SC-006, §11 — reuses already-fetched data); theme switching applies within 1s with no reload (SC-008, §14 — a synchronous CSS attribute toggle, no network or re-fetch involved)

**Constraints**: No backend/server component; must work with only browser Geolocation API + public weather APIs called directly from the browser (SMHI + Open-Meteo, both CORS-permissive, no server-side proxy); no user accounts — favorites are local to the browser/device; offline use is out of scope (per spec Assumptions); must build/deploy cleanly to GitHub Pages (correct `base` path, no server-only features, no client-side routing that breaks on a hard refresh — §11)

**Scale/Scope**: Single user per browser profile, up to 10 saved favorite places (FR-009); 2 observation windows per location — 24h at hourly resolution (24 points) and 7d as 7 daily-aggregate points (FR-014); for SMHI-covered locations, up to 6 series per graph (the selected location + up to 5 nearby stations, FR-020)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no project-specific principles have been ratified yet). No constitution gates apply to this feature; this plan proceeds using standard best practices (simplicity, testability, no unnecessary layers) in lieu of ratified principles. Re-checked after Phase 1: still N/A — no violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-weather-history-locations/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
└── tasks.md               # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ObservationChart.tsx     # Recharts-based graph: hourly (24h) or daily-aggregate (7d) series, plus up to 5 nearby-station series (FR-017, FR-018, FR-020)
│   ├── ObservationDetails.tsx   # Tabular details view for the current location+window+series (FR-019), replaces the old ObservationView table
│   ├── LocationSwitcher.tsx     # Switch between current position and favorites
│   ├── FavoritesList.tsx        # List saved places, add/remove; shows inline error for unresolvable places (FR-016)
│   ├── PlaceSearch.tsx          # Search/resolve a place to add as a favorite
│   ├── UnitToggle.tsx           # Manual metric/imperial switch (FR-015)
│   └── ThemePicker.tsx          # Selects among Midnight/Ivory/Glass (FR-023)
├── hooks/
│   ├── useGeolocation.ts        # Wraps browser Geolocation API
│   ├── useFavorites.ts          # Reads/writes favorites in localStorage
│   ├── useUnitPreference.ts     # Resolves locale-implied default unit system + manual override
│   └── useThemePreference.ts    # Resolves persisted theme (default "midnight") + manual override, sets data-theme on <html> (FR-025)
├── services/
│   ├── weatherApi.ts            # Orchestrates getObservations() + getNearbyStationSeries(): picks SMHI or Open-Meteo per location (§1b), always returns the shared WeatherObservation shape
│   ├── smhiProvider.ts          # SMHI metobs station lookup + hourly temperature/precipitation fetch, gap-filling missing hours; also exposes the 5-nearest-stations lookup (§13)
│   ├── openMeteoProvider.ts     # Existing Open-Meteo hourly fetch, used directly outside SMHI coverage and as SMHI's failure fallback
│   ├── geocodingApi.ts          # Resolves place search text to coordinates + display name
│   ├── favoritesStorage.ts      # localStorage persistence for favorite places
│   ├── units.ts                 # Locale → default unit system, and metric↔imperial conversion
│   ├── theme.ts                 # getThemePreference/setThemePreference (localStorage), applyTheme (sets data-theme) (§14)
│   └── dailyAggregation.ts      # Buckets hourly WeatherObservation[] into 7 rolling-24h daily points (FR-014, FR-018, §12)
├── models/
│   └── types.ts                 # Location, FavoritePlace, WeatherObservation, DailyAggregate, ObservationWindow, ObservationSeries, NearbyStationSeries, UnitSystem, Theme
├── App.tsx
└── main.tsx

tests/
├── unit/
│   ├── favoritesStorage.test.ts
│   ├── weatherApi.test.ts        # Provider-selection logic (SMHI vs Open-Meteo vs fallback-on-failure) + nearby-station orchestration
│   ├── smhiProvider.test.ts
│   ├── openMeteoProvider.test.ts
│   ├── dailyAggregation.test.ts  # Rolling-24h bucketing, gap propagation when a bucket has zero readings
│   ├── units.test.ts
│   └── theme.test.ts             # Default theme, persistence, data-theme attribute application
└── integration/
    ├── observationFlow.test.tsx
    └── chartAndDetails.test.tsx  # Graph renders correct series/gaps; "View details" shows the matching table; nearby-station series shown/hidden per coverage

.github/
└── workflows/
    └── deploy.yml                # Build (vite build) and publish dist/ to GitHub Pages on push to main
```

**Structure Decision**: Single frontend-only project (Option 1, simplified — no `cli/` or `lib/` needed since this is a browser app, and no separate `backend/` since there is no server component). Business logic lives in `services/` and `hooks/`, kept separate from presentational `components/` so the weather-provider integration and storage logic are independently unit-testable without rendering React. `weatherApi.ts` (already existing as the sole Open-Meteo client) is refactored into a thin orchestrator over two provider modules (`smhiProvider.ts`, `openMeteoProvider.ts`) so the SMHI-coverage decision from research.md §1b is isolated and independently testable. The former single `ObservationView.tsx` (table only) is split into `ObservationChart.tsx` (graph, the new primary view) and `ObservationDetails.tsx` (table, now reached only via the "View details" control, §11) — daily aggregation for the 7-day chart is its own pure module (`dailyAggregation.ts`) so the rolling-bucket logic (§12) is unit-testable without rendering Recharts. Theming (`services/theme.ts` + `hooks/useThemePreference.ts` + `components/ThemePicker.tsx`) follows the exact same shape as the existing unit-preference feature (`units.ts` + `useUnitPreference` + `UnitToggle`) — a `localStorage`-backed preference with a UI control — rather than introducing a new pattern, per §14's "no theming library" decision.

## Complexity Tracking

*No constitution violations to justify — table intentionally omitted.*
