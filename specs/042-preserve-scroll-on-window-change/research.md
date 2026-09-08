# Phase 0 Research: Keep Scroll Position When Switching the Time Window

## 1. Confirming the root cause

**Decision**: The scroll jump is caused by `src/hooks/useObservationData.ts`'s primary effect
(~line 56-85), which calls `setSeries(null)` (and `setWeeklySeries(null)` when applicable)
**unconditionally on every `window` change** — including when the location hasn't changed at all,
which is exactly the 24h/3d/7d (or 24h/7d/30d) button case. While `series` is `null`,
`WeatherIconOverview.tsx` (~line 827), `ObservationChart.tsx` (~line 301), and
`ObservationDetails.tsx` (~line 58) each render a single `<p role="status">Loading …</p>` in place
of the entire timeline/graph/table. That collapses the page's height for the duration of the
fetch; the browser clamps the scroll position to the new (much shorter) max scrollable height,
which is at or near 0 — so the viewer visually lands at the top. When the fetch resolves and the
full content returns, nothing restores the previous scroll position, so the viewer stays at the
top and has to scroll back down manually.

**Rationale**: Confirmed by reading the effect's dependency array
(`[location?.latitude, location?.longitude, window]`) — a window-only change re-runs the same
effect that a location change does, with no distinction between the two cases. No other code path
(no `scrollTo`/`scrollIntoView` call exists anywhere in `src/`) explains the jump.

## 2. Chosen fix: keep showing the previous window's data while refetching

**Decision**: Change `useObservationData.ts` so that `series`/`weeklySeries` are only reset to
`null` when the **location** actually changes (or on first load for a location that's never been
fetched) — not on a window-only change. On a window-only change, the hook keeps returning the
*previous* window's data until the new fetch resolves, then swaps it in. Add a new
`isRefreshing: boolean` field to `UseObservationDataResult` (true while a fetch is in flight for a
location that already has data), so the UI can optionally show a lightweight in-place indicator
(e.g. a subtle opacity dip on the timeline) without collapsing anything.

**Rationale**: This is the only approach that satisfies FR-001/FR-003 literally — "must not move to
top" and "must remain stable for the entire duration data is loading," not just "restored after
loading." A capture-and-restore-scrollY approach (see Alternatives) cannot avoid at least one
visible frame of collapsed content, since the collapse (`setSeries(null)`) and the eventual restore
happen on either side of an inherently asynchronous gap (the network fetch) — the browser paints
the collapsed state before the fetch can possibly resolve. Keeping the previous content on screen
avoids the collapse entirely, so there's nothing to restore.

Blast-radius check: every existing `series !== null` / `weeklySeries !== null` guard across
`WeatherIconOverview.tsx`, `ObservationChart.tsx`, `ObservationDetails.tsx`, and `Footer.tsx` stays
correct under this change — they all mean "we have *some* data to show," which remains true (and
becomes true *sooner*, since it stays true across a window switch instead of flipping to `null`
first). Only the hook's own effect logic changes; no consuming component's conditional-rendering
logic needs to change to stay correct. The three `{series === null && <p>Loading…</p>}` blocks
naturally stop firing during a window-only switch as a side effect of this change — no edit needed
there for FR-001/FR-002 to hold.

**Alternatives considered**:
- Capture `window.scrollY` before the window-change fetch starts and restore it once the fetch
  resolves (via `useLayoutEffect` keyed on `series`) — rejected: still collapses the page and
  visibly snaps the viewport to the top for one paint before the async fetch resolves, which is
  the exact symptom being fixed, just shortened rather than eliminated. Doesn't satisfy FR-003
  ("stable for the entire duration").
- Freezing `document.body`'s scroll (e.g. `overflow: hidden` / fixed height) during the fetch —
  rejected: more complex, and still requires knowing the "right" height to freeze at; the
  stale-data approach is simpler and gives the viewer real (if momentarily one-window-behind)
  content instead of a frozen placeholder.
- Rewriting every consumer to accept a `series | staleSeries` pair explicitly — rejected as
  unnecessary; keeping the *hook's own* state stale-until-replaced achieves the same effect with a
  single, localized change.

## 3. Distinguishing "location changed" from "window changed"

**Decision**: Track the previously-fetched location's coordinates in a `useRef` inside the hook.
Inside the effect, compare the incoming `location` to that ref: if the coordinates differ (or the
ref is empty — first run), reset `series`/`weeklySeries` to `null` as today (a genuine "starting
fresh" case, where stale data would be actively wrong to show). If the coordinates match, skip the
reset and let the in-flight fetch simply replace `series`/`weeklySeries` once it resolves, exactly
as the effect's `.then()` already does. Update the ref after every effect run (regardless of which
branch), so the *next* run can compare correctly.

**Rationale**: Matches the existing convention already used for the effect's own dependency array
(comparing primitive `latitude`/`longitude`, not object identity, since `location` objects aren't
guaranteed to be referentially stable between renders — confirmed by how the dependency array
itself is written).

## 4. Edge cases from the spec

- **Slow network (FR-003)**: Naturally handled — the previous content simply stays visible for as
  long as the fetch takes; nothing times out or force-collapses.
- **Viewer scrolls further while loading (FR-004)**: Since nothing about this fix touches scroll
  position programmatically (no `scrollTo`/`scrollIntoView` is added), the viewer's own scrolling
  is never fought — this falls out of the "don't collapse, don't explicitly scroll" approach for
  free.
- **Shorter new content than old (FR-005)**: If the new window's data genuinely renders a shorter
  page than the old one (e.g. 24h has fewer rows than 7d in some layout), the browser's own natural
  scroll-clamping behavior applies once the swap happens — the viewer lands at the new max scroll
  position, not stranded past the end. No extra code needed; this is standard browser behavior for
  any content-height change, already relied upon elsewhere in the app.

## 5. Testing approach

**Decision**: Add unit-level coverage in a new or extended `tests/unit/useObservationData.test.ts`
(check first whether one already exists) asserting: (a) on a window-only change with the same
location, `series` is never observed to be `null` between the old and new data (i.e., the mock
`getObservations` resolves after a tick, and `series` stays non-null throughout); (b) on a location
change, `series` does reset to `null` before the new fetch resolves, preserving today's existing
first-load behavior. Existing integration tests (`weatherIconOverview.test.tsx`,
`chartAndDetails.test.tsx`) that already assert "Loading …" text on first load continue to pass
unmodified, since first-load behavior is unchanged.

**Rationale**: The hook's logic (not a DOM scroll position, which jsdom doesn't lay out
meaningfully) is what actually changed, so unit-testing the hook's returned `series` value across a
simulated window change is the precise, deterministic way to verify the fix — matching this
project's existing convention of testing hooks directly where one exists, and components via
integration tests otherwise.
