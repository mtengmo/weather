# Feature Specification: Restore Rain Percentage and Remove Sticky Row-Title Column

**Feature Branch**: `039-rain-percent-sticky-fix`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description:
"the last change you did with rain chance, was wrong. You removed the rain %, revert it.
You should have removed the sticky header on the graph, it´s not needed."

Clarified with the user:
- The low-confidence rain-icon guard (suppressing the rain/snow icon when a period's chance-of-rain is below 20%) is correct and stays as-is.
- What was lost, and must come back, is the chance-of-rain percentage shown after the precipitation (mm) amount on the timeline.
- "The sticky header ... on the graph" refers to the row-title column (e.g. "Rain", "Wind", "Temp") on the dashboard timeline, which stays pinned in place ("sticky") while the timeline scrolls left/right on mobile, eating into the space available for the chart itself.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the rain percentage again next to the rain amount (Priority: P1)

A dashboard viewer looks at the Rain row of the timeline and expects to see, next to each period's rain amount (mm), the chance-of-rain percentage for that period — as it worked before the most recent update. Today that percentage no longer appears.

**Why this priority**: Named first by the user as the change that was "wrong" and must be reverted — a loss of information the viewer relied on.

**Independent Test**: Open the dashboard timeline's Rain row for a forecast period that has both a non-zero rain amount and a known chance-of-rain value, and confirm the percentage is shown next to the mm amount.

**Acceptance Scenarios**:

1. **Given** a forecast period in the Rain row has a chance-of-rain value greater than 0%, **When** the viewer looks at that period's cell, **Then** the mm amount is shown together with the chance-of-rain percentage, as it was before the most recent update.
2. **Given** a forecast period's chance-of-rain is low enough that the icon-suppression guard hides the rain/snow icon for that period, **When** the viewer looks at the Rain row for that same period, **Then** the percentage is still shown next to the mm amount — the icon guard and the percentage display are independent of each other.
3. **Given** an observed (non-forecast) period, which has no forecast chance-of-rain figure, **When** the viewer looks at that period's cell, **Then** only the mm amount is shown, unchanged from today.

---

### User Story 2 - A timeline row title that doesn't eat into the chart while scrolling (Priority: P2)

A dashboard viewer scrolls the timeline left/right on a mobile-width screen. Today, each row's title (e.g. "Rain", "Wind", "Temp") stays pinned in place at the left edge while the data scrolls underneath it, permanently covering part of the chart area. The viewer wants that title to no longer stay pinned — it's not needed there.

**Why this priority**: Named second by the user; a real usability complaint about wasted mobile screen space, but narrower in effect than the missing rain percentage.

**Independent Test**: Open the dashboard timeline on a narrow (mobile-width) viewport, scroll a row horizontally, and confirm the row's title no longer stays fixed in place over the chart — it scrolls away with the row's data instead.

**Acceptance Scenarios**:

1. **Given** the timeline is open on a narrow viewport, **When** the viewer scrolls a row horizontally, **Then** that row's title scrolls out of view along with the data instead of remaining pinned at the left edge.
2. **Given** the same change, **When** the viewer opens the timeline on a wide (desktop-width) viewport, **Then** the row still shows its title and data correctly — this isn't a mobile-only visual regression waiting to happen on desktop.
3. **Given** a viewer who relies on a screen reader, **When** they navigate the timeline, **Then** each row's title/label is still announced and associated with its data, even though it's no longer visually pinned.

---

### Edge Cases

- What happens to a Rain row cell that has a rain amount but no chance-of-rain data at all (e.g. a data source that doesn't supply it)? It must show only the mm amount, exactly as it does today for such cases.
- What happens to a Rain row cell whose chance-of-rain is exactly 0%? It keeps today's existing behavior of showing only the mm amount, unaffected by this fix.
- What happens to the other timeline rows (Wind, Temperature, Weather/condition) once the title column stops being pinned? They follow the same change — no row keeps a pinned title, since the complaint is about the pinned-title pattern generally, not one specific row.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard timeline's Rain row MUST show the chance-of-rain percentage next to the precipitation (mm) amount for any period where a chance-of-rain value greater than 0% is available, regardless of whether that period's rain/snow icon is suppressed by the low-confidence guard.
- **FR-002**: The low-confidence rain/snow icon-suppression guard (below a 20% chance-of-rain threshold) MUST remain unchanged — this fix affects only the percentage display, not icon classification.
- **FR-003**: A period with no chance-of-rain data, or a chance-of-rain of exactly 0%, MUST continue to show only the mm amount, unchanged from today.
- **FR-004**: None of the dashboard timeline's row titles (Rain, Wind, Temp, Weather/condition, etc.) MUST remain visually pinned in place while their row's data is scrolled horizontally.
- **FR-005**: Each timeline row's title/label MUST remain visible and correctly associated with its row's data (including for screen-reader users) once it is no longer pinned in place.
- **FR-006**: The timeline MUST remain fully usable and visually correct on both mobile-width and desktop-width viewports after the title column stops being pinned.

### Key Entities

- **Timeline period**: One column of the dashboard timeline (an hour or a day), carrying a precipitation amount and, when available, a chance-of-rain percentage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a representative set of forecast periods with a chance-of-rain above 0%, 100% show that percentage alongside the mm amount on the Rain row.
- **SC-002**: For a representative set of periods where the rain/snow icon is suppressed by the low-confidence guard, the chance-of-rain percentage is still shown for all of them, confirming the two behaviors are independent.
- **SC-003**: On a mobile-width viewport, scrolling any timeline row horizontally no longer leaves a row title fixed over the chart area — 0 rows keep a pinned title after the change.
- **SC-004**: The timeline's desktop-width layout shows no regression — the same information is present and legible as before.

## Assumptions

- "Removed the rain %" refers to the chance-of-rain percentage previously shown next to the mm precipitation amount on the dashboard timeline's Rain row, not to any other rain-related figure elsewhere in the app.
- "The sticky header ... on the graph" refers to the dashboard timeline's per-row sticky title column (a `position: sticky` left-hand label that stays in view during horizontal scroll), not the app's top navigation header or the separate Details/graph view's own title area.
- Removing the pinned/sticky behavior only affects how the title behaves during horizontal scrolling; it does not require removing the titles themselves or restructuring the timeline's rows.
- This fix is scoped to the dashboard timeline (Overview); it does not affect the Details/graph view's own charts.
