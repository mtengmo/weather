# Implementation Plan: Debug Section With Raw Source Responses

**Branch**: `060-debug-page-bottom` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/060-debug-page-bottom/spec.md`

## Summary

Each provider already parses its full raw forecast response before reducing it to the fields it needs, then discards it — capture it instead as a module-level "last raw response," exposed via a small new getter per provider, with zero change to any existing function's return shape (avoiding a large test-mock ripple, since `openMeteoProvider.getForecastOnly` alone is asserted as a plain array in a dozen-plus existing tests). `weatherApi.ts`'s `getMultiSourceForecast` reads each getter right after its own fetch resolves and attaches the result to the `MultiSourceForecastEntry` it already builds. A new `DebugPanel` component renders it at the bottom of the page.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18

**Constraints**: No new network requests (FR-002); no change to any existing function's return shape (`getForecastOnly` on all three providers, `getMultiSourceForecast`'s array-of-entries shape) — zero existing test mocks need updating; no change to `mergeMultiSourceIntoTimelinePoints`'s existing `multiSourceForecast.length` gating

**Scale/Scope**: 3 provider files gain a module-level "last raw response" variable + getter, set as a side effect inside their existing fetch function; `weatherApi.ts`'s `MultiSourceForecastEntry` gains one field; one new component; one new render call in `App.tsx`

## Project Structure

```text
src/services/smhiProvider.ts       # lastRawForecastResponse + getLastRawForecastResponse()
src/services/openMeteoProvider.ts  # lastRawForecastResponse + getLastRawForecastResponse()
src/services/metNoProvider.ts      # lastRawForecastResponse + getLastRawForecastResponse()
src/services/weatherApi.ts         # MultiSourceForecastEntry gains rawResponse; getMultiSourceForecast populates it via the 3 getters
src/components/DebugPanel.tsx      # new — renders the 3 sources' raw responses
src/App.tsx                        # render <DebugPanel> before <Footer>
tests/unit/weatherApi.test.ts      # new tests for rawResponse population
```
