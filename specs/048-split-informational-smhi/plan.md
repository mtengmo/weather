# Implementation Plan: Split Informational SMHI Warnings Into the Daily Brief

**Branch**: `048-split-informational-smhi` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/048-split-informational-smhi/spec.md`

## Summary

`getWarningsForLocation` (`weatherApi.ts`) already returns a flat `WeatherWarning[]`, filtered to active/near-term and sorted active-first-then-severity (045). This feature adds a computed `isInformational` flag (`severityCode === "MESSAGE"`), splits the list at the one place it's currently consumed (`App.tsx`) into two: color-coded warnings keep going to `WarningBanner` exactly as today, and informational ones are threaded down to `TodaySummaryCard` (via `WeatherIconOverview`) as a small, non-dismissible line in the existing card. No new fetch, no new endpoint — purely a routing and rendering change over data already in hand.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18 (existing stack)

**Primary Dependencies**: None new — reuses `getWarningsForLocation`, `WeatherWarning`, `WarningBanner`, `TodaySummaryCard`, `WeatherIconOverview`

**Storage**: N/A

**Testing**: Vitest + Testing Library

**Target Platform**: Web (existing PWA)

**Project Type**: Single web app

**Constraints**: Must not change `WarningBanner`'s existing behavior for color-coded warnings (active/upcoming, ordering, dismissal); informational items must not be individually dismissible (FR-005); must not affect other providers' data flow (SMHI-only, matching how warnings already work)

**Scale/Scope**: One new computed field on `WeatherWarning`, a split at one call site, one new small render block in `TodaySummaryCard`, prop threading through `WeatherIconOverview`

## Constitution Check

Constitution file is an unfilled template — no gates apply.

## Project Structure

### Documentation (this feature)

```text
specs/048-split-informational-smhi/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── models/types.ts                  # WeatherWarning gains isInformational
├── services/weatherApi.ts           # getWarningsForLocation: compute isInformational
├── App.tsx                          # split warnings into banner vs. informational, pass down
├── components/WeatherIconOverview.tsx  # thread informationalWarnings prop to TodaySummaryCard
├── components/TodaySummaryCard.tsx  # render informational warnings, non-dismissible
└── index.css                        # small style for the new line(s)
```

**Structure Decision**: Single existing web app — no new directories, no new components (reuses `TodaySummaryCard` rather than inventing a new one, per spec's Assumptions).

## Complexity Tracking

*No violations — nothing to justify.*
