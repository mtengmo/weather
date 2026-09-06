# Feature Specification: Colorful Daily Brief Icon

**Feature Branch**: `029-colorful-brief-icons`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "also, the daily brief needs colorful icons, now it's just black and white"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recognize today's condition at a glance, consistently with the rest of the app (Priority: P1)

A user looking at the "Today" summary card (high/low, description, rain, wind, sunrise/sunset) sees its weather icon rendered in a single flat tone, while the exact same condition icon appears in color everywhere else in the app (the hourly/daily timeline, the 7-day forecast strip). This inconsistency makes the card's icon slower to read at a glance and feel visually out of place next to the rest of the page.

**Why this priority**: This is the entire feature — one visual element on the app's primary, always-visible card.

**Independent Test**: Open the overview for any location; the Today card's icon renders in its condition's established color (e.g. yellow/orange for clear/sunny, blue-grey for cloudy) rather than a single flat tone, matching the color already used for that same condition elsewhere on the page.

**Acceptance Scenarios**:

1. **Given** the Today card is showing a clear-sky condition, **When** the page renders, **Then** the card's icon appears in that condition's color, the same color already used for a clear-sky icon elsewhere in the app (e.g. the 7-day strip).
2. **Given** the Today card is showing a different condition (cloudy, rainy, snowy, windy, thunderstorm, foggy, sleet), **When** the page renders, **Then** the icon appears in that specific condition's own established color, not a single shared tone.
3. **Given** the user switches the app's color theme (e.g. light/dark), **When** the Today card re-renders, **Then** the icon's condition color remains legible and consistent with how every other themed weather icon in the app already adapts to that theme.

---

### Edge Cases

- What happens when there isn't enough data to determine a condition (the card falls back to showing no icon at all)? No color is applied to a missing icon — this case is unaffected, unchanged from today.
- What happens across the app's different visual themes (the app already supports more than one)? The icon's per-condition color must remain readable in every theme the app supports, the same guarantee already relied on for every other colored weather icon in the app.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Today summary card's weather icon MUST be rendered in its weather condition's established color, not a single flat/monochrome tone.
- **FR-002**: The color used for a given condition on the Today card MUST be the same color already used for that same condition elsewhere in the app (the timeline and the 7-day forecast strip), so the same condition always looks the same regardless of where it's shown.
- **FR-003**: The colored icon MUST remain legible across every visual theme the app already supports.
- **FR-004**: When no condition can be determined (insufficient data), the card's existing no-icon fallback behavior MUST be unchanged.

### Key Entities

*(No new data entities — this feature applies existing per-condition color styling, already defined for other views, to one additional icon.)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every weather condition the app recognizes, the Today card's icon color visually matches that condition's color everywhere else it's already shown in the app.
- **SC-002**: The change is visible with no other layout or content change to the Today card — same icon shape, size, and position as before.

## Assumptions

- **Root cause**: The app already defines a distinct color per weather condition (introduced for the timeline/forecast-strip icons) — the Today card's icon simply isn't opted into that existing styling today, rendering in the page's default text color instead. This feature applies the existing, already-themed color styling to that one remaining icon; it does not introduce any new colors, icons, or condition types.
