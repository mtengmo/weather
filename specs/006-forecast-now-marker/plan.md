# Implementation Plan: Forecast "Now" Marker & Availability Resilience

**Branch**: `006-forecast-now-marker` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-forecast-now-marker/spec.md`

## Summary

Three additions on top of 005's forecast work: (1) a vertical "now" reference line on every chart that carries a forecast segment; (2) resilience when the primary weather source has observed data but no forecast — fall back to the secondary source's forecast (all metrics together, primary's observed data/identity untouched) and visibly flag on the chart when that fallback was used, rather than silently mixing sources; (3) when a location's nearest station has no usable name, attempt to resolve a real place name from its coordinates via reverse geocoding, clearly labeled as approximate, falling back to the existing "Unnamed station" text.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3 (unchanged from 005)

**Primary Dependencies**: Recharts 3.10 — adds `<ReferenceLine>` (confirmed available in the installed version; not currently used elsewhere in the app) for the "now" marker; no new UI dependency. For reverse geocoding, this feature adds one new external HTTP dependency: **OpenStreetMap Nominatim** (`https://nominatim.openstreetmap.org/reverse`), a free, no-API-key reverse-geocoding service — verified live during planning (see research.md §3) to return usable address components (city/town/suburb/etc.) for a real coordinate. No client library needed; it's a plain `fetch` call, consistent with how this app already talks to SMHI and Open-Meteo.

**Storage**: N/A (unchanged)

**Testing**: Vitest 2 + `@testing-library/react`, under `tests/unit/` and `tests/integration/` (unchanged convention from 005).

**Target Platform**: Browser SPA (unchanged)

**Project Type**: Single-project web frontend (unchanged)

**Performance Goals**: No new goal for the marker or fallback (same reasoning as this feature's original plan — cheap in-memory lookups, at most one extra network request only when the primary forecast is genuinely missing). The new reverse-geocoding call is a single request triggered only for a current-position location whose nearest station has no name — not on every load, and explicitly non-blocking (spec Edge Cases: it must not hold up the rest of the page).

**Constraints**: Must respect Nominatim's public-instance usage policy (research.md §3): a descriptive `User-Agent` (or `Referer`) header identifying the app, and no aggressive polling — this app only calls it once per unnamed-station resolution, not on a timer, so it's naturally compliant. Must reuse 005/006's existing `isForecast` boundary and fallback concepts rather than introducing parallel logic (unchanged from this feature's original plan).

**Scale/Scope**: Extends the original 006 plan's touched files (`chartData.ts`, `ObservationChart.tsx`, `weatherApi.ts`, `openMeteoProvider.ts`) with two more: `smhiProvider.ts` gains a `forecastSource`-style marker so `weatherApi.ts` can tell `ObservationChart.tsx` which source supplied the forecast (for the new indicator), and `useGeolocation.ts` (already touched in 005 for the "Unnamed station" fallback) gains the reverse-geocoding attempt.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no project-specific gates to evaluate. No-op, as in 005 and this feature's original plan.

**Post-design re-check**: No violations introduced by adding one new external HTTP dependency (Nominatim) — it follows the exact same "plain fetch, degrade to a fallback on any failure" pattern already established for SMHI and Open-Meteo, so it doesn't introduce a new architectural category, just one more instance of an existing one.

## Project Structure

### Documentation (this feature)

```text
specs/006-forecast-now-marker/
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
├── services/
│   ├── weatherApi.ts            # Extend (from this feature's original scope): forecast-only
│   │                             # fallback, now also tagging which source supplied the forecast
│   │                             # so the UI can render the source-mismatch indicator (FR-007)
│   ├── openMeteoProvider.ts     # Extend: forecast-only fetch path (unchanged from original scope)
│   ├── smhiProvider.ts          # Extend: no data-fetch change, but its forecast points need a
│   │                             # way to be told apart from a fallback-sourced point downstream
│   ├── geocoding.ts             # New: reverse-geocode coordinates to a place name via Nominatim,
│   │                             # degrading to null on any failure/timeout (FR-008/FR-010)
├── hooks/
│   └── useGeolocation.ts        # Extend: when the station-name lookup (005) yields "Unnamed
│                                 # station", attempt geocoding.ts's reverse lookup and use its
│                                 # result instead, presented as approximate (FR-009)
├── components/
│   ├── chartData.ts             # Extend (from original scope): boundary-lookup helper for the
│   │                             # "now" marker
│   └── ObservationChart.tsx     # Extend (from original scope): render `<ReferenceLine>`, the
│                                 # unavailable-forecast message, and now also the source-mismatch
│                                 # indicator (FR-007)
└── (tests)
    tests/unit/chartData.test.ts
    tests/unit/weatherApi.test.ts
    tests/unit/openMeteoProvider.test.ts
    tests/unit/geocoding.test.ts            # New
    tests/unit/useGeolocation.test.ts       # Extend (005 already added this file)
    tests/integration/chartAndDetails.test.tsx
```

**Structure Decision**: Same single-project frontend, same module boundaries as 005/006's original plan. The two new pieces each get exactly one new/extended module at the layer they belong to: `geocoding.ts` alongside the other provider-style service modules (it's a data-fetching concern, not UI), and the source-indicator is a small addition to the existing forecast-fallback orchestration (`weatherApi.ts`) plus its existing rendering surface (`ObservationChart.tsx`) — no new component.

## Complexity Tracking

*No Constitution Check violations — this section is not applicable.*
