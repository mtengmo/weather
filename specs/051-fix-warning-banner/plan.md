# Implementation Plan: Fix Warning Banner Colors to Match Real Severity

**Branch**: `051-fix-warning-banner` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/051-fix-warning-banner/spec.md`

## Summary

Two fixes, both scoped to `weatherApi.ts` and `index.css`: (1) `SEVERITY_ORDER` gains `YELLOW`/`ORANGE`/`RED` entries (keeping `CLASS_1/2/3` as defensive aliases); (2) the banner's CSS stops defaulting to red for every warning regardless of level — the base becomes neutral, and each real severity level (plus the old aliases) gets its own full background/border/text treatment. No component logic changes — `WarningBanner.tsx` already derives its CSS class from `severityCode.toLowerCase()`, which will now correctly match.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18 / CSS

**Primary Dependencies**: None new

**Constraints**: Must not change 048's Message-level routing (Message never reaches the banner); must not regress upcoming-warning (`warning-upcoming`) styling, which is layered on top of level styling via a separate class

**Scale/Scope**: One constant map update, one CSS block restructure

## Constitution Check

Constitution file is an unfilled template — no gates apply.

## Project Structure

```text
src/services/weatherApi.ts   # SEVERITY_ORDER
src/index.css                # .warning-banner*/.warning-level-* rules
tests/unit/weatherApi.test.ts            # severity ranking tests
tests/integration/warningBanner.test.tsx # rendered class assertions
```
