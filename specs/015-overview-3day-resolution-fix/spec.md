# Feature Specification: Overview Resolution Split and High/Low Fix

**Feature Branch**: `015-overview-3day-resolution-fix`

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "The detail of morning, lunch, afternoon, evening, night, move it a 3 days window, and keep 1d resultion on 7d. It's not good to mix resultion on same script. high/low is not working."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The 7-day Overview shows one consistent resolution (Priority: P1)

A user viewing the 7-day Overview today sees its first two days broken into five sub-day columns (morning/lunch/afternoon/evening/night) while the rest of the week shows one column per day — mixing two different levels of detail on the same timeline. The 7-day Overview now shows exactly one column per day, for all seven days, with no sub-day breakdown mixed in.

**Why this priority**: Directly requested; a single view mixing two resolutions is confusing and was called out as actively undesirable ("not good to mix resolution on same script").

**Independent Test**: Open the 7-day Overview; confirm every one of the seven columns represents a full day, with no day broken into finer sub-day columns.

**Acceptance Scenarios**:

1. **Given** the 7-day Overview, **When** it renders, **Then** all seven columns are full-day columns, none broken into sub-day periods.
2. **Given** the 7-day Overview, **When** compared to its own historical (pre-sub-day-detail) behavior, **Then** the day-level data shown (condition, temperature, precipitation, wind) is computed the same way it always has been for a full day.

---

### User Story 2 - A dedicated 3-day view offers sub-day detail (Priority: P1)

The sub-day detail (morning/lunch/afternoon/evening/night) that used to appear mixed into the first two days of the 7-day view is not being discarded — it moves to its own, dedicated short-range view spanning the next three days, where every day (not just the first two) is broken into the same five sub-day periods, at a single consistent resolution.

**Why this priority**: Directly requested; preserves the detail-level information already built while resolving the resolution-mixing complaint from User Story 1 — a coordinated pair of changes to the same view.

**Independent Test**: Open the new 3-day view; confirm all three days are broken into five sub-day periods each (morning/lunch/afternoon/evening/night), consistently, with no full-day columns mixed in.

**Acceptance Scenarios**:

1. **Given** the 3-day view, **When** it renders, **Then** each of the three days shows five sub-day columns, for a consistent single resolution throughout the view.
2. **Given** the 3-day view, **When** a sub-day period falls in the past relative to "now" for today's own remaining periods, **Then** it is treated as observed data the same way the app's existing observed-vs-forecast distinction already works elsewhere.
3. **Given** the 3-day view, **When** fewer than three days of underlying data are available (e.g., a location whose forecast doesn't reach three days out), **Then** it shows only the periods actual data supports, never a fabricated period.
4. **Given** the 24-hour Overview and the 7-day Overview, **When** the 3-day view is added, **Then** neither existing view's own behavior changes because of it.

---

### User Story 3 - High/Low toggle correctly reflects each day's high and low (Priority: P1)

The app-wide High/Low toggle is supposed to show each day's high and low temperature alongside the average on the Overview, but a user reports it does not currently work. Turning the toggle on reliably shows the correct high/low reading for every day (or sub-day period) that has the underlying data for it.

**Why this priority**: A reported functional defect in an already-shipped, user-facing control — a basic correctness bug.

**Independent Test**: Turn on High/Low; open the 7-day Overview (and the 3-day view once it exists); confirm every day/period with temperature data also shows its high and low, matching the same underlying readings shown elsewhere (e.g., the classic graph's own High/Low lines for the same location and dates).

**Acceptance Scenarios**:

1. **Given** the High/Low toggle is on, **When** the 7-day Overview's temperature row renders for a day with observed or forecast temperature readings, **Then** that day's high and low are visibly shown alongside the average.
2. **Given** the High/Low toggle is on, **When** the 3-day view's temperature row renders for a sub-day period with temperature readings, **Then** that period's high and low are visibly shown alongside its average.
3. **Given** the High/Low toggle is off, **When** either view renders, **Then** it shows only the plain average, unaffected by this fix.
4. **Given** a day or period with no temperature readings at all, **When** the toggle is on, **Then** it shows the existing gap indicator rather than a fabricated high/low.

---

### Edge Cases

- If a day within the 7-day view happens to be "today" (partially observed, partially forecast), it still renders as a single full-day column (User Story 1) — the day/sub-day resolution split does not reintroduce per-hour mixing there.
- If the 3-day view's underlying data is sparser than a full day for a given sub-day period (e.g., only one reading), that period's high and low both equal that single reading rather than showing a misleading range.
- Switching between the 24-hour, 3-day, and 7-day views must not fetch fresh data more than necessary if the same underlying observations already cover the requested range.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The 7-day Overview MUST show exactly one column per day for all seven days.
- **FR-002**: The 7-day Overview MUST NOT show any sub-day (morning/lunch/afternoon/evening/night) columns.
- **FR-003**: The Overview MUST offer a 3-day view, in addition to the existing 24-hour and 7-day views.
- **FR-004**: The 3-day view MUST show five sub-day columns (morning, lunch, afternoon, evening, night) for each of its three days.
- **FR-005**: The 3-day view MUST NOT fabricate a sub-day period beyond what the underlying data actually supports.
- **FR-006**: The 24-hour and 7-day views' own existing behavior MUST be unaffected by the introduction of the 3-day view.
- **FR-007**: The High/Low toggle, when on, MUST show the correct high and low temperature for every day (7-day view) or sub-day period (3-day view) that has temperature data.
- **FR-008**: The High/Low toggle, when off, MUST leave both views showing only the plain average, unchanged from today.
- **FR-009**: A day or sub-day period with no temperature data MUST continue to show the existing gap indicator, never a fabricated high/low.

### Key Entities

- **Overview Window**: The user-selectable time range shown on the Overview — now three options: 24-hour (hourly resolution), 3-day (sub-day resolution), and 7-day (daily resolution) — each internally consistent, never mixing resolutions within itself.
- **Sub-Day Period**: One of five fixed segments (morning, lunch, afternoon, evening, night), now used throughout the 3-day view instead of only the first two days of the 7-day view.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 7-day Overview's columns are full-day columns, verified by inspecting the rendered view.
- **SC-002**: 100% of the 3-day view's columns are sub-day columns, verified by inspecting the rendered view.
- **SC-003**: With High/Low on, every day or sub-day period that has temperature data shows both a high and a low value, verified across the 7-day and 3-day views.
- **SC-004**: Switching between the 24-hour, 3-day, and 7-day views produces no more data fetches than switching between the 24-hour and 7-day views did before this feature.

## Assumptions

- The 3-day view reuses the same five fixed sub-day period boundaries already established for this app (morning ~06:00-11:00, lunch ~11:00-13:00, afternoon ~13:00-17:00, evening ~17:00-21:00, night ~21:00-06:00) — no new boundary scheme is introduced.
- The 3-day view's three days start from "today" and look forward, the same starting point the sub-day detail already used within the 7-day view.
- The High/Low defect (User Story 3) is scoped to the Overview specifically — the classic graph view's own High/Low lines are already working and are out of scope for this fix unless investigation finds a shared root cause.
- "It's not good to mix resolution on same script" is interpreted as being about a single *view* (the 7-day Overview) showing two different column resolutions at once — not about the app's two views (Overview vs. classic graph) needing to match each other's resolution.
