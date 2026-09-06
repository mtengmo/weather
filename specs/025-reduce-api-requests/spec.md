# Feature Specification: Reduce API Requests & Hide 0% Rain Chance

**Feature Branch**: `025-reduce-api-requests`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "1. It's 65 api request to build the page? is it needed? Seems overcomplicated, could you re-factor the code? The details page don't need to be loaded at start. 2. If 0% chance of rain, remove 0%. no need to print it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Overview loads without fetching data it doesn't show (Priority: P1)

A user opening the dashboard expects it to fetch only the data the Overview actually displays,
not data that's only used on a different page they haven't opened yet.

**Why this priority**: A real, measurable inefficiency — loading the default landing page
currently triggers dozens of network requests, a meaningful number of which fetch data
(nearby-station comparison readings) that only the Details/graph view ever shows, and that view
isn't open by default.

**Independent Test**: Load the dashboard fresh (default Overview view); count the weather-data
network requests made before the page finishes loading; confirm the count is substantially lower
than before, with no request made for data the Overview doesn't display.

**Acceptance Scenarios**:

1. **Given** the dashboard is opened fresh, **When** the Overview finishes loading, **Then** no
   request for nearby-station comparison data has been made yet.
2. **Given** the user then opens the Details/graph view for the first time in that session,
   **When** it needs nearby-station comparison data, **Then** it fetches it at that point, showing
   the same existing loading indicator the page already uses for its own data.
3. **Given** the user returns to the Overview from the Details/graph view, **When** they do so,
   **Then** no data is re-fetched unnecessarily — data already fetched for the current
   location/window is reused.

---

### User Story 2 - No redundant duplicate requests for the same data (Priority: P2)

A user's page load shouldn't fetch the exact same piece of weather data more than once.

**Why this priority**: A secondary contributor to the same underlying complaint — even setting
aside the Details-only data, some of the same station/parameter/period combinations are currently
requested multiple times within a single page load.

**Independent Test**: Load the dashboard; confirm no single weather-data request (same
parameter, station, and time period) is issued more than once for the same page load.

**Acceptance Scenarios**:

1. **Given** the Overview needs the same underlying data for more than one purpose (e.g. today's
   conditions and the weekly forecast brief), **When** that data is fetched, **Then** it's
   requested once and reused, not fetched again for each purpose.

---

### User Story 3 - No "0%" chance of rain shown (Priority: P3)

A user looking at the Rain row doesn't want to see a "0%" chance-of-rain label — it adds visual
noise without conveying anything the absence of a label wouldn't already convey.

**Why this priority**: A small, independent visual-polish request — unrelated to the request
volume work above and shippable on its own.

**Independent Test**: View a forecast period with a genuine 0% chance of rain; confirm no
percentage is shown at all, while a period with any chance greater than 0% still shows its
percentage as today.

**Acceptance Scenarios**:

1. **Given** a forecast period's chance of rain is genuinely 0%, **When** the Rain row is shown,
   **Then** no percentage is displayed for that period.
2. **Given** a forecast period's chance of rain is greater than 0%, **When** the Rain row is
   shown, **Then** its percentage continues to display exactly as today.

### Edge Cases

- What happens if the user switches to the Details/graph view before the Overview's own data has
  finished loading? The Details/graph view's own existing loading state is shown, and its
  nearby-station fetch proceeds independently, unaffected by the Overview's own fetch still being
  in flight.
- What happens to the persistent Today card and 7-day strip, which don't show nearby-station
  comparisons at all? They are unaffected — they never needed that data and continue to load
  exactly as before.
- What happens when a chance-of-rain reading is missing entirely (not zero, but genuinely
  unknown)? The existing no-data behavior is unchanged — nothing is shown, exactly as when it's
  0%, so the two cases remain visually identical (as they already are today).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST NOT fetch nearby-station comparison data until the Details/graph
  view has been opened at least once in the current session.
- **FR-002**: Opening the Details/graph view for the first time in a session MUST trigger fetching
  nearby-station comparison data at that point, using the same loading-state presentation the
  view already has for its own primary data.
- **FR-003**: Navigating away from and back to the Details/graph view within the same
  location/window MUST NOT re-fetch nearby-station comparison data that was already fetched.
- **FR-004**: The system MUST NOT issue more than one network request for the same underlying
  weather-data parameter, station, and time period within a single page load.
- **FR-005**: The Rain row MUST NOT display a percentage for a forecast period whose chance of
  rain is genuinely 0%.
- **FR-006**: The Rain row MUST continue to display the percentage for any forecast period whose
  chance of rain is greater than 0%, unchanged from today.
- **FR-007**: None of the above changes may fabricate data or alter what any view's own primary
  (non-comparison) data shows — only when comparison data is fetched, and whether a genuine-zero
  percentage is printed, change.

### Key Entities

- **Nearby-Station Comparison Data**: The set of readings from nearby weather stations shown only
  on the Details/graph view, now fetched lazily (on first use) rather than eagerly with every
  Overview load.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The number of weather-data network requests made when the Overview first loads is
  reduced by at least 50% compared to before this change, for a typical SMHI-covered location.
- **SC-002**: No nearby-station comparison request occurs before the Details/graph view is opened,
  verified by inspecting network activity during an Overview-only session.
- **SC-003**: No single weather-data request is duplicated within one page load, verified by
  inspecting network activity for repeated identical requests.
- **SC-004**: A forecast period with a genuine 0% chance of rain shows no percentage, verified
  visually; a period with a non-zero chance continues to show one.

## Assumptions

- "The details page don't need to be loaded at start" (User Story 1) refers specifically to
  nearby-station comparison data — the only data currently fetched eagerly that the Overview
  itself never displays (confirmed via code review: `useObservationData`'s single shared fetch
  always requests it regardless of which view is active). The Details/graph view's *own* primary
  series data is not deferred, since the Overview already needs and displays that same primary
  data.
- Deferring nearby-station data to first-use means the Details/graph view will show its existing
  loading indicator for a moment the first time it's opened in a session, the same experience it
  already has today while its primary data loads — a reasonable, already-established pattern
  rather than a new one.
- "0% chance of rain" and "no chance-of-rain data available at all" are already visually
  identical today (neither currently prints anything extra beyond the mm value) — User Story 3
  keeps that indistinguishability rather than introducing a way to tell them apart, since the
  request only asks to stop printing "0%", not to add a new distinct indicator for a genuine gap.
