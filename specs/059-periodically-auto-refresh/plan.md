# Implementation Plan: Periodically Auto-Refresh Forecast Data

**Branch**: `059-periodically-auto-refresh` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/059-periodically-auto-refresh/spec.md`

## Summary

`useObservationData`'s main fetch effect already re-runs (via its dependency array) whenever `location`/`window` change, and already keeps the previous data visible during a same-location refetch (`isRefreshing`, from `042`). Add a `refreshTick` counter to that same dependency array, incremented by a `setInterval` (15 min) and by a `visibilitychange` listener (when the tab becomes visible), so a periodic/focus-triggered refresh reuses the exact same code path a window switch already uses — no new loading-state logic needed.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18

**Constraints**: Must not fire while the tab is hidden; must not double-fetch when a tick coincides with a location/window change (already naturally handled — React batches the effect to one run per dependency-array change); must not touch the nearby-station/UV/warnings effects (out of scope per spec Assumptions)

**Scale/Scope**: One new `useEffect` (interval + visibility listener) + one new state value threaded into the existing fetch effect's dependency array, all within `useObservationData.ts`

## Project Structure

```text
src/hooks/useObservationData.ts   # refreshTick state + interval/visibility effect + dependency array update
tests/unit/useObservationData.test.ts (or equivalent integration test)  # refresh-trigger tests
```
