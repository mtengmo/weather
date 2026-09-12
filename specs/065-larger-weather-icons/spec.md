# Feature Specification: Larger Weather Icons

**Feature Branch**: `065-larger-weather-icons`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "now with new weather icons, they feel very small because of all details in them, possible to make them larger?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the character artwork clearly, not as a tiny blur of detail (Priority: P1)

A user looks at the app's Today card, the hourly timeline, the Details table, and the 7-day
forecast strip. The new character-illustrated weather icons (063-replace-weather-icons) are
noticeably more detailed than the old flat icons they replaced, so at their current small display
size the character and scene are hard to make out. Displaying them larger lets the user actually
see the character and weather symbol clearly, the way the artwork was meant to be seen.

**Why this priority**: This is the entire ask — the new artwork's added detail is the whole reason
it now reads poorly at its old size; making it bigger is the direct fix.

**Independent Test**: Load the app and compare the rendered icon size at each of the four
placements against today's size; confirm each renders noticeably larger while everything around it
(surrounding text, layout, columns) still fits without overlapping, wrapping badly, or introducing
new scrollbars beyond what already exists.

**Acceptance Scenarios**:

1. **Given** the Today card, the hourly timeline, the Details table, and the 7-day forecast strip
   all show a weather icon today, **When** this feature ships, **Then** each of those icons renders
   visibly larger than it does today.
2. **Given** the Today card's icon is already the largest of the four (it's the page's single
   "hero" icon), **When** every icon is enlarged, **Then** the Today card's icon remains the
   largest — the existing size relationship between placements is preserved, just scaled up.
3. **Given** the hourly timeline shows many icons side by side across a scrollable row, **When**
   its icons are enlarged, **Then** the row continues to scroll horizontally exactly as it does
   today, with no icon clipped, overlapping its neighbor, or breaking the row's alignment with the
   other rows above/below it (temperature, precipitation, etc.).

---

### Edge Cases

- What happens to the row of small lucide icons still used as a fallback (e.g. for `windy`, which
  has no character artwork)? They should grow along with everything else in the same placement, so
  the fallback icon doesn't suddenly look tiny and out of place next to the enlarged character
  artwork beside it.
- What happens on a narrow (mobile-width) screen where the hourly timeline already scrolls
  horizontally? Enlarging the icons doesn't change that — the row keeps scrolling exactly as it
  does today, just with bigger icons in it.
- What happens to any layout that isn't one of these four icon placements (e.g. header controls,
  buttons)? Unaffected — this feature only changes the size of the weather icon artwork itself.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display the weather icon larger than its current size at all four
  existing placements: the Today card, the hourly timeline's "Weather" row, the Details table, and
  the 7-day forecast strip.
- **FR-002**: The existing relative size relationship between placements MUST be preserved — the
  Today card's icon (today's largest) MUST remain larger than the other three after this change.
- **FR-003**: Enlarging the icons MUST NOT cause any existing layout to overlap, clip content, wrap
  in a new/broken way, or require a new scrollbar beyond the hourly timeline's own existing
  horizontal scroll.
- **FR-004**: The fallback lucide icon used for conditions without character artwork (e.g.
  `windy`) MUST scale up by the same amount as the character artwork at each placement, so the two
  stay visually consistent in size.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The rendered icon size at each of the four placements increases by at least 50% over
  today's size (e.g. today's 28px icons render at 42px or larger).
- **SC-002**: No existing layout regression is introduced — every screen that shows a weather icon
  today still fits its content correctly (verified visually across the app's existing views) after
  the icons are enlarged.

## Assumptions

- "Larger" means increasing the on-screen display size of the existing icon images — it does not
  mean changing which artwork is shown or regenerating the underlying image files (already
  addressed for file size in a prior change; this feature is purely about display size).
- The exact enlarged size at each of the four placements is left to preserve good visual balance
  with surrounding text and layout at each spot, as long as SC-001's minimum increase and FR-002's
  relative-size ordering both hold.
- This applies only to the four placements the character artwork already appears in
  (063-replace-weather-icons) — it does not add the icon to any new location.
