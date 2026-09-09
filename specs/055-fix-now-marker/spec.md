# Feature Specification: Fix "Now" Marker Hidden Behind the Sticky Timeline Band

**Feature Branch**: `055-fix-now-marker`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "the 'now' text in the middle is overwritten by the sticky forecast you added a couple of commits earlier."

Context: Regression from `053-make-timeline-observed`. That feature made the Observed/Forecast section band sticky (`position: sticky`, `z-index: 2`, opaque background) so it stays visible while scrolling. The "Now" marker's vertical line and pill label (`.weather-timeline-now`/`.weather-timeline-now-label`) sit at `z-index: 1` and are positioned at the very top of the timeline — exactly where the sticky band now also renders, and with a lower z-index, so the sticky band's opaque background paints over the "Now" label, hiding it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The "Now" label stays visible above the sticky band (Priority: P1)

A viewer looking at the hourly timeline can still see the "Now" marker's label, unobscured, regardless of the sticky Observed/Forecast band introduced in 053.

**Why this priority**: This is a regression in a marker the viewer relies on to find the current hour at a glance — it must be fixed, not just improved.

**Independent Test**: Render a timeline with both an observed and forecast boundary (so both the "Now" marker and the sticky band are present); confirm the "Now" label renders visibly, not covered by the band.

**Acceptance Scenarios**:

1. **Given** a timeline with a "Now" boundary and forecast data (so the sticky band also renders), **When** the viewer looks at the top of the timeline, **Then** the "Now" label is fully visible, not hidden behind the Observed/Forecast band.
2. **Given** the same timeline, **When** the viewer scrolls down through the timeline's other rows, **Then** both the sticky band and the "Now" marker's vertical line remain correctly visible and correctly stacked (Now marker still readable, band still doing its job).

---

### Edge Cases

- What happens on a timeline with no forecast data (no sticky band rendered at all)? No change — the "Now" marker already displayed correctly before 053 in this case, and continues to.
- What happens on a timeline with no "Now" boundary (fully historical or fully forecast)? Nothing to fix — the marker isn't rendered at all in that case, unchanged from today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The "Now" marker's label MUST render visibly above the sticky Observed/Forecast band whenever both are present, not hidden behind it.
- **FR-002**: The "Now" marker's vertical line MUST continue to span the full timeline height, unchanged from before this fix.
- **FR-003**: The sticky band MUST continue to stay visible while scrolling (053's own behavior), unaffected by this fix.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the time, the "Now" label is visible (not covered) when both it and the sticky band are present.
- **SC-002**: 0 regressions to the sticky band's own stay-visible-while-scrolling behavior (053).

## Assumptions

- This is a pure stacking-order (z-index) fix — no repositioning of either element is needed, since visually they're meant to coexist at the top of the timeline (the band as a header, the "Now" label marking a specific column within it).
