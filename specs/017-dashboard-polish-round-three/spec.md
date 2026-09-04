# Feature Specification: Dashboard Polish Round Three

**Feature Branch**: `017-dashboard-polish-round-three`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "1. The ui on the 3d was really nice, implement same on 7d, seems to be missed. 2. The 24h doesn't scale the witdh, need to scroll? 3. The map is not possible to close. 4. The map missing the icons on the map itself, the weather icons. 5. The wind information, would be nice to have an arrow for direction above the m/s. 6. The combine data should be an avg, no need to have all details on the page. Print out all sources for it, is it only two sources does it exists more? 7. The combine button, could be just one button, green enabled, and grey off? or what is best practice for colors? Maybe align the same on high/low also? 8. Change location is not under the weather, can't see it. 9. Maybe redo the header so current location is nicer design of it?"

## Clarifications

### Session 2026-09-04

- Q: What specifically made the 3-day view's UI "nicer" that should be carried over to the 7-day view? → A: The day-boundary shadow marker — add it to the 7-day view too, even though every column there is already a full day.
- Q: How much weather detail should map pins show? → A: A current-conditions icon plus the current temperature next to each pin.
- Q: How far should the header redesign go for "Change location" visibility and current-location display? → A: Just fix the visibility bug — ensure "Change location" is reliably visible/reachable; no additional current-location label is in scope for this round.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The 24-hour Overview fills the screen like the other two (Priority: P1)

The 24-hour Overview is the app's default, most-viewed view, but unlike the 3-day and 7-day views it doesn't stretch to fill a wide screen — a user has to scroll horizontally even when there's ample empty space to the side. The 24-hour view now fills available width the same way the other two already do, only falling back to horizontal scrolling when it genuinely doesn't fit.

**Why this priority**: The most-used view in the app has the worst use of screen space; directly reported as a usability problem.

**Independent Test**: Open the 24-hour Overview on a wide viewport; confirm its columns stretch to use the available width rather than leaving empty space and forcing a scroll; confirm it still scrolls normally on a narrow viewport.

**Acceptance Scenarios**:

1. **Given** the 24-hour Overview on a viewport wide enough to fit all its columns comfortably, **When** it renders, **Then** the columns expand to fill the available width.
2. **Given** the 24-hour Overview on a viewport too narrow to fit all columns legibly, **When** it renders, **Then** it remains horizontally scrollable, unaffected by this change.

---

### User Story 2 - The map can be closed (Priority: P1)

A user who opens the map screen currently has no direct way back to the weather view they came from — the button that would normally take them there isn't shown while the map is active. The map screen now offers a clear, direct way to leave it and return to the weather view.

**Why this priority**: A navigational dead end — directly reported as broken.

**Independent Test**: Open the map screen; confirm a clear, visible action closes it and returns to the previously-viewed weather screen.

**Acceptance Scenarios**:

1. **Given** the map screen is open, **When** the user looks at the header, **Then** a clear way to leave the map and return to the weather view is visible.
2. **Given** that action, **When** selected, **Then** the app returns to showing weather for the currently-selected location (the same view it showed before the map was opened, or the Overview if none was active).

---

### User Story 3 - The averaged forecast stays simple, with sources disclosed (Priority: P1)

Turning on "Combine forecast sources" today prints every individual source's own reading inline on the Overview's temperature row, which is more detail than most users need at a glance. The Overview now shows just the averaged forecast value there, while still making it easy to see which sources were actually averaged together.

**Why this priority**: Directly reported as too cluttered; a usability regression in a just-shipped feature.

**Independent Test**: Turn on "Combine forecast sources," open the Overview; confirm forecast periods show a single averaged value (no per-source breakdown inline); confirm the names of the sources contributing to that average are visible somewhere on the page (e.g. near the toggle).

**Acceptance Scenarios**:

1. **Given** "Combine forecast sources" is on, **When** the Overview's temperature row renders a forecast period, **Then** it shows one averaged value, not a per-source breakdown.
2. **Given** the toggle is on, **When** the user looks near the toggle control, **Then** the names of every source currently contributing to the average are listed.
3. **Given** a location where only one source has data, **When** the toggle is on, **Then** behavior is unchanged from today (no averaging, no misleading single-source "average").

---

### User Story 4 - Map pins show current conditions (Priority: P2)

The map screen shows a pin for each favorited/recently-viewed location, but the pin gives no sense of the weather there without clicking through. Each pin now shows a small current-conditions icon and the current temperature alongside it.

**Why this priority**: Directly requested; makes the map screen genuinely useful for a quick multi-location glance, its whole reason for existing — but the map's core navigation (User Story 2) and the primary 24h view (User Story 1) matter more first.

**Independent Test**: Open the map screen with 2+ pinned locations; confirm each pin shows a weather condition icon and a temperature reading, reflecting that location's current conditions.

**Acceptance Scenarios**:

1. **Given** the map screen with one or more pins, **When** it finishes loading each pin's conditions, **Then** every pin shows a condition icon and a temperature.
2. **Given** a pin whose current-conditions data fails to load, **When** the map renders, **Then** that pin still appears (with its location name), without a fabricated icon or temperature, and without blocking the other pins from loading.
3. **Given** the map screen, **When** compared to today's behavior, **Then** selecting a pin still opens that location's full Overview exactly as before (this addition is a preview, not a replacement).

---

### User Story 5 - The 7-day view gets the same day-boundary marker as the 3-day view (Priority: P2)

The 3-day view's subtle day-boundary marker — a soft vertical shadow line separating one calendar day's columns from the next — never made it onto the 7-day view, even though it was intended to feel consistent across both. The 7-day view now shows the same marker between every pair of adjacent days.

**Why this priority**: Directly requested, a visual-consistency polish item — valuable but not blocking any capability.

**Independent Test**: Open the 7-day view; confirm the same day-boundary marker style used on the 3-day view appears between every pair of adjacent day columns.

**Acceptance Scenarios**:

1. **Given** the 7-day view, **When** it renders, **Then** a day-boundary marker, visually identical to the 3-day view's, appears between every pair of adjacent day columns.

---

### User Story 6 - A wind direction arrow above the speed reading (Priority: P3)

Wind direction information exists in the data but isn't positioned clearly relative to the speed reading it belongs to. The wind row now shows its directional arrow above the speed value, making the pairing between direction and speed immediately clear.

**Why this priority**: Directly requested, a small readability polish to an existing, already-shipped element.

**Independent Test**: Open a view with wind direction data; confirm the directional arrow appears above (not beside or below) its corresponding speed reading.

**Acceptance Scenarios**:

1. **Given** a wind reading with known direction data, **When** it renders, **Then** the directional arrow appears above the speed value in the same cell.
2. **Given** a wind reading with no direction data, **When** it renders, **Then** it shows the speed value alone, unaffected.

---

### User Story 7 - Consistent single-button toggle styling (Priority: P3)

The "High/Low" and "Combine forecast sources" controls are each currently two separate buttons (an "on" button and an "off" button) shown side by side. Each becomes a single button whose color clearly communicates whether it's currently on or off, styled consistently with each other.

**Why this priority**: Directly requested as a "maybe," a visual-consistency polish item with no functional change.

**Independent Test**: Open the app; confirm High/Low and Combine-forecast-sources are each a single button; confirm each button's color clearly and consistently indicates on vs. off state; confirm clicking toggles the state exactly as the two-button version did.

**Acceptance Scenarios**:

1. **Given** the header, **When** it renders, **Then** "High/Low" and "Combine forecast sources" are each shown as one button, not two.
2. **Given** either button, **When** its underlying preference is on, **Then** it's visually styled to clearly read as "on," and clearly different when off, using a consistent color convention between the two.
3. **Given** either button, **When** clicked, **Then** it toggles the preference exactly as the previous two-button version did — no change in what the toggle does, only how it's shown.

---

### User Story 8 - "Change location" is reliably visible (Priority: P1)

A user reports that the "Change location" control is currently hard to find or not visible. It's restored to being clearly, reliably visible in the header on every screen, regardless of viewport size or which other header controls are present.

**Why this priority**: A basic usability blocker — the primary way to switch locations must always be reachable.

**Independent Test**: On a range of viewport widths (including narrow/mobile) and on every screen the app offers, confirm "Change location" is visibly present and clickable in the header without any extra action.

**Acceptance Scenarios**:

1. **Given** any screen and a typical desktop viewport, **When** the header renders, **Then** "Change location" is visibly present, not overlapped or crowded out by other controls.
2. **Given** any screen and a narrow (mobile-width) viewport, **When** the header renders, **Then** "Change location" is still visibly present and directly clickable.

---

### Edge Cases

- If a location's forecast doesn't reach far enough for the 7-day day-boundary marker (User Story 5) to have a "next day" to mark, no marker is fabricated for a day that doesn't exist in the data.
- If the map (User Story 4) has many pins, current-conditions requests for all of them must not block the map from becoming interactive — pins can appear before their conditions finish loading, then update in place.
- The single-button toggle redesign (User Story 7) must remain clearly operable via keyboard and screen reader (a toggle's current state must be programmatically determinable, not conveyed by color alone).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The 24-hour Overview MUST fill available width on a viewport wide enough to fit its columns, matching the 3-day and 7-day views' existing behavior.
- **FR-002**: The 24-hour Overview MUST remain horizontally scrollable on a viewport too narrow to fit its columns legibly.
- **FR-003**: The map screen MUST offer a visible, direct action that closes it and returns to the previously-active weather view.
- **FR-004**: When "Combine forecast sources" is on, the Overview's temperature row MUST show a single averaged value per forecast period, not a per-source breakdown.
- **FR-005**: When "Combine forecast sources" is on, the names of every source currently contributing to the average MUST be visible near the toggle.
- **FR-006**: When only one source has data for a location, turning "Combine forecast sources" on MUST NOT change the Overview's display there.
- **FR-007**: Each map pin MUST show a current-conditions icon and current temperature once that location's data has loaded.
- **FR-008**: A map pin whose current-conditions data fails to load MUST still show its location, without a fabricated icon or temperature.
- **FR-009**: The 7-day view MUST show the same day-boundary marker style already used on the 3-day view, between every pair of adjacent days.
- **FR-010**: The wind row MUST show its directional arrow above the speed value when direction data is available.
- **FR-011**: "High/Low" and "Combine forecast sources" MUST each be presented as a single button whose color indicates on/off state, styled consistently with each other.
- **FR-012**: The single-button toggle redesign MUST preserve each control's existing toggle behavior and remain accessible (state determinable without relying on color alone).
- **FR-013**: "Change location" MUST be visibly present and directly clickable in the header on every screen, at both typical desktop and narrow (mobile) viewport widths.

### Key Entities

- **Map Pin Conditions**: A pin's current weather condition (icon) and current temperature, fetched independently per pinned location, shown once available and never blocking other pins.
- **Combined Source List**: The set of source names currently contributing to the Overview's averaged forecast, shown near the "Combine forecast sources" toggle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a wide viewport, the 24-hour Overview's columns visibly occupy the available width rather than leaving empty space, matching the 3-day/7-day views.
- **SC-002**: A user can leave the map screen and return to the weather view in one action, 100% of the time.
- **SC-003**: With "Combine forecast sources" on, the Overview's temperature row shows exactly one value per forecast period, and the contributing source names are visible near the toggle, 100% of the time.
- **SC-004**: Every map pin with successfully-loaded conditions shows both an icon and a temperature; a pin whose conditions fail to load still shows its location name.
- **SC-005**: The 7-day view's day-boundary marker is visually indistinguishable in style from the 3-day view's own marker.
- **SC-006**: "Change location" is visible and clickable on 100% of screens, at both desktop and mobile viewport widths, verified by inspection.

## Assumptions

- User Story 1 (24h fill-width) reuses the exact same fill-width mechanism already applied to the 3-day and 7-day views, extended to the 24-hour view — no new layout approach is introduced.
- User Story 2 (map close) restores/adds a "Details"-equivalent (or "Back") action to the header while the map view is active, consistent with how every other non-Overview view already gets back to the weather.
- User Story 3 (averaged-only Overview) applies to the Overview's timeline specifically; the classic graph view's existing per-source comparison lines (chart-based, not dense inline text) are unaffected — a chart is a more appropriate place for multi-series comparison than a compact timeline cell.
- User Story 4 (map pin conditions) fetches only current conditions (not a full forecast) per pin, keeping the map screen's own data needs minimal, consistent with its "quick glance" purpose.
- User Story 7's color convention (green for "on") is a reasonable default the user themselves suggested; exact shades are an implementation detail, not user-facing configuration.
- The app currently integrates exactly two forecast sources (SMHI and Open-Meteo) — no third source exists today; the "Combined Source List" (User Story 3) will show one or both of these two names depending on data availability, not a fixed count.
