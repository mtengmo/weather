# Feature Specification: Dashboard Visual Redesign

**Feature Branch**: `018-dashboard-visual-redesign`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Could you do the UI like this?" — accompanied by a mockup image of a redesigned weather dashboard: a consolidated header (location with a switcher, current conditions inline, a "Display" settings entry point, a "Forecast sources" selector, Map and Details actions), a timeline table with explicit OBSERVED/FORECAST section headers and a "NOW" marker, weather-metric rows with their own labeled left column, a "Today" summary card, a "7 Day Forecast" strip of compact day cards, and a footer showing the data sources and last-updated time.

## Clarifications

### Session 2026-09-04

- Q: Should this redesign be implemented as one cohesive release or broken into independently-shippable pieces? → A: One cohesive redesign — the pieces are meant to work together as a single new look.
- Q: Does the mockup's single "Display" header button mean consolidating today's separate Theme/Unit/High-Low buttons into one menu? → A: Yes — Theme, units, and High/Low move into a single "Display" menu; "Forecast sources" gets its own separate selector since it's about data, not display.
- Q: Should the new "Today" summary card and "7 Day Forecast" strip always be visible, or only on the 24-hour tab as depicted? → A: Always visible, regardless of which of the three time-window tabs is active.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A consolidated, at-a-glance header (Priority: P1)

Today's header spreads current-location display, theme, units, and toggles across several always-visible buttons and a separate page heading. The header now shows, in one row: the current location (with a way to switch it), the current temperature and condition with a "feels like" reading, a single "Display" entry point for theme/units/High-Low, a "Forecast sources" selector, and the existing Map and Details actions.

**Why this priority**: The header is the first thing on every screen; consolidating it is the foundation the rest of the redesign builds on.

**Independent Test**: Open the app; confirm the header shows the current location, temperature, condition, and "feels like" reading together; confirm "Display" opens a menu containing theme, units, and High/Low; confirm "Forecast sources" is its own selector; confirm Map and Details remain reachable.

**Acceptance Scenarios**:

1. **Given** a selected location, **When** the header renders, **Then** it shows that location's name, current temperature, current condition, and "feels like" reading together in one row.
2. **Given** the location name, **When** the user interacts with it, **Then** it offers a way to switch to a different location (the same capability "Change location" provides today).
3. **Given** the "Display" control, **When** opened, **Then** it contains the theme picker, unit toggle, and High/Low toggle, each still independently changeable.
4. **Given** the "Forecast sources" control, **When** opened, **Then** it offers a choice of which forecast source(s) to show, including a combined option.
5. **Given** the header, **When** it renders, **Then** "Map" and "Details" remain present and function exactly as they do today.

---

### User Story 2 - The timeline table shows clear observed/forecast sections (Priority: P1)

Today's timeline distinguishes observed from forecast columns only through a single vertical "Now" line. The timeline now labels the observed and forecast portions with their own section headers above the hour/day columns, and marks the boundary between them with a clearly-styled "Now" marker.

**Why this priority**: A structural, high-visibility change to the app's core view — the main thing users look at.

**Independent Test**: Open a view with both observed and forecast data; confirm an "Observed" label spans the observed columns and a "Forecast" label spans the forecast columns; confirm the boundary between them is marked distinctly.

**Acceptance Scenarios**:

1. **Given** a timeline with both observed and forecast columns, **When** it renders, **Then** a section label spans the observed columns and a separate section label spans the forecast columns.
2. **Given** a timeline with no forecast data at all, **When** it renders, **Then** only the observed section label appears (no empty "Forecast" section is fabricated).
3. **Given** the boundary between observed and forecast, **When** it renders, **Then** it is visually distinct from an ordinary column division.

---

### User Story 3 - Each timeline row keeps its label and units in view (Priority: P1)

Today, each metric row's label sits inline as its own row above the row's values. Each row's label (and its unit, and any sub-label like "Probability" or "Gusts") now stays in a fixed column to the left of that row's data, so it's still identifiable even while scrolling horizontally through the columns.

**Why this priority**: Directly shown in the mockup as core to the new look, and meaningfully improves usability on a horizontally-scrolling timeline.

**Independent Test**: Open a view whose timeline is wide enough to scroll; confirm each row's label stays visible in a left-hand column while the row's data columns scroll past it.

**Acceptance Scenarios**:

1. **Given** a timeline row (e.g. Wind), **When** the timeline is scrolled horizontally, **Then** that row's label and unit stay visible in a fixed left column.
2. **Given** a row with a secondary sub-label (e.g. Rain's "Probability," Wind's "Gusts"), **When** it renders, **Then** the sub-label is shown alongside the primary label in that same fixed column.

---

### User Story 4 - A "Today" summary card (Priority: P2)

A new summary card shows, at a glance, today's high/low temperature, a short description, today's total rain, average wind with direction, and sunrise/sunset — without needing to read the detailed timeline. It's shown on all three time-window tabs.

**Why this priority**: A genuinely new capability shown prominently in the mockup, valuable but additive — the redesigned header and timeline (User Stories 1-3) are more foundational.

**Independent Test**: Open any of the three time-window tabs; confirm a "Today" card is visible showing high/low, a short description, total rain, average wind with direction, and sunrise/sunset for today.

**Acceptance Scenarios**:

1. **Given** any time-window tab, **When** it renders, **Then** the "Today" card is visible with today's high/low, a short description, total rain, wind, and sunrise/sunset.
2. **Given** today's data is incomplete (e.g. still mid-day, some values not yet knowable), **When** the card renders, **Then** it shows what's available and a gap indicator for what isn't, never a fabricated value.

---

### User Story 5 - A 7-day forecast strip (Priority: P2)

A compact strip of day-cards — one per day for the next 7 days, each showing a condition icon and high/low temperature — gives a quick outlook beyond the detailed timeline. It's shown on all three time-window tabs, independent of which window the detailed timeline itself is currently showing.

**Why this priority**: Complements the Today card as an at-a-glance addition; same priority tier, slightly more implementation surface (7 days of data rather than 1).

**Independent Test**: Open any of the three time-window tabs; confirm a 7-day strip is visible with one card per day, each showing an icon and high/low.

**Acceptance Scenarios**:

1. **Given** any time-window tab, **When** it renders, **Then** a 7-day forecast strip is visible with one card per day, each showing a condition icon and high/low temperature.
2. **Given** a location whose forecast doesn't reach a full 7 days out, **When** the strip renders, **Then** it shows only the days actual data supports, never a fabricated day.

---

### User Story 6 - A footer that discloses data sources and freshness (Priority: P3)

The footer now shows which weather data sources are in use (e.g. "SMHI observations · Open-Meteo forecast") and when the data was last updated, alongside the existing version and privacy link.

**Why this priority**: A visibility/trust polish item, lowest-impact of this set.

**Independent Test**: Open any screen; confirm the footer shows the active data source(s) and a last-updated time, alongside the existing version and privacy link.

**Acceptance Scenarios**:

1. **Given** any screen with a selected location, **When** the footer renders, **Then** it shows the data source(s) currently in use and when the data was last refreshed.
2. **Given** no location is selected yet, **When** the footer renders, **Then** it omits the source/freshness text rather than showing a placeholder.

---

### Edge Cases

- If a metric row has no data at all for the current view (e.g. no wind data available), it continues to behave as it does today (existing row-omission/gap rules), just within the new fixed-label-column layout.
- The fixed row-label column (User Story 3) must not itself scroll away — only the data columns scroll.
- The observed/forecast section labels (User Story 2) must stay correct when switching between the 24-hour, 3-day, and 7-day tabs, each of which can have a different observed/forecast split.
- The Today card and 7-day strip (User Stories 4-5) must not require an additional location-changing data fetch beyond what the app already fetches for the active time window.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The header MUST show the current location's name, current temperature, current condition, and "feels like" reading together.
- **FR-002**: The location name MUST offer a way to switch to a different location, equivalent to today's "Change location."
- **FR-003**: The header MUST offer a single "Display" control containing the theme picker, unit toggle, and High/Low toggle.
- **FR-004**: The header MUST offer a "Forecast sources" control for choosing which forecast source(s) to show, including a combined option.
- **FR-005**: The header MUST keep "Map" and "Details" present and functionally unchanged.
- **FR-006**: The timeline MUST show a section label spanning its observed columns and a separate section label spanning its forecast columns, when both exist.
- **FR-007**: The timeline MUST NOT show a forecast section label when a view has no forecast data.
- **FR-008**: The boundary between observed and forecast columns MUST be visually distinct from an ordinary column division.
- **FR-009**: Each timeline row's label (and unit and any sub-label) MUST remain visible in a fixed left-hand column while that row's data columns scroll horizontally.
- **FR-010**: The app MUST show a "Today" summary card (high/low, short description, total rain, wind with direction, sunrise/sunset) on all three time-window tabs.
- **FR-011**: The app MUST show a 7-day forecast strip (one card per day, icon + high/low) on all three time-window tabs, independent of the detailed timeline's own active window.
- **FR-012**: The 7-day forecast strip MUST show only as many days as the location's forecast data actually supports.
- **FR-013**: The footer MUST show the active data source(s) and last-updated time when a location is selected, and omit them otherwise.

### Key Entities

- **Observed/Forecast Section**: A labeled group of adjacent timeline columns sharing the same observed-or-forecast status.
- **Today Summary**: A derived, at-a-glance view of the current day's high/low, description, total rain, wind, and sunrise/sunset.
- **Day Forecast Card**: One day's condition icon and high/low temperature, as shown in the 7-day forecast strip.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can read the current location, temperature, condition, and "feels like" reading without any interaction, on every screen with a selected location.
- **SC-002**: A user can identify which timeline columns are observed vs. forecast without reading any individual column's own label, verified by inspecting the rendered section headers.
- **SC-003**: A user can identify which metric a row of data belongs to at any horizontal scroll position, 100% of the time.
- **SC-004**: The Today card and 7-day strip are visible on all three time-window tabs, verified by switching between them.
- **SC-005**: The footer discloses both data source and freshness whenever a location is selected.

## Assumptions

- This redesign ships as one cohesive release (per clarification) — the header, timeline, summary cards, and footer changes are designed to be released together, not incrementally.
- "Forecast sources" (User Story 1, FR-004) supersedes the single on/off "Combine forecast sources" control from an earlier round with a proper source-selection control (e.g. a specific source, or "Combined") — the underlying combined-average behavior itself is unchanged, only how it's chosen.
- The "Display" menu (User Story 1, FR-003) is a new consolidated control; it does not remove any existing preference, only changes where each one is accessed from.
- The Today card and 7-day strip (User Stories 4-5) reuse data the app already fetches for the currently-selected location and active time window wherever possible; a 7-day forecast is already available whenever the 3-day or 7-day tab has been used, and is fetched for the 7-day strip even while the 24-hour tab is active, mirroring the app's existing "no window-specific value beyond what's fetched" convention.
- Exact colors, spacing, and typography from the mockup are a visual reference, not a pixel-exact specification — the app's existing three themes (Midnight/Bright/Glass) continue to apply to this redesigned layout rather than introducing a fourth, fixed look.
