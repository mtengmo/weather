# Implementation Plan: Calendar-Day Rain Total on the Today Card

**Branch**: `033-todays-rain-total` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/033-todays-rain-total/spec.md`

## Summary

`TodaySummaryCard`'s rain figure currently reads `today.totalPrecipitation`, where `today` is the
forward-looking `(now, now+24h]` `DailyAggregate` bucket also used for the card's condition/high/
low — a rolling window that can span into tomorrow. This adds a small, separate calculation in
`WeatherIconOverview.tsx` (where `weeklySeries.observations` is already available) that sums
precipitation across `[localMidnightStart, localMidnightEnd)` for the current calendar day only,
and passes it into `TodaySummaryCard` as a new prop used solely for the rain figure — the `today`
bucket itself, and everything else derived from it (condition, high/low), is untouched.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3

**Primary Dependencies**: None new

**Storage**: N/A

**Testing**: Vitest + `@testing-library/react` — unit tests for the new calendar-day-sum helper
(elapsed-hours + forecast-hours combined, tomorrow excluded, missing data not fabricated) and an
integration test confirming the Today card's rain figure reflects the calendar-day sum, not the
existing rolling-window bucket's total.

**Target Platform**: Static SPA, GitHub Pages (weather.tengmo.com)

**Project Type**: Single front-end web app (existing `src/`/`tests/` structure, no backend)

**Performance Goals**: N/A — pure client-side recomputation over already-fetched data, no new
fetch.

**Constraints**: Must not change `today`'s own bucket boundaries or any other value derived from
it (FR-004) — condition, high/low, wind, and sunrise/sunset on the same card must render exactly
as before; "today" is the user's local calendar day (device timezone), consistent with this
app's existing local-midnight conventions (`toSubDayBuckets`'s day-boundary widening,
`weatherCondition.ts`'s night-hour cutoff).

**Scale/Scope**: One new small helper function and its unit tests, one new prop threaded from
`WeatherIconOverview.tsx` into `TodaySummaryCard.tsx`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled template — no project-specific gates beyond
this repo's own established conventions (local-midnight day-boundary handling already used
elsewhere; never fabricate a value for missing data). No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/033-todays-rain-total/
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
├── WeatherIconOverview.tsx  # + calendar-day rain sum, computed from weeklySeries, passed down
└── TodaySummaryCard.tsx     # rain figure reads the new prop instead of today.totalPrecipitation
```

**Structure Decision**: Existing single-project structure — a small addition to two already-
existing files; no new files beyond this feature's own `specs/` documentation.

## Complexity Tracking

*No constitution violations — section not needed.*
