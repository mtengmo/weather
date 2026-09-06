# Feature Specification: Fix Temperature Scale Layout and Add Header Logo

**Feature Branch**: `035-fix-temp-scale-logo`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "the sticky temp scale with 5 degress should be left of Temperature. Rename Temperature to Temp so it´s shorter. The scale is messy, overlapping number, worked better before, probably need to resize something? see image. 2. I don´t see the tengmo vader icon transluent image, could we have it on the top left corner?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Legible temperature degree scale (Priority: P1)

A user viewing the temperature chart (24h/3-day/7-day timeline) can read every degree-scale tick
label (e.g. "25°", "20°", "15°") clearly, with no two labels overlapping each other or the row's
own "Temp (°C)" title text, and the degree-scale column sits to the left of the "Temp" title
rather than crowding immediately next to/over it.

**Why this priority**: This is a readability regression on a just-shipped feature (the sticky
degree scale) — the chart's own numeric scale is currently illegible in some data ranges, which
undermines the chart's core purpose.

**Independent Test**: Open the 24h view for a location where the day's temperature range spans a
narrow band (e.g. 16–21°C, forcing adjacent 5°-step ticks like 20° and 25° close together
vertically) and visually confirm every tick label is fully legible and separated from its
neighbors, and that the tick numbers sit in their own column to the left of the "Temp" label.

**Acceptance Scenarios**:

1. **Given** the temperature chart is showing a narrow temperature range, **When** the degree
   scale renders its 5°-step ticks, **Then** no two tick labels visually overlap each other.
2. **Given** the temperature row is rendered, **When** the user looks at the row's left edge,
   **Then** the degree-scale tick column appears to the left of the "Temp" row title, not
   overlapping or immediately crowding its text.
3. **Given** the temperature row title, **When** the user reads it, **Then** it reads "Temp (°C)"
   (not "Temperature (°C)").

---

### User Story 2 - Brand logo visible in the app (Priority: P2)

A user opens the app and sees the new Tengmo Väder logo (the translucent icon added in the recent
rebrand) displayed in the top-left corner of the page, not just as a browser-tab favicon.

**Why this priority**: The rebrand (034-rebrand-tengmo-vader) added the new icon as a
favicon/PWA icon, but it is not visible anywhere in the app's own UI — a user only sees it in the
browser chrome, not on the page itself.

**Independent Test**: Load the app and confirm a Tengmo Väder logo image is visible in the
top-left corner of the page, on every view.

**Acceptance Scenarios**:

1. **Given** the app is loaded, **When** the user looks at the top-left corner of the page,
   **Then** the Tengmo Väder translucent logo image is visible there.
2. **Given** the user switches between views (Overview, graph, details, map), **When** they look
   at the top-left corner, **Then** the logo remains visible and consistent across views.

---

### Edge Cases

- What happens on very small/narrow viewports where the header is already tight for space (search
  box, favorites, controls)? The logo must not push existing header controls off-screen or force
  horizontal scrolling of the header itself.
- What happens when the temperature range for a given view is very wide (e.g. a 7-day view
  spanning several tens of degrees)? Ticks must remain legibly spaced in that case too, not just
  in the narrow-range case that surfaced the bug.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST rename the temperature row's title from "Temperature" to "Temp" in
  every timeline view (24h, 3-day, 7-day).
- **FR-002**: The system MUST position the sticky temperature degree-scale (tick labels) so it
  renders to the left of the "Temp" row title, rather than overlapping or immediately crowding it.
- **FR-003**: The system MUST ensure adjacent degree-scale tick labels never visually overlap each
  other, regardless of how narrow the chart's actual temperature range is.
- **FR-004**: The system MUST display the Tengmo Väder translucent logo image in the top-left
  corner of the page, visible on every view (Overview, graph/details, map).
- **FR-005**: The system MUST keep the logo from crowding out or overlapping existing header
  controls (search, favorites, theme/unit toggles) at narrow/mobile viewport widths.

### Key Entities

- **Temperature degree scale**: The sticky column of tick labels (5°-step values) shown alongside
  the temperature chart, whose position and label-spacing are being fixed.
- **Brand logo**: The Tengmo Väder translucent icon image, now also shown in-page (not just as a
  favicon), in the top-left corner.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of degree-scale tick labels are fully legible (no overlapping text) across the
  full range of real-world temperature spans the app displays (both narrow and wide ranges).
- **SC-002**: The temperature row title reads "Temp (°C)" everywhere "Temperature (°C)" previously
  appeared.
- **SC-003**: The Tengmo Väder logo is visible in the top-left corner on 100% of the app's views,
  at both desktop and mobile viewport widths, without displacing existing header controls.

## Assumptions

- "Temp" is an acceptable, unambiguous shortening of "Temperature" for this row title — no other
  row currently uses "Temp" for a different metric.
- The degree-scale's tick *step* (every 5°) is not changing — only its position (left of the
  label) and its label-spacing/legibility are in scope. Reducing the number of ticks shown (e.g.
  only every 10°) when they'd otherwise be too close together is an acceptable implementation
  approach to satisfy FR-003, left to the planning phase.
- The logo shown in the top-left corner is a static image, not an interactive link/button (e.g.
  it does not need to navigate anywhere when clicked) — purely a brand mark.
- The logo uses the same source image already added in 034-rebrand-tengmo-vader
  (`docs/logos/tengmovader_icon_transluent.png`), scaled appropriately for in-page display rather
  than requiring a new asset.
