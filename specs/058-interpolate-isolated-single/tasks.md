# Tasks: Interpolate Isolated Single-Hour Gaps

## Phase 1: Setup
- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.

## Phase 2: Implementation
- [X] T002 In `src/components/timelineData.ts`, replace `interpolateNowBoundary(row, nowBoundaryIndex)` with `interpolateIsolatedGaps(row: TimelineRow): TimelineRow` — for each index `i` from `1` to `points.length - 2`, if `points[i].value === null && points[i-1].value !== null && points[i+1].value !== null`, replace that point with `{ ...points[i], value: (points[i-1].value + points[i+1].value) / 2, interpolated: true }`; return a row with a new `points` array only when at least one point changed (otherwise return the original row unchanged, matching the old function's no-op-safe style).
- [X] T003 Update the doc comment above the function to describe the general rule (any isolated single-point gap, not just the now boundary), noting it subsumes the previous now-boundary-specific behavior as one case of the general one.
- [X] T004 In `buildHourlyTimelineData`, update the four `interpolateNowBoundary(rows.X, nowBoundaryIndex)` calls to `interpolateIsolatedGaps(rows.X)`.
- [X] T005 [P] In `tests/unit/timelineData.test.ts`, rename the `"now-boundary interpolation..."` describe block to reflect the generalized rule (e.g. "isolated single-point interpolation (058-interpolate-isolated-single, generalizes 009's now-boundary case)") — keep all of its existing test cases unchanged (they already exercise the general rule's exact behavior at the now-boundary position).
- [X] T006 [P] In the same file, add a new test: a mid-series observed gap (real reading, then one null, then real reading, all `isForecast: false`, none of them at the now boundary) gets filled with the midpoint average, `interpolated: true`.
- [X] T007 [P] In the same file, add a new test: two consecutive null hours (both with real readings further out on each side) remain `null`/not interpolated for both.
- [X] T008 [P] In the same file, add a new test: a null hour at the very start of the series (no left neighbor) remains a gap.

## Phase 3: Polish
- [X] T009 [P] Run `npm run lint`.
- [X] T010 [P] Run `npx tsc -b`.
- [X] T011 Run `npm test` (full suite).
- [X] T012 Run `npm run build`.
- [X] T013 Bump `package.json` version (patch).
- [X] T014 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).
