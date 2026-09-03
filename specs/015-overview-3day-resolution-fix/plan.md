# Implementation Plan: Overview Resolution Split and High/Low Fix

**Branch**: `015-overview-3day-resolution-fix` | **Date**: 2026-09-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/015-overview-3day-resolution-fix/spec.md`

## Summary

014's sub-day breakdown (morning/lunch/afternoon/evening/night) mixed two resolutions into the same 7-day Overview timeline — the first two days got 5 sub-day columns each while the rest stayed daily. This feature un-mixes them: the 7-day view reverts to a uniform one-column-per-day resolution, and the sub-day detail moves to a new, dedicated "Last 3 days" Overview option where every day uses the same sub-day resolution. It also verifies (and guards with tests) that the High/Low toggle correctly shows each day's/period's high and low on both views — live testing during planning found it already working on the 7-day view after the 2026-09-03 bucket-matching fix (`afd83a0`), but never on the 24-hour view, which has no day-level high/low concept by design; the most likely explanation for "not working" is that the reporter toggled it while on the 24-hour view (the Overview's default landing view), which has never carried this feature. The fix is treated as a regression-guard through this refactor, not a new root cause.

## Technical Context

**Language/Version**: TypeScript 5.5 (React 18.3, Vite 5)

**Primary Dependencies**: React 18.3, Recharts 3.10 (unaffected by this feature — Overview only, not the classic graph), Vitest 2 + `@testing-library/react`

**Storage**: N/A (no persistence changes)

**Testing**: Vitest (`tests/unit/`, `tests/integration/`)

**Target Platform**: Static web app (GitHub Pages), evergreen browsers

**Project Type**: Single-project web app (`src/`, `tests/`)

**Performance Goals**: No new network fetches — the 3-day view reuses the same `last-7-days` fetch already made for the 7-day view (SC-004)

**Constraints**: Must not change the shared `ObservationWindow` type or any fetch/provider behavior — the classic graph view and its data-fetching are explicitly out of scope (FR-006)

**Scale/Scope**: Touches `src/services/dailyAggregation.ts`, `src/components/timelineData.ts`, `src/components/WeatherIconOverview.tsx`, `src/index.css` only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No `.specify/memory/constitution.md` gates are defined for this project (template only) — no gates to evaluate.

## Project Structure

### Documentation (this feature)

```text
specs/015-overview-3day-resolution-fix/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── services/
│   └── dailyAggregation.ts     # toSubDayAndDailyBuckets removed; toDailyAggregates reverts to
│                                # its own sole use for daily views; new toSubDayBuckets(observations,
│                                # dayCount) added for the 3-day view (uniform sub-day resolution)
├── components/
│   ├── timelineData.ts         # buildDailyTimelineData reverts to plain toDailyAggregates; new
│   │                            # build3DayTimelineData added, reusing the same buildRows/RowSource
│   │                            # plumbing (including high/low) already in this file
│   └── WeatherIconOverview.tsx # adds a "Last 3 days" option to the Overview's own window toggle,
│                                # backed by local display-mode state (not the shared ObservationWindow),
│                                # so switching between 3-day/7-day never triggers a new fetch
├── index.css                   # .weather-timeline-fill extended to the 3-day view's own wrapper class
└── models/types.ts             # unchanged — no new ObservationWindow value

tests/
├── unit/
│   ├── dailyAggregation.test.ts  # toSubDayAndDailyBuckets tests replaced with toSubDayBuckets tests;
│   │                              # toDailyAggregates' own tests unaffected
│   └── timelineData.test.ts      # buildDailyTimelineData's sub-day tests removed (behavior reverted);
│                                  # new build3DayTimelineData tests added, including high/low coverage
└── integration/
    └── weatherIconOverview.test.tsx  # 7-day fill/resolution regression tests; new 3-day view tests;
                                        # high/low regression tests for both 7-day and 3-day views
```

**Structure Decision**: Single-project web app (existing layout, `src/` + `tests/` at repo root) — this feature only touches the Overview's own display layer and its one daily-aggregation service; the classic graph, providers, and shared fetch types are untouched.

## Complexity Tracking

*No constitution gates defined — no violations to justify.*
