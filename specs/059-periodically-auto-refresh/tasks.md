# Tasks: Periodically Auto-Refresh Forecast Data

## Phase 1: Setup
- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.

## Phase 2: Implementation
- [X] T002 In `src/hooks/useObservationData.ts`, add `const REFRESH_INTERVAL_MS = 15 * 60_000;` near the top.
- [X] T003 Add `const [refreshTick, setRefreshTick] = useState(0);`.
- [X] T004 Add a new `useEffect` (no deps beyond mount) that sets up `setInterval(() => setRefreshTick((t) => t + 1), REFRESH_INTERVAL_MS)` and a `document.addEventListener("visibilitychange", ...)` handler that calls `setRefreshTick((t) => t + 1)` only when `document.visibilityState === "visible"`; clears the interval and removes the listener on cleanup.
- [X] T005 Add `refreshTick` to the main fetch effect's dependency array (the one at the top with `[location?.latitude, location?.longitude, window]`) so a tick re-runs it exactly like a window/location change would, reusing the existing `isRefreshing`/stale-data-preserved logic unchanged.
- [X] T006 [P] In `tests/unit/useObservationData.test.ts`, add a test (using `vi.useFakeTimers()`): after the interval elapses, `getObservations` is called again for the same location/window, and `series` stays non-null (previous data preserved) throughout, matching the existing window-only-refetch behavior.
- [X] T007 [P] In the same file, add a test: dispatching a `visibilitychange` event with `document.visibilityState` mocked to `"visible"` triggers a re-fetch; dispatching one while `"hidden"` does not.

## Phase 3: Polish
- [X] T008 [P] Run `npm run lint`.
- [X] T009 [P] Run `npx tsc -b`.
- [X] T010 Run `npm test` (full suite).
- [X] T011 Run `npm run build`.
- [X] T012 Bump `package.json` version (patch).
- [X] T013 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).
