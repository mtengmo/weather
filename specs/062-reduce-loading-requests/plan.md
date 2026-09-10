# Implementation Plan: Reduce Loading Requests

**Branch**: `062-reduce-loading-requests` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/062-reduce-loading-requests/spec.md`

## Summary

All three of this feature's behavior changes live entirely inside one hook,
`src/hooks/useObservationData.ts`, which is already the single place all of the app's weather data
fetching goes through. (1) Split its one `Promise.all([...]).then(...)` into three independent
`.then()` chains so each of `series`/`multiSourceForecast`/`weeklySeries` updates the moment its
own fetch resolves, instead of all three waiting on the slowest one (US1). (2) Add a small
per-location, per-window cache (a `useRef` map, cleared on a genuine location change or the
existing 15-minute auto-refresh tick) so a window switch (24h↔7d) reuses already-fetched data
instead of re-fetching it (US2). (3) No code change for US3 — nearby-station fetching is already
gated behind `includeNearbyStations` in its own independent effect; this feature only needs a
regression test locking that in.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (existing app code — no new dependency)

**Primary Dependencies**: None new — same `useEffect`/`useRef`/`useState` primitives already used
throughout this hook

**Storage**: N/A — the cache is in-memory, per-hook-instance (a `useRef`), not persisted across
page loads (matches this app's existing convention: `locationCache`/`favoritesStorage` are the only
things that persist across loads, and this isn't one of them)

**Testing**: Vitest + `@testing-library/react` (`renderHook` for the hook's own unit tests,
`render`/`userEvent` for integration coverage) — existing setup, no new tooling

**Target Platform**: Web (existing PWA)

**Project Type**: Single-page web app (existing `src/` structure)

**Performance Goals**: Fewer network requests per browsing session (SC-001) and no new
time-to-first-content regression (SC-002) — both verified by request-count assertions in tests,
not by a runtime performance harness (this app has none, and doesn't need one for a change this
narrowly scoped)

**Constraints**: Must not change what data is ultimately displayed (FR-005) — the cache stores and
replays the exact same `ObservationSeries`/`MultiSourceForecastEntry[]` objects a fresh fetch would
have produced, never a transformed/derived version

**Scale/Scope**: One hook file rewritten internally (same public return shape — no consumer of
`useObservationData` changes); one existing unit test adjusted to fit the new (intended) behavior;
a small number of new unit/integration tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no project-specific principles
defined) — no gates apply. PASS (nothing to check against).

## Project Structure

### Documentation (this feature)

```text
specs/062-reduce-loading-requests/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — `useObservationData`'s public return shape (`UseObservationDataResult`)
is unchanged; there's no new external interface to document.

### Source Code (repository root)

```text
src/hooks/
└── useObservationData.ts        # MODIFIED: decoupled promise resolution (US1) +
                                  # per-location/per-window request cache (US2)

tests/unit/
└── useObservationData.test.ts   # MODIFIED: one existing test's window-switch fixture changed
                                  # from "last-7-days" (now cached, no longer triggers a real
                                  # pending fetch) to "last-30-days" (never cached — preserves the
                                  # test's original intent unchanged); NEW tests for cache reuse
                                  # (US2) and independent per-piece rendering (US1)

tests/integration/
└── weatherIconOverview.test.tsx # NEW test(s): a full 24h→7d→24h round trip through the real
                                  # App/hook wiring issues no duplicate request (US2 end-to-end);
                                  # a regression test locking in nearby-station's existing lazy
                                  # load (US3)
```

**Structure Decision**: No new files, no new modules — this is a targeted rewrite of one existing
hook's internals plus tests, matching the spec's own framing ("this feature is about *when* and
*how many* requests are made for data the app already shows today").

## Complexity Tracking

*No constitution violations — section not applicable.*
