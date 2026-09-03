# Feature Specification: Dashboard Usability Fixes

**Feature Branch**: `014-dashboard-usability-fixes`

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "The 7d view doesn't scale so good on the right side on large screens, alot of empty screens. How to improve it? frame? 24h scales good. Maybe add the forecast in 7d view a little more detail the first 2 days, like morning, lunch, afternoon, evening, night? Change location, need to add to favorites befores able to view the results. Filter locations to Sweden in the dashboard? Or at least preferred them for Nordic. Possible to have an option to merge multiple sources of weather forecast and have it on the the avg on the line? also see the others in different series? Just for forecast. The high/low doesn't work on the overview. Nearbo stations is not needed for overview, maybe hide that option? Change location, if declined permissions, no option to choose current location again?"

## Clarifications

### Session 2026-09-03

- Q: How should the app handle preferring Sweden/Nordic locations in search results? → A: Soft preference — Nordic/Swedish results are shown first, but places anywhere in the world remain searchable and selectable.
- Q: How should combining multiple forecast sources into an averaged line work? → A: A single "Combine forecast sources" control that, when on, adds an averaged forecast line and shows each individual source as its own line at the same time.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View a searched place without saving it first (Priority: P1)

A user searching for a place today can only "Add to favorites" — there's no way to see that place's weather without first saving it permanently to their favorites list. Search results now offer a direct way to view a place's weather immediately, with saving it as a favorite remaining a separate, optional action.

**Why this priority**: A basic usability blocker — searching for a place is the primary way a new user finds a location, and today it dead-ends into a save step nobody asked for.

**Independent Test**: Search for a place that isn't already a favorite; confirm it can be viewed immediately without first adding it to favorites, and that adding it to favorites (if desired) remains available as a separate action.

**Acceptance Scenarios**:

1. **Given** a user has typed a search query with results, **When** they choose to view one of the results, **Then** the app switches to that location's weather without requiring it to be added to favorites first.
2. **Given** a viewed search result that was not added as a favorite, **When** the user looks at their favorites list, **Then** it is unchanged — viewing a place does not implicitly save it.
3. **Given** a search result the user does want to keep, **When** they choose to add it to favorites, **Then** it's saved exactly as it works today, independent of viewing it.

---

### User Story 2 - Regain access to "current location" after declining permission (Priority: P1)

A user who declines the browser's location-permission prompt today permanently loses the ability to select "current location" from within the app — the option simply never appears again unless they manually fix permissions outside the app and reload. The current-location option remains available (or offers a way to retry) so a change of mind doesn't require leaving the app.

**Why this priority**: A trap state — once declined, the app offers no in-app recovery path, which is a basic usability blocker.

**Independent Test**: Deny the location permission prompt; confirm the app still offers a way to request current location again, and that granting it on a retry successfully shows that location's weather.

**Acceptance Scenarios**:

1. **Given** the user has declined the location permission prompt, **When** they look at the location controls, **Then** an option to (re)try using their current location is still available.
2. **Given** the user selects that retry option, **When** the browser's permission prompt reappears (or the browser otherwise re-evaluates the permission), **Then** the app behaves the same as a first-time request — showing the location's weather if granted, or the existing unavailable-location messaging if declined again.

---

### User Story 3 - The 7-day timeline fills the screen on wide displays (Priority: P2)

A user viewing the 7-day Overview on a large laptop screen today sees only seven narrow columns hugging the left edge, with a large empty area to the right — unlike the 24-hour view, which already fills the available width (and scrolls when it doesn't fit). The 7-day view's columns now expand to use the available width when they fit without needing to scroll, matching the 24-hour view's already-good use of space.

**Why this priority**: Directly requested; a visible, easily-reproduced layout defect on the view most likely to be seen on a desktop/laptop screen.

**Independent Test**: Open the 7-day Overview on a wide viewport; confirm the seven day-columns stretch to use the available width rather than leaving a large empty area, while still scrolling normally on a narrow viewport where they don't fit.

**Acceptance Scenarios**:

1. **Given** the 7-day Overview is opened on a viewport wide enough to fit all seven columns comfortably, **When** it renders, **Then** the columns expand to fill the available width rather than leaving a large empty area to their right.
2. **Given** the 7-day Overview is opened on a viewport too narrow to fit all seven columns at a legible width, **When** it renders, **Then** it behaves as it does today (horizontally scrollable), unaffected by this change.
3. **Given** the 24-hour Overview, **When** it renders at any viewport width, **Then** its existing fill/scroll behavior is unchanged by this feature.

---

### User Story 4 - The high/low toggle also affects the Overview (Priority: P2)

A user who turns on the "High/Low" display today sees high/low temperature lines appear on the classic graph view, but the Overview's temperature row shows no such effect at all — the shared, app-wide toggle silently does nothing there. The Overview's temperature row now responds to the same toggle, showing the day's high and low alongside (or instead of) the plain average when it's on, for the 7-day view where day-level high/low data already exists.

**Why this priority**: Directly requested; a functional gap where an existing, already-visible control appears to do nothing on one of the app's two main views.

**Independent Test**: Turn on High/Low, open the 7-day Overview; confirm the temperature row now reflects each day's high and low, not just a flat average. Turn it off; confirm the row returns to its current single-average display.

**Acceptance Scenarios**:

1. **Given** the High/Low toggle is on, **When** the 7-day Overview's temperature row renders, **Then** each day's high and low temperature are both visible, not just the average.
2. **Given** the High/Low toggle is off, **When** the 7-day Overview's temperature row renders, **Then** it looks exactly as it does today (unaffected by this feature).
3. **Given** the 24-hour Overview (which has no day-level high/low concept), **When** the toggle is switched, **Then** its temperature row is unaffected either way.

---

### User Story 5 - The nearby-stations control is hidden on the Overview (Priority: P2)

A user on the Overview today still sees the header's "Nearby stations" count control, even though the Overview never displays nearby-station comparisons — the control has no effect there. The control is hidden while the Overview is the active view, and reappears when the user switches to the graph, where it remains meaningful.

**Why this priority**: Directly requested; removes a control that does nothing on the view where it's shown, reducing header clutter.

**Independent Test**: Open the Overview; confirm the "Nearby stations" control is not shown. Switch to the graph view; confirm it reappears and still works as it does today.

**Acceptance Scenarios**:

1. **Given** the Overview is the active view, **When** the header renders, **Then** the "Nearby stations" control is not shown.
2. **Given** the user switches to the graph view, **When** the header renders, **Then** the "Nearby stations" control reappears and behaves exactly as it does today.

---

### User Story 6 - Swedish and Nordic places are easier to find (Priority: P3)

A user searching for a common place name today gets results from anywhere in the world in no particular order, even though most of this app's users and its best data coverage (SMHI) are in Sweden. Search results now show Swedish and other Nordic places first, while results from anywhere else in the world remain fully searchable and selectable exactly as they are today.

**Why this priority**: A quality-of-life improvement for the app's primary audience; doesn't block any existing capability, but lower priority than the fixes/gaps above.

**Independent Test**: Search for a place name that exists both in a Nordic country and elsewhere in the world; confirm the Nordic result(s) appear first in the list, while the non-Nordic result(s) are still present and selectable.

**Acceptance Scenarios**:

1. **Given** search results include both Nordic and non-Nordic places, **When** the results are shown, **Then** Nordic places appear before non-Nordic ones.
2. **Given** search results include only non-Nordic places, **When** they are shown, **Then** they still appear (nothing is hidden or excluded), unchanged from today's behavior.

---

### User Story 7 - Combine multiple forecast sources into one averaged line (Priority: P3)

A user comparing forecasts today only ever sees a single provider's forecast for a location, even when more than one source has forecast data available for it. A "combine forecast sources" option adds an averaged forecast line built from every available source, while also showing each individual source's own forecast as its own separate line — so a user can see both the consensus and how much the sources disagree, for forecast data only (observed/historical data is unaffected).

**Why this priority**: A novel, higher-effort capability requested as a "possible" addition; valuable but the least foundational of the asks in this feature.

**Independent Test**: Open a location where more than one forecast source has data; turn on "combine forecast sources"; confirm an averaged forecast line appears alongside each individual source's own forecast line, and confirm observed (historical) data is unaffected by the option.

**Acceptance Scenarios**:

1. **Given** a location where more than one forecast source has data, **When** "combine forecast sources" is turned on, **Then** an averaged forecast line appears, computed from all available sources' forecast values.
2. **Given** the same situation, **When** the option is on, **Then** each individual source's own forecast line is also visible as its own distinct series.
3. **Given** a location where only one forecast source has data, **When** the option is turned on, **Then** the display is unaffected (there is nothing to average or compare) — no error, no misleading single-source "average."
4. **Given** the option is on, **When** observed (historical) data is displayed, **Then** it is unaffected — the option only changes how forecast data is shown.
5. **Given** the option is off, **When** any location's forecast renders, **Then** it looks exactly as it does today (a single source's forecast line).

---

### User Story 8 - More detail in the 7-day view for the next two days (Priority: P3)

A user looking at the 7-day Overview today sees one column per day for the entire week, even for the very next day or two, where the underlying forecast data is detailed enough to show more than a single daily figure. The first two days of the 7-day view now show a handful of sub-day periods (morning, lunch, afternoon, evening, night) instead of one column each, while the remaining days continue to show one column per day as they do today.

**Why this priority**: The user's own framing marks this as a tentative "maybe," and it's the most speculative/highest-effort item in this set — appropriately last.

**Independent Test**: Open the 7-day Overview; confirm the first two days each show multiple sub-day columns (morning/lunch/afternoon/evening/night) instead of a single daily column, while days 3–7 remain one column each.

**Acceptance Scenarios**:

1. **Given** the 7-day Overview, **When** it renders, **Then** the first two days are each broken into sub-day periods (morning, lunch, afternoon, evening, night) instead of a single column.
2. **Given** the same view, **When** days 3 through 7 render, **Then** each remains a single column per day, unchanged from today.
3. **Given** a sub-day period that falls in the past relative to "now" (for today's own remaining sub-day periods), **When** it renders, **Then** it's treated as observed data the same way today's existing hourly/daily observed-vs-forecast distinction already works.

---

### Edge Cases

- If a search result is viewed (User Story 1) without being added to favorites, and the user then reloads the app, the existing location-caching behavior (009/013) still applies — a viewed-but-not-favorited location is cached the same way any other explicit selection already is today.
- If the user denies location permission a second time after retrying (User Story 2), the app's existing "couldn't determine your current location" messaging is shown, same as the first denial — no new error state is introduced.
- On a viewport exactly at the boundary between "fits" and "needs scrolling" for the 7-day view (User Story 3), the view falls back to the scrollable behavior rather than an ambiguous partially-stretched state.
- If only one forecast source ever has data for a given location (User Story 7), the "combine forecast sources" option has no visible effect there (Acceptance Scenario 3) rather than showing a misleading single-line "average."
- The sub-day breakdown (User Story 8) only applies to the 7-day view; the 24-hour view's existing hourly columns are unaffected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A search result MUST be viewable (its weather shown) without first being added to favorites.
- **FR-002**: Viewing a search result MUST NOT implicitly add it to favorites.
- **FR-003**: Adding a search result to favorites MUST remain available as its own separate action, unchanged from today.
- **FR-004**: The app MUST offer a way to (re)request the current location after the user has previously declined the location permission prompt.
- **FR-005**: Retrying the current-location request MUST behave the same as an initial request (success shows the location; another decline shows the existing unavailable-location messaging).
- **FR-006**: The 7-day Overview's day-columns MUST expand to fill the available width when they fit without needing horizontal scrolling.
- **FR-007**: The 7-day Overview MUST remain horizontally scrollable, unaffected by FR-006, whenever its columns don't fit at a legible width.
- **FR-008**: The 24-hour Overview's existing fill/scroll behavior MUST be unaffected by FR-006/FR-007.
- **FR-009**: The Overview's temperature row MUST reflect the app-wide High/Low toggle: when on, the 7-day view's temperature row MUST show each day's high and low; when off, it MUST show its current single-average display.
- **FR-010**: The "Nearby stations" control MUST NOT be shown while the Overview is the active view.
- **FR-011**: The "Nearby stations" control MUST reappear and function as it does today when the graph view is active.
- **FR-012**: Place search results MUST show Nordic (Sweden, Norway, Denmark, Finland, Iceland) results before non-Nordic results, without excluding or hiding non-Nordic results.
- **FR-013**: A "combine forecast sources" option MUST be available wherever forecast data from more than one source can exist for a location.
- **FR-014**: When "combine forecast sources" is on, an averaged forecast line MUST be shown, computed from every available source's forecast values.
- **FR-015**: When "combine forecast sources" is on, each individual source's own forecast line MUST also be shown as its own distinct series.
- **FR-016**: The "combine forecast sources" option MUST only affect forecast data — observed/historical data display MUST be unaffected.
- **FR-017**: When only one forecast source has data for a location, turning on "combine forecast sources" MUST NOT change what's displayed there.
- **FR-018**: The 7-day Overview's first two days MUST each be broken into sub-day periods (morning, lunch, afternoon, evening, night) instead of a single daily column.
- **FR-019**: The 7-day Overview's remaining days (3 through 7) MUST continue to show one column per day, unaffected by FR-018.

### Key Entities

- **Search Result Selection**: A place returned from search, now distinguishable as either "viewed" (weather shown, not persisted) or "added to favorites" (persisted), where the two actions are independent.
- **Current-Location Retry**: The ability to re-invoke the browser's location-permission flow from within the app after a prior decline, rather than that capability being a one-time, first-load-only action.
- **Nordic Region**: The set of countries (Sweden, Norway, Denmark, Finland, Iceland) whose search results are ranked before non-Nordic results.
- **Combined Forecast Source**: A derived forecast series representing the average of all available individual sources' forecast values for a location, shown alongside each source's own series.
- **Sub-Day Period**: One of five fixed segments (morning, lunch, afternoon, evening, night) used to break the 7-day view's first two days into finer columns than the remaining days.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can view any freshly-searched place's weather within one action, without a required favoriting step, 100% of the time.
- **SC-002**: A user who has declined location permission once can still successfully view their current location's weather via an in-app retry, without needing to leave the app or adjust browser settings manually.
- **SC-003**: On a wide viewport, the 7-day Overview's columns visibly occupy the available width rather than leaving more than a small margin of empty space, verified by inspecting the rendered layout before and after this feature.
- **SC-004**: Toggling High/Low on the 7-day Overview changes what's displayed, matching the graph view's existing toggle behavior, 100% of the time.
- **SC-005**: The "Nearby stations" control is absent from the header on 100% of Overview renders and present on 100% of graph-view renders.
- **SC-006**: In a search returning both Nordic and non-Nordic matches, Nordic results are ranked first 100% of the time, with zero non-Nordic results excluded.
- **SC-007**: With "combine forecast sources" on and more than one source available, both the averaged line and every individual source's line are visible at the same time, 100% of the time.

## Assumptions

- "Add to favorites" is not being removed — Search results simply gain a separate way to be viewed directly; both actions coexist.
- "Current location" retry re-invokes the same browser permission-request flow already used on first load; this feature does not add a way to bypass the browser's own permission UI.
- The 7-day columns "filling available width" (User Story 3) is achieved by allowing the timeline's columns to stretch proportionally up to the container's width when they don't need to scroll, not by adding a decorative border/frame — "frame?" in the user's own phrasing was treated as one possible idea among others, and stretching to fill available space is the more direct fix for "a lot of empty space."
- The 7-day Overview's High/Load toggle (User Story 4) reuses the same day-level `high`/`low` figures already computed for the classic graph view's High/Low lines (003-extended-history-metrics) — no new data computation is introduced, only a new place that already-existing data is displayed.
- "Combine forecast sources" (User Story 7) is scoped to this app's two existing weather providers (SMHI and Open-Meteo) — no new data source is added by this feature.
- The sub-day period boundaries (User Story 8) — morning, lunch, afternoon, evening, night — use reasonable, fixed local-time boundaries (e.g., a common convention such as morning ~06:00-11:00, lunch ~11:00-13:00, afternoon ~13:00-17:00, evening ~17:00-21:00, night ~21:00-06:00); the exact boundary times are an implementation detail, not a user-facing configuration.
- Nordic-region ranking (User Story 6) is a sort-order change to existing search results, not a new geocoding data source — it relies on the country information already returned by the existing place-search lookup.
