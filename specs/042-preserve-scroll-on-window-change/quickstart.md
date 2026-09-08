# Quickstart: Keep Scroll Position When Switching the Time Window

## Prerequisites

- `npm install` (if not already done)

## Automated validation

```bash
npm test
```

Expect (per `research.md` §5):
- `tests/unit/useObservationData.test.ts` covers: a window-only change (same location) never
  observes `series`/`weeklySeries` becoming `null` between fetches; a location change still resets
  to `null` as before; `isRefreshing` reflects the in-flight state correctly.
- Existing integration tests for first-load "Loading …" text (Overview, Details/graph,
  ObservationDetails) continue to pass unmodified.

## Manual validation

1. `npm run dev`, open the dashboard Overview for a location with data, and scroll down to the
   timeline/graph.
2. Press a different time-window button (e.g. 24h → 7d).
   - **Expected**: The page does not jump to the top; the timeline/graph you were looking at stays
     in view (optionally showing a subtle "refreshing" cue) and updates in place once the new
     window's data arrives.
3. Repeat on the Details/graph view (via "Details"), scrolled down, switching between its own
   24h/7d/30d buttons.
   - **Expected**: Same behavior — no jump to the top.
4. Select a different location (not just a different window) while scrolled down.
   - **Expected**: This is unaffected by this feature — the existing "Loading …" state may still
     appear, since a location change is a genuine fresh start, not the pattern being fixed.
5. Throttle the network (e.g. browser dev tools "Slow 3G") and repeat step 2.
   - **Expected**: The previous window's data stays visible and in place for the whole loading
     period — no flash to a blank/loading state at any point.

## Notes

- No new dependencies, environment variables, or build steps.
- No change to any component's props or public interface — only `useObservationData`'s internal
  reset timing changes, plus one new optional `isRefreshing` field.
