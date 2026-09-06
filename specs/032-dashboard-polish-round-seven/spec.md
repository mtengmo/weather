# Feature Specification: Dashboard Polish, Round Seven

**Feature Branch**: `032-dashboard-polish-round-seven`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: a batch of feedback items from live use — (2) the current-location
name shows a raw weather-station name instead of a place name; (3) the map's precipitation
overlay doesn't read as real radar and should be replaced with actual radar imagery; (4) the
"Back" button should be renamed "Home" and always return to the same place everywhere it
appears; (5) the weather-warning banner should be dismissible per-browser so a read warning
doesn't keep reappearing; (6) the weather icon should reflect precipitation intensity (light vs.
heavy rain/snow), not just its type; (7) the rain chart should split into two aligned rows (a
plain bar row and a value/probability row) instead of one row with labels on the bars; (8) the
inline temperature chart should get a real, sticky degree scale with gridlines. (Items 1 — the
meaning of the "Rain" total — was answered directly as already-intentional behavior, not a
change.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See real radar imagery on the map, not a forecast approximation (Priority: P1)

A user opens the Map view wanting to see actual weather radar — where precipitation really is
right now, not a forecast estimate — the same way any mainstream weather app shows it.

**Why this priority**: The map's current forecast-circle overlay was explicitly called out as not
meeting this need ("doesn't work... still the old one") — this replaces it with the real thing
now that a usable source has been found.

**Independent Test**: Open the Map view; a genuine radar imagery layer is visible over the map,
showing real precipitation coverage, distinct from a plain forecast estimate.

**Acceptance Scenarios**:

1. **Given** the Map view is open, **When** it finishes loading, **Then** a radar imagery layer
   is visible over the base map, showing actual current precipitation coverage.
2. **Given** the radar layer is showing, **When** the user looks at an area with no precipitation
   on radar, **Then** that area shows no radar coloring — the layer never implies precipitation
   that isn't actually there.
3. **Given** the radar layer is showing, **When** the user pans/zooms or clicks a location pin,
   **Then** every existing map interaction continues to work exactly as before.
4. **Given** the radar data can't be loaded, **When** the Map view renders, **Then** the base map
   and pins still work normally, simply without the radar layer.

---

### User Story 2 - See a place I recognize as my current location (Priority: P1)

A user granting location access wants to see a name they recognize (a town/city name), not an
internal weather-station identifier.

**Why this priority**: A confusing, technical-looking label undermines trust in the app for
every single session that starts from current location — a frequent, high-visibility case.

**Independent Test**: Grant current-location access somewhere with both a nearby named place and
a nearby weather station whose own name differs from that place; the header shows the place
name, not the station's raw name.

**Acceptance Scenarios**:

1. **Given** the user's current position resolves successfully, **When** the location's display
   name is determined, **Then** a human-recognizable place name is shown in preference to a raw
   weather-station name.
2. **Given** no place name can be resolved for the current position, **When** the location is
   displayed, **Then** the app falls back to its next-best available name (e.g. the nearest
   station) rather than showing nothing.

---

### User Story 3 - "Home" behaves the same, everywhere, under a name that makes sense (Priority: P2)

A user navigating away from the Overview (into Details, the graph, or the Map) wants one
predictable way back to the app's main screen, labeled for what it actually does.

**Why this priority**: A small, low-risk consistency fix — today the same-looking button is
labeled "Back" but doesn't always do the same thing depending on which screen it's on.

**Independent Test**: From Details, the graph, and the Map, the same "Home" control is present
and always returns to the Overview, regardless of which screen was visited immediately before.

**Acceptance Scenarios**:

1. **Given** the user is on the Details, graph, or Map view, **When** they look for a way back,
   **Then** they find a control labeled "Home" (not "Back").
2. **Given** the user reached the Map view from the Details or graph view (not the Overview),
   **When** they use "Home," **Then** they land on the Overview — the same destination "Home"
   already gives from every other screen.

---

### User Story 4 - Dismiss a warning I've already read (Priority: P2)

A user who has read an active weather warning doesn't want it to keep appearing every time they
reopen the app, for as long as that same warning stays active.

**Why this priority**: Directly requested, quality-of-life improvement that doesn't compromise
the banner's safety purpose (a genuinely new or changed warning must still be seen).

**Independent Test**: Dismiss an active warning; reload the app while it's still active; the
dismissed warning stays hidden. A different (new) warning still appears normally.

**Acceptance Scenarios**:

1. **Given** an active warning is showing, **When** the user dismisses it, **Then** it no longer
   appears for that same warning, on that same browser, even after a page reload.
2. **Given** a warning was dismissed, **When** that specific warning is later withdrawn and a
   genuinely different warning becomes active, **Then** the new warning appears normally — a
   past dismissal never hides a warning the user hasn't actually seen.
3. **Given** a user has never dismissed anything, **When** an active warning exists, **Then** it
   appears exactly as it does today — this is opt-in-by-action, not a change to the default.

---

### User Story 5 - Understand what's actually forecast, not just that it's rainy or snowy (Priority: P3)

A user glancing at a weather icon wants a sense of *how much* rain or snow to expect, not just
that precipitation is expected at all.

**Why this priority**: A real gap confirmed during investigation, but a refinement of an existing
feature rather than new capability — lower urgency than the items above.

**Independent Test**: Compare a lightly-rainy period against a heavily-rainy one; their icons/
labels are visibly distinguishable. Same for light vs. heavy snow.

**Acceptance Scenarios**:

1. **Given** a period's forecast/observed precipitation is light rain, **When** its icon renders,
   **Then** it's visually distinguishable from a heavy-rain period's icon.
2. **Given** a period's forecast/observed precipitation is light snow vs. heavy snow, **When**
   their icons render, **Then** they are visibly distinguishable from each other the same way.
3. **Given** a thunderstorm period, **When** its icon renders, **Then** it remains distinctly a
   thunderstorm icon, unaffected by this change (already distinct today).

---

### User Story 6 - Read the rain chart's bars and numbers without them overlapping (Priority: P3)

A user reading the precipitation chart wants the bar heights and their mm/probability values to
be easy to read together, without text crowding the bars.

**Why this priority**: A readability/layout refinement to an already-shipped chart — cosmetic,
not a data-correctness issue.

**Independent Test**: View the precipitation chart; the bars render in their own row with no text
on them, and a second row directly below shows each column's mm value and rain-chance percentage,
aligned under its own bar.

**Acceptance Scenarios**:

1. **Given** the precipitation chart is showing, **When** the user looks at it, **Then** the bar
   row contains only bars — no mm/percentage text drawn on or over any bar.
2. **Given** the precipitation chart is showing, **When** the user reads the row below the bars,
   **Then** each column's mm value and chance-of-rain percentage sits directly under that
   column's own bar, aligned the same way for every column.

---

### User Story 7 - Read the temperature chart against a real degree scale (Priority: P3)

A user reading the inline temperature chart wants a fixed reference scale (gridlines at regular
degree intervals) so they can judge actual temperatures at a glance, not just relative ups and
downs.

**Why this priority**: A readability enhancement to an already-shipped chart, not a
data-correctness fix — the chart already conveys the right shape, this makes it easier to read
precisely.

**Independent Test**: View the temperature chart; a degree scale is visible on its left edge,
staying in view while the chart scrolls horizontally, with light horizontal guide lines across
the chart at each labeled degree interval.

**Acceptance Scenarios**:

1. **Given** the temperature chart is showing, **When** the user scrolls it horizontally, **Then**
   a degree scale stays visible on the left edge the whole time, the same way the row's own title
   already does.
2. **Given** the degree scale is showing, **When** the user reads it, **Then** it's labeled at a
   regular, easy-to-scan interval (about every 5 degrees).
3. **Given** the degree scale is showing, **When** the user looks across the chart, **Then** a
   faint horizontal guide line marks each labeled degree level, so a data point's approximate
   value can be read without hovering over it.

---

### Edge Cases

- What happens when the Map view's radar layer has no coverage over a viewed area (radar imagery
  is typically strongest over populated regions)? The base map and pins still render normally;
  the radar layer simply shows nothing there, never a fabricated color.
- What happens if a user clears their browser data? Dismissed warnings (US4) return to showing,
  the same as any other browser-local preference in this app (favorites, theme, units) already
  behaves.
- What happens to a period whose precipitation is exactly at the boundary between light and heavy
  (US5)? A single, consistent threshold decides which side it falls on — no specific value is
  prescribed by this spec (a planning-phase detail).
- What happens on the 3-day/7-day precipitation charts (aggregated periods), not just the 24-hour
  view, for the two-row split (US6)? The same two-row treatment applies at every resolution the
  precipitation chart already renders at — this is a layout change to the existing row, not a
  new one scoped to a single view.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Map view MUST show a real radar imagery layer depicting actual current
  precipitation, replacing the forecast-circle overlay shipped previously.
- **FR-002**: The radar layer MUST show no coloring over an area with no radar-detected
  precipitation.
- **FR-003**: The radar layer MUST NOT change or interfere with existing map pin
  selection/navigation behavior.
- **FR-004**: A failure to load radar imagery MUST NOT prevent the map's existing pins and
  navigation from working.
- **FR-005**: When the user's current position resolves, the system MUST prefer a
  human-recognizable place name for its display name over a raw weather-station name, falling
  back to the station name (or another available identifier) only when no place name can be
  resolved.
- **FR-006**: Every "return to the main screen" control across Details, the graph, and the Map
  views MUST be labeled "Home" (not "Back").
- **FR-007**: Every "Home" control MUST return the user to the Overview, regardless of which
  screen was active immediately before the current one.
- **FR-008**: The system MUST let a user dismiss an individual active weather warning, after
  which that specific warning no longer appears in that browser for as long as it remains the
  same warning.
- **FR-009**: A dismissal MUST be scoped to the specific warning dismissed — it MUST NOT hide a
  different or subsequently-changed warning the user hasn't actually seen.
- **FR-010**: Dismissing a warning MUST be a local, per-browser action — it MUST NOT be sent
  anywhere or affect what any other user/browser sees.
- **FR-011**: The weather icon/label MUST distinguish light precipitation from heavy
  precipitation, for both rain and snow.
- **FR-012**: The precipitation chart MUST render its bars in a row containing only bars — no
  value or percentage text drawn on/over a bar.
- **FR-013**: The precipitation chart MUST render each column's mm value and chance-of-rain
  percentage in a second row, each aligned directly under its own column's bar.
- **FR-014**: The temperature chart MUST show a degree scale that remains visible while the
  chart's own content scrolls horizontally, the same way its row title already does.
- **FR-015**: The temperature chart's degree scale MUST be labeled at a regular interval of
  approximately 5 degrees.
- **FR-016**: The temperature chart MUST show a horizontal guide line at each labeled degree
  level from FR-015, spanning the chart.

### Key Entities

- **Radar Imagery Layer**: A map overlay depicting real, near-current precipitation coverage —
  visual only, not a data value read anywhere else in the app.
- **Warning Dismissal**: A per-browser record of "this specific warning has been seen and
  dismissed" — local only, never synced or shared, tied to the specific warning's own identity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can look at the Map view and see real precipitation coverage, not an
  estimate, without any extra action.
- **SC-002**: A user starting from their current location sees a place name they recognize in the
  overwhelming majority of cases (any location with a resolvable nearby place name).
- **SC-003**: A user on any non-Overview screen can identify, in under a second, the one control
  that takes them back to the main screen, and it does so consistently every time.
- **SC-004**: A user who dismisses a warning is not shown that same warning again unless it
  genuinely changes, across any number of subsequent visits.
- **SC-005**: A user can tell light rain/snow apart from heavy rain/snow by glancing at the icon
  alone.
- **SC-006**: A user reading the precipitation chart can find any column's exact mm/percentage
  without it visually competing with that column's bar.
- **SC-007**: A user reading the temperature chart can estimate any point's approximate
  temperature within about 5 degrees without hovering, using the visible scale/gridlines.

## Assumptions

- **Radar source**: A free, public, globally-covering radar imagery service (confirmed reachable
  and key-free during specification, unlike SMHI's own raw per-station radar data ruled out in
  `031-map-precipitation-overlay`) supplies the imagery as standard map tiles — no new paid
  dependency or account is introduced.
- **Radar replaces, not supplements**: This feature replaces `031-map-precipitation-overlay`'s
  forecast-circle overlay entirely (per the explicit "remove the old maps... replace it"
  instruction) rather than showing both at once, avoiding a cluttered, redundant map.
- **Place-name resolution**: Reuses the app's existing reverse-geocoding capability (already used
  as a fallback today when no station name is usable) — this feature changes the *preference
  order* (place name first, station name as fallback) rather than introducing a new geocoding
  source.
- **"Home" scope**: Applies to every existing "Back" control (Details, graph, Map) — the Overview
  itself has no such control today and doesn't need one.
- **Dismissal identity**: A warning's own existing identity (already used to render/key it) is
  what a dismissal is recorded against — no new identifier scheme is introduced.
- **Intensity threshold**: "Light" vs. "heavy" for rain and snow uses one sensible, consistent mm
  threshold per precipitation type (a planning-phase detail) — this feature does not introduce a
  third tier ("moderate") or change how thunderstorm/sleet/fog are classified.
- **Chart scope**: The two-row precipitation split (US6) and the temperature degree scale (US7)
  both apply to the app's existing inline overview timeline charts (24h/3-day/7-day), the same
  charts already shipped — no separate, new chart surface is introduced.
