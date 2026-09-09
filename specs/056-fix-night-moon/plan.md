# Implementation Plan: Fix Night Moon Icon Appearing on Whole-Day Columns

**Branch**: `056-fix-night-moon` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/056-fix-night-moon/spec.md`

## Summary

`resolveFromParts`'s fallback (no-SMHI-code) branch currently uses the `isNightNow` parameter — computed from `period.key`'s raw clock hour — to pick a night variant. That parameter is correct for the SMHI-code branch (only ever reached by genuine hourly periods), but wrong for the fallback branch, which whole-day columns also reach. Fix: the fallback branch stops using `isNightNow` and instead checks `condition === "clear-night"` directly — a signal that's already only ever true for a genuine point-in-time reading (whole-day periods never produce it, by the existing, deliberate "no timestamp passed" rule in `timelineData.ts`). The SMHI-code branch keeps using `isNightNow` unchanged, since it's never reached by non-hourly periods anyway.

## Technical Context

**Language/Version**: TypeScript 5.5

**Constraints**: Must not change 054's correct behavior for genuine hourly periods (either path); must not require a new `TimelinePeriod` field or prop-threading change — the fix is confined to `resolveFromParts`'s existing branches

**Scale/Scope**: One conditional inside one function

## Project Structure

```text
src/components/smhiSymbolIcons.ts   # resolveFromParts fallback branch
tests/unit/smhiSymbolIcons.test.ts  # regression test: whole-day-style call never gets night variant
```
