# Feature Specification: Overview Default, Location Panel, and Graph Readability

**Feature Branch**: `013-overview-default-and-layout`

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "default to overview page. improve logic/place of favorites and locations, the gui doesn't scale well on laptops with large screens. On mobile, center on now on default. Add source of data as a note. Add scale on left and right side. Dot's for each hour on the graph's. Add a note on high/lowest point in observations on temp."

## Clarifications

### Session 2026-09-02

- Q: How should the favorites/locations area be reorganized so it scales better on wide laptop screens? → A: Move location switching into a separate slide-out side panel or modal, fully decluttering the header, opened via a single "Change location" button

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Land on the overview, not the raw graph (Priority: P1)

A user opening the app today lands on the classic line-graph view and has to click through to "Overview" to see the at-a-glance timeline dashboard. Since the Overview is the primary, most digestible view of current conditions, the app now opens directly on it whenever a location is available, with the graph view still one click away.

**Why this priority**: Directly requested; a one-line default change with immediate value on every single visit.

**Independent Test**: Load the app fresh with a location resolvable (current position or a cached location); confirm the Overview timeline is the first view shown, without needing to click anything.

**Acceptance Scenarios**:

1. **Given** a fresh app load where a location resolves (current position, cached location, or first favorite), **When** the page finishes loading, **Then** the Overview timeline is the view shown, not the line graph.
2. **Given** the user is on the Overview, **When** they click "Back to graph," **Then** the classic line-graph view opens as it does today.
3. **Given** no location can be resolved yet (e.g. geolocation still pending or denied with nothing cached), **When** the page loads, **Then** the app behaves as it does today for that state (no view to show until a location exists).

---

### User Story 2 - Location switching moves into its own panel (Priority: P1)

A user on a large laptop screen today sees the search box, the favorites list, and the current-location/favorites switcher spread across the header as separate blocks that don't fill the available width well and compete for space with the main content. Location switching is consolidated into a single "Change location" control in the header that opens a dedicated panel containing current-location, favorites, and search — decluttering the header at every screen size instead of only at some.

**Why this priority**: Directly requested; the layout problem is most visible on exactly the wide-screen case this fixes, and it's a P1 alongside the overview default since both reshape the app's primary landing experience.

**Independent Test**: Open the app on a wide (laptop) viewport; confirm the header shows a single compact "Change location" control instead of separate search/favorites blocks, and that opening it reveals current-location, favorites, and search together in one panel.

**Acceptance Scenarios**:

1. **Given** the app is loaded on any viewport width, **When** the user looks at the header, **Then** they see a single "Change location" control, not separate always-visible search/favorites sections.
2. **Given** the user clicks "Change location," **When** the panel opens, **Then** it contains the current-location option, the favorites list (with remove), and the search input together.
3. **Given** the panel is open, **When** the user selects a location (current position, a favorite, or a fresh search result), **Then** the app switches to that location and the panel closes.
4. **Given** the panel is open, **When** the user removes a favorite or adds a new one via search, **Then** the panel stays open and reflects the updated list, rather than closing on every list change.
5. **Given** the panel is open, **When** the user dismisses it without selecting anything (e.g. a close control), **Then** it closes and the previously-selected location remains unchanged.
6. **Given** a location is already selected, **When** the panel opens, **Then** that location is visibly marked as the current selection within the panel (matching today's `aria-pressed` convention on the current-location/favorite buttons).

---

### User Story 3 - The timeline opens centered on "now" (Priority: P2)

A user opening the Overview on a phone today sees the timeline scrolled to its leftmost (oldest) hour by default, requiring a manual swipe to reach the "now" column that the whole redesign is built around. Whenever the timeline's columns don't all fit in the visible width, it now opens already scrolled so the "now" column sits centered in view.

**Why this priority**: A direct usability fix for the just-shipped timeline, especially valuable now that the Overview is the default landing view (User Story 1) — but narrower in scope than the two P1 items above.

**Independent Test**: Open the Overview on a narrow viewport with a series that has an observed/forecast boundary and more columns than fit on screen; confirm the timeline is initially scrolled so the "now" column is roughly centered, without the user swiping.

**Acceptance Scenarios**:

1. **Given** the timeline's total column width exceeds its visible container width, **When** the Overview first renders, **Then** the timeline is scrolled so the "now" column sits at (or as close as possible to) the horizontal center of the visible area.
2. **Given** the timeline's total column width fits entirely within its visible container (e.g. a wide desktop window), **When** the Overview renders, **Then** no scrolling adjustment is needed or applied.
3. **Given** a series with no observed/forecast boundary (no "now" column to center on), **When** the Overview renders, **Then** the timeline opens at its default (leftmost) scroll position, unchanged from today.
4. **Given** the timeline has already been manually scrolled by the user, **When** the window/period toggle is changed and the timeline re-renders, **Then** the center-on-now behavior applies again for the new content (it is an initial-render behavior, not a one-time flag).

---

### User Story 4 - Know where the data comes from (Priority: P3)

A user looking at either the graph or the Overview today has no on-screen indication of which weather data provider supplied what they're looking at. A short note states the data source for the currently displayed location, visible without needing to hover over anything.

**Why this priority**: Directly requested; a small trust/transparency addition, lower priority than the structural changes above.

**Independent Test**: Open either the graph or the Overview for a location; confirm a visible note states the data source, without requiring a hover or click.

**Acceptance Scenarios**:

1. **Given** a location's data came from SMHI, **When** the graph or Overview renders, **Then** a visible note identifies SMHI as the source.
2. **Given** a location's observed data came from SMHI but its forecast came from a fallback provider, **When** the graph or Overview renders, **Then** the note reflects that both sources contributed, distinct from the existing per-series "(forecast, alt. source)" label already shown in the graph's legend.
3. **Given** a location's data came entirely from the fallback provider (no SMHI coverage), **When** the graph or Overview renders, **Then** the note identifies that fallback provider as the source.

---

### User Story 5 - Read chart values without hunting, and see each point (Priority: P2)

A user reading a wide chart today has to look all the way to the left edge to find the value scale, and the line itself gives no indication of where each individual hour's/day's reading actually falls — only the connecting line is visible. Every chart that currently shows its value scale on only one edge now mirrors it on the opposite edge too, and every plotted line shows a visible marker at each of its actual data points.

**Why this priority**: Directly requested; a readability improvement to the existing graph view, valuable but not as foundational as the default-view and location-panel changes.

**Independent Test**: Open a chart that today shows a value scale on only the left edge (e.g. the wind or cloud-coverage chart); confirm the same scale now also appears on the right edge, and that each hour's/day's point on the line is individually visible, not just the connecting line.

**Acceptance Scenarios**:

1. **Given** a chart that shows its value scale on only the left edge today, **When** it renders, **Then** the same scale also appears mirrored on the right edge.
2. **Given** the temperature chart, which already shows two different scales (temperature on the left, precipitation on the right), **When** it renders, **Then** its existing two-scale layout is unchanged (it already satisfies having a scale on both edges).
3. **Given** any line series on any chart, **When** it renders, **Then** a visible marker appears at every one of its actual plotted points (each hour in the 24-hour view, each day in the 7-day/30-day views).
4. **Given** a line series that includes both observed and forecast segments, **When** its point markers render, **Then** observed and forecast markers remain visually distinguishable from each other, consistent with the line's existing solid/dashed distinction.

---

### User Story 6 - See the highest and lowest observed temperature at a glance (Priority: P3)

A user looking at the temperature chart today has to scan every point to find the warmest and coldest moments in the displayed window. A note identifies the single highest and single lowest temperature among the actually-observed (not forecast) points currently shown.

**Why this priority**: Directly requested; a helpful callout, but narrower in value than the structural and readability changes above.

**Independent Test**: Open the temperature chart for a window with a mix of observed values; confirm a note identifies the highest and lowest observed values and roughly when each occurred.

**Acceptance Scenarios**:

1. **Given** the temperature chart shows a window with observed data, **When** it renders, **Then** a note identifies the single highest observed temperature and when it occurred.
2. **Given** the same window, **When** the chart renders, **Then** a note identifies the single lowest observed temperature and when it occurred.
3. **Given** a window with forecast points that are higher or lower than any observed point, **When** the high/low note is computed, **Then** those forecast points are excluded — only observed points are considered.
4. **Given** a window with no observed data at all (e.g. an all-forecast window), **When** the chart renders, **Then** no high/low note is shown.

---

### Edge Cases

- The "Change location" panel (User Story 2) must remain usable at both mobile and laptop widths — this is the same panel at every screen size, not a different layout per breakpoint.
- Centering on "now" (User Story 3) only ever applies to the 24-hour view's hourly timeline, since the 7-day view's daily columns are typically few enough to fit without overflow; if a future window doesn't fit either, the same centering rule applies uniformly rather than being hardcoded to the 24-hour case.
- The data-source note (User Story 4) describes the primary selected location's source only — it does not attempt to enumerate the source of every nearby comparison station shown alongside it.
- The high/low note (User Story 6) applies to whatever window is currently displayed (24-hour, 7-day, or 30-day) — it is not limited to the 24-hour view.
- If two or more observed points tie for the highest (or lowest) temperature, the note names one of them (the first occurrence) rather than listing every tied point.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST show the Overview timeline as its initial view whenever a location has resolved, instead of the line-graph view.
- **FR-002**: The existing "Back to graph" control MUST continue to switch to the line-graph view from the Overview.
- **FR-003**: The header MUST present location switching as a single "Change location" control rather than always-visible separate search/favorites sections.
- **FR-004**: Activating "Change location" MUST open a panel containing the current-location option, the favorites list (with removal), and the search input together.
- **FR-005**: Selecting a location from the panel MUST switch the app to that location and close the panel.
- **FR-006**: Adding or removing a favorite from within the panel MUST NOT close the panel.
- **FR-007**: The panel MUST be dismissible without changing the currently-selected location.
- **FR-008**: The panel MUST visibly mark the currently-selected location within its contents.
- **FR-009**: The panel MUST be usable at both mobile and laptop viewport widths.
- **FR-010**: Whenever the 24-hour timeline's total column width exceeds its visible container width, the timeline MUST initially scroll so the "now" column is horizontally centered in the visible area.
- **FR-011**: When the timeline's columns fit entirely within the visible container, or when there is no "now" column (no observed/forecast boundary), no centering scroll adjustment MUST be applied.
- **FR-012**: The centering behavior in FR-010 MUST reapply whenever the timeline's underlying content changes on a fresh render (e.g. switching window or location), not just on the very first page load.
- **FR-013**: The app MUST display a visible note identifying the data source(s) for the currently displayed location, without requiring a hover or click, on both the graph and Overview views.
- **FR-014**: When observed and forecast data came from different sources, the note in FR-013 MUST reflect both sources.
- **FR-015**: Every chart that currently shows its value scale on only one edge MUST show that same scale mirrored on the opposite edge; charts that already show two distinct scales (temperature chart's temperature/precipitation) are unaffected.
- **FR-016**: Every plotted line series on every chart MUST show a visible marker at each of its actual data points, not only the connecting line.
- **FR-017**: Observed and forecast point markers on the same line MUST remain visually distinguishable from each other.
- **FR-018**: The temperature chart MUST show a note identifying the single highest observed temperature and its approximate time, for whatever window is currently displayed.
- **FR-019**: The temperature chart MUST show a note identifying the single lowest observed temperature and its approximate time, for whatever window is currently displayed.
- **FR-020**: The high/low note in FR-018/FR-019 MUST only consider observed (non-forecast) points, and MUST NOT appear when the currently displayed window has no observed points.

### Key Entities

- **Location Panel**: The consolidated current-location/favorites/search control, replacing the header's previously-separate always-visible sections.
- **Data Source Note**: A short, always-visible statement of which provider(s) supplied the currently displayed location's observed and forecast data.
- **Observed High/Low Note**: A callout identifying the single highest and single lowest observed (non-forecast) temperature reading in the currently displayed window, with its approximate time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user opening the app with a resolvable location sees the Overview timeline, not the graph, on 100% of fresh loads.
- **SC-002**: On a laptop-width viewport, the vertical/horizontal space consumed by location-switching controls in the header is reduced compared to today's three-section layout, verified by inspecting the header's rendered footprint before and after.
- **SC-003**: On a narrow viewport with an overflowing 24-hour timeline, the "now" column is visible without any scrolling on 100% of fresh Overview renders that have a forecast boundary.
- **SC-004**: 100% of charts that showed a value scale on only one edge before this feature now show it on both edges.
- **SC-005**: 100% of a chart's actual data points have a visible marker, verified by inspecting a chart with a small, known number of points.
- **SC-006**: A user can state the data source and the window's highest/lowest observed temperature within 5 seconds of looking at the temperature chart, in a usability spot-check.

## Assumptions

- "On mobile, center on now" is implemented as a width-driven behavior (the timeline actually overflows its container) rather than device-type detection, since the same underlying condition (content wider than viewport) is what causes the problem on any narrow window, not strictly phones.
- The data-source note's exact wording (e.g. "Data: SMHI" vs. a longer sentence) is left as an implementation detail — the requirement is that a source is visibly stated, not a specific phrasing.
- "Dot's for each hour" is interpreted as applying to every chart's data points at whatever granularity that chart already plots (hourly in the 24-hour view, daily in the 7-day/30-day views) — not limited to literally hour-level charts only.
- The high/low note (User Story 6) is a single-point callout distinct from the existing toggleable High/Low lines feature (003-extended-history-metrics) already present in the 7-day/30-day temperature and wind charts — both can coexist; this feature does not remove or change that existing toggle.
- The "Change location" panel's exact presentation (e.g. a slide-out drawer vs. a centered modal) is an implementation detail left open by the clarification answer ("a separate slide-out side panel or modal") — either is acceptable as long as it consolidates the three sections behind one control and meets FR-004–FR-009.
