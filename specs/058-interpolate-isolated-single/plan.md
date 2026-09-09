# Implementation Plan: Interpolate Isolated Single-Hour Gaps

**Branch**: `058-interpolate-isolated-single` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/058-interpolate-isolated-single/spec.md`

## Summary

Replace the narrow `interpolateNowBoundary(row, nowBoundaryIndex)` — which only ever fills one specific index — with a general `interpolateIsolatedGaps(row)` that scans every point in a row and fills any single `value === null` point whose immediate neighbors both have real values, via their midpoint average, marked `interpolated: true`. The existing now-boundary case turns out to already be exactly this same shape of gap (confirmed by tracing the code), so the general version subsumes it with no behavior change there, while also newly covering isolated mid-series observed gaps like the reported Uppsala 13:00 case.

## Technical Context

**Language/Version**: TypeScript 5.5

**Constraints**: Must not fill runs of 2+ consecutive missing hours; must not fill a gap at either end of the series (no neighbor on one side); must not overwrite any point that already has a real value; must not change `direction`/`gust`/other optional per-point fields

**Scale/Scope**: One function replaced (same call sites, same 4 rows), no new data model, no new component

## Project Structure

```text
src/components/timelineData.ts          # interpolateNowBoundary -> interpolateIsolatedGaps
tests/unit/timelineData.test.ts          # generalized-interpolation tests
```
