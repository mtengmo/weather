# Feature Specification: Keep Scroll Position When Switching the Time Window

**Feature Branch**: `042-preserve-scroll-on-window-change`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description:
"if I press the 24h / 3d / 7d button, the page restarts from top, even if I have scrolled down to the graph. not sure if this is possible to make it more user friendly?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stay where I am when switching time windows (Priority: P1)

A viewer scrolls down the dashboard to look at the timeline/graph, then presses a time-window button (24 hours / 3 days / 7 days) to see a different range. Today, the page jumps back to the very top while the new data loads, forcing them to scroll all the way back down to see the graph again. They want to stay looking at the same part of the page.

**Why this priority**: This is the entire request — a real, repeatable annoyance during the app's most common interaction (comparing time windows on data the viewer is actively looking at).

**Independent Test**: Scroll down to the timeline/graph on the dashboard, press a different time-window button, and confirm the view doesn't jump to the top of the page.

**Acceptance Scenarios**:

1. **Given** a viewer has scrolled down to the timeline/graph, **When** they press a different time-window button (24h/3d/7d), **Then** their scroll position is preserved — they keep looking at the same part of the page while the new data loads in.
2. **Given** the new data has finished loading, **When** the viewer looks at the page, **Then** they're still looking at the same section they were viewing before pressing the button, now showing the newly-selected window's data.
3. **Given** a viewer is already at the top of the page, **When** they press a time-window button, **Then** they remain at the top — the fix doesn't introduce unwanted scrolling in the other direction either.

---

### User Story 2 - The same fix applies to the Details/graph view (Priority: P2)

A viewer on the separate Details/graph view (reached via "Details") has the same experience: scrolling down, pressing a time-window button (24h/7d/30d), and getting bounced to the top.

**Why this priority**: Same underlying annoyance, same fix, but a secondary location — the dashboard Overview (User Story 1) is where most viewers spend their time and hit this first.

**Independent Test**: On the Details/graph view, scroll down, press a different time-window button, and confirm the view doesn't jump to the top.

**Acceptance Scenarios**:

1. **Given** a viewer has scrolled down on the Details/graph view, **When** they press a different time-window button, **Then** their scroll position is preserved the same way as on the dashboard.

---

### Edge Cases

- What happens if switching windows takes a while (slow network)? The viewer's scroll position should stay put for the whole loading period, not just snap back once data arrives.
- What happens if the viewer scrolls further while new data is still loading? Their most recent scroll action should win — the fix must not fight the viewer's own scrolling or repeatedly force them back to a remembered position.
- What happens on a very short results page (e.g. a location with little data) where the old scroll position no longer makes sense once new content loads? The viewer should end up somewhere reasonable — not scrolled past the end of the (now shorter) page — rather than stranded off-screen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Pressing a time-window button on the dashboard Overview MUST NOT move the viewer's scroll position to the top of the page.
- **FR-002**: Pressing a time-window button on the Details/graph view MUST NOT move the viewer's scroll position to the top of the page.
- **FR-003**: The viewer's scroll position MUST remain stable for the entire duration data is loading after a time-window change, not just after it completes.
- **FR-004**: This fix MUST NOT introduce new unwanted scrolling in other situations (e.g. a viewer already at the top must not be scrolled further, and the viewer's own in-progress scrolling must not be overridden).
- **FR-005**: If the newly-loaded content is shorter than the page height at the viewer's prior scroll position, the viewer MUST end up somewhere within the visible content, not stranded past its end.

### Key Entities

- **Time window**: The selected observation range (e.g. 24 hours / 3 days / 7 days on the Overview; 24 hours / 7 days / 30 days on the Details/graph view) that determines which data is fetched and displayed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a representative set of sessions where a viewer scrolls down and then switches time windows, 100% keep the viewer's scroll position stable (no jump to the top).
- **SC-002**: The time to "see the graph with the newly-selected window's data" (without needing to re-scroll) is reduced to effectively zero extra scrolling, down from a full scroll-back-down today.
- **SC-003**: No regression in the existing accessibility behavior (e.g. screen-reader announcement of the view/window change) — verified as part of implementation, not a new user-facing requirement here.

## Assumptions

- "The page restarts from top" is a side effect of the app briefly replacing the whole timeline/graph with a small loading message while new data is fetched — the sudden drop in page height is what causes the scroll position to reset, not an intentional scroll-to-top action. The exact technical cause is left to be confirmed during planning.
- This is scoped to the two existing time-window toggles already in the app (dashboard Overview's 24h/3d/7d, and the Details/graph view's 24h/7d/30d) — no new time-window options are being added.
- Preserving scroll position takes priority over any other loading-state visual treatment; how the "loading" state itself looks (e.g. a spinner overlay vs. today's text message) is an implementation detail for planning, not fixed here, as long as it doesn't cause the scroll jump.
