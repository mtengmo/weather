# Feature Specification: Periodically Auto-Refresh Forecast Data

**Feature Branch**: `059-periodically-auto-refresh`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "yes, and add a debug page..." (this spec covers the "yes" — periodic auto-refresh — agreed to a proposal: since the app currently fetches once per page load with no polling or refresh-on-focus, a viewer left on the page can drift out of sync with a source's own live forecast, exactly as diagnosed for an SMHI forecast that changed between the app's load and a live comparison).

Context: `useObservationData` already has a "window-only refetch" path (`042-preserve-scroll-on-window-change`) that keeps showing the previous data while a background refetch is in flight (`isRefreshing`), used today only when the viewer switches the 24h/3d/7d window for the same location. This feature reuses that exact same mechanism, triggered periodically and when the tab regains visibility, instead of only on a window/location change.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The forecast refreshes on its own while the page stays open (Priority: P1)

A viewer who leaves the app open sees its forecast data refreshed periodically, without needing to reload the page or switch views, so a source's updated prediction (like a forecast that changed from clear to rain) reaches them in a reasonable time.

**Why this priority**: This is the entire request — the diagnosed problem was a real forecast update the viewer had no way to see without a manual reload.

**Independent Test**: Load the app, wait past the refresh interval (with the underlying fetch mocked to return different data the second time), and confirm the displayed data updates without any user action.

**Acceptance Scenarios**:

1. **Given** the app has been open longer than the refresh interval, **When** the interval elapses, **Then** the forecast/observation data is re-fetched and the display updates to reflect it.
2. **Given** a refresh is in flight, **When** the viewer looks at the page, **Then** the previous data remains visible throughout (no loading-state flash/blank), exactly like the existing window-switch refetch behavior.
3. **Given** the browser tab was hidden and becomes visible again, **When** the viewer returns to it, **Then** the data refreshes at that point too, not just on the fixed interval.

---

### Edge Cases

- What happens if the viewer switches location or window right as a periodic refresh would fire? No double-fetch — the existing per-location/window fetch effect already coalesces via its own dependency-based re-run; a periodic tick is just another trigger of that same effect, not a separate competing one.
- What happens while the tab is hidden for a long time? No refresh fires while hidden — only a periodic tick while visible, or the moment it becomes visible again, per the existing "no refresh while hidden" convention this feature introduces.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST periodically re-fetch the current location's forecast/observation data while the page remains open and visible, without requiring a manual reload.
- **FR-002**: The app MUST also re-fetch when the browser tab transitions from hidden to visible.
- **FR-003**: A periodic/visibility-triggered refresh MUST keep showing the previously-loaded data while the new fetch is in flight — no blank/loading state, matching the existing window-switch refresh behavior.
- **FR-004**: No refresh MUST be triggered while the tab is hidden.
- **FR-005**: This MUST NOT introduce a duplicate/competing fetch when a periodic tick coincides with a location or window change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Displayed forecast data is never more than one refresh interval old for a page left open and visible.
- **SC-002**: 100% of periodic/visibility-triggered refreshes preserve the previously-shown data until the new fetch completes (0 loading-state flashes).
- **SC-003**: 0 refreshes fire while the tab is hidden.

## Assumptions

- Refresh interval: 15 minutes — frequent enough that a forecast update reaches the viewer within a reasonable wait, without meaningfully increasing API usage (each of this app's three forecast sources already gets fetched once per load; a 15-minute interval is a small, proportionate increase, not continuous polling).
- Scope is the same data `useObservationData`'s existing window-only refetch already covers (the primary series, weekly series, and multi-source forecast) — nearby-station comparison data, UV risk, and warnings keep their existing location-change-only fetch triggers, since they weren't part of the diagnosed staleness problem.
