# Implementation Plan: Collapse Informational Warnings in the Today Card, With a Drill-Down

**Branch**: `052-collapse-informational-warnings` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/052-collapse-informational-warnings/spec.md`

## Summary

`TodaySummaryCard` currently renders each informational warning as `<strong>{title}:</strong> {description}` inline, always fully expanded. This adds local per-warning expand/collapse state (a `Set<string>` of expanded ids) and turns the title into a toggle button — mirroring `WarningBanner`'s own existing collapsed/expandable pattern (a precedent already in the codebase) rather than inventing a new interaction.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18

**Primary Dependencies**: None new

**Constraints**: Must not affect color-coded warnings (banner, unrelated component); each warning's expand state independent; works via click/tap (no hover-only affordance)

**Scale/Scope**: One `useState` + one toggle handler + a small render-structure change, all within `TodaySummaryCard.tsx`; a CSS rule for the toggle button

## Constitution Check

Constitution file is an unfilled template — no gates apply.

## Project Structure

```text
src/components/TodaySummaryCard.tsx   # expand/collapse state + render structure
src/index.css                         # .today-summary-notice-toggle style
tests/integration/weatherIconOverview.test.tsx  # Today card expand/collapse tests
```
