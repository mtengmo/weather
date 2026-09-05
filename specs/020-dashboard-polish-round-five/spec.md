# Feature Specification: Dashboard Polish Round Five

**Feature Branch**: `020-dashboard-polish-round-five`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "1. observations not working for 3d. 2. remove the combine/auto option. always do avg from two sources for forcast. observation always smhi. 3. print out api lastupdated of the wrather forecast. 4. test more on mobile, doesnt work perfect. 5. the new day line on 3d, its seems to be on different timezone since last update. 6. align timeline icons on all pages.(details pages). 7. detail page, add back , to start instead of overview. align navigation on all pages. 8. the forecast brief on overview is 14d, just show 7d."

## Clarifications

### Session 2026-09-05

- Q: "Observation always SMHI" — should the app still fall back to Open-Meteo for observations when a location is outside SMHI's coverage? → A: Yes — keep the existing Open-Meteo fallback for locations outside SMHI's coverage; only forecast handling changes to always-averaged, not the existing observation coverage fallback.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See observations on the 3-day view (Priority: P1)

A user switches to the "3 Days" tab and expects to see observed weather data for the recent past, the same as every other tab.

**Why this priority**: A core data-display defect — if observed data isn't showing on this tab, the tab is broken for its primary purpose.

**Independent Test**: Open the "3 Days" tab for a location with recent observed data; confirm observed values appear on the Weather/Temperature/Rain/Wind rows for the past portion of the timeline.

**Acceptance Scenarios**:

1. **Given** a location with observed data for the last few days, **When** the "3 Days" tab is opened, **Then** the observed (non-forecast) portion of the timeline shows real values, not gaps.

---

### User Story 2 - One clear forecast, no source picker to think about (Priority: P1)

A user no longer has to choose between "Automatic" and "Combined" forecast sources — the app always shows one dependable forecast (an average of both providers) and always uses SMHI for observed conditions.

**Why this priority**: Simplifies a control the user found confusing, and is a prerequisite for clearly showing forecast freshness (User Story 6) — a single always-averaged forecast has one clear freshness story instead of a per-mode one.

**Independent Test**: Open the app; confirm there's no "Forecast sources" control to choose from, and that forecast values shown are consistent with an average of the two providers where both have data.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** the header is inspected, **Then** no "Automatic"/"Combined" forecast-source picker is present.
2. **Given** both SMHI and Open-Meteo have forecast data for a period, **When** that period is shown, **Then** its value is the average of the two providers' readings.
3. **Given** only one provider has forecast data for a period, **When** that period is shown, **Then** that provider's own reading is shown (never a fabricated average from a single source).
4. **Given** a location is covered by SMHI, **When** observed conditions are shown, **Then** they come from SMHI.
5. **Given** a location is outside SMHI's coverage, **When** observed conditions are shown, **Then** they fall back to Open-Meteo, unchanged from today's behavior.

---

### User Story 3 - A day-boundary line that lines up with the actual day (Priority: P1)

A user looking at the 3-day view's day-boundary markers expects each line to fall exactly at midnight for their own local day, not shifted by some other timezone.

**Why this priority**: A visibly wrong marker undermines trust in the whole timeline, and this appears to be a recent regression.

**Independent Test**: Open the 3-day view; confirm each day-boundary line falls exactly between the last column of one calendar day (in the viewer's local time) and the first column of the next.

**Acceptance Scenarios**:

1. **Given** the 3-day view is showing sub-day columns spanning a midnight boundary, **When** the day-boundary line renders, **Then** it sits exactly at the local-midnight transition, not offset by a fixed number of columns that can drift from the actual calendar boundary.

---

### User Story 4 - Consistent, correctly-targeted navigation everywhere (Priority: P1)

A user on the Details page uses "Back" and expects to land on the Overview (the app's home screen), and expects the same navigation controls to look and behave the same way across every screen.

**Why this priority**: Confusing/inconsistent navigation is a usability defect that affects every session.

**Independent Test**: From the Overview, drill into Details; use its back control and confirm it lands on the Overview. Compare the navigation controls' placement and labeling across Overview, graph, and Details.

**Acceptance Scenarios**:

1. **Given** the user is on the Details page, **When** they use its back control, **Then** they land on the Overview, not the graph view.
2. **Given** the user visits the Overview, the graph view, and the Details page in turn, **When** each screen's navigation controls are compared, **Then** equivalent controls (e.g., Back/Details/Map) appear in the same place with the same labeling across all three.

---

### User Story 5 - A 7-day forecast brief that means 7 days (Priority: P1)

A user glancing at the Overview's persistent forecast-brief strip expects to see about a week ahead, not up to two weeks' worth of cards.

**Why this priority**: Directly reported as confusing; the strip is labeled/understood as "the week ahead" and showing double that undermines it.

**Independent Test**: Open the Overview for a location with more than a week of combined observed+forecast data; confirm the persistent forecast-brief strip shows at most 7 cards.

**Acceptance Scenarios**:

1. **Given** a location has 14 days of combined observed and forecast data available, **When** the persistent forecast-brief strip renders, **Then** it shows at most 7 cards, prioritizing today and the days ahead over older history.

---

### User Story 6 - Know how fresh the forecast is (Priority: P2)

A user wants to see when the forecast was last updated, expressed clearly now that there's a single always-averaged forecast rather than a per-mode source choice.

**Why this priority**: Directly requested, and worth revisiting now that User Story 2 changes what "the forecast's source" even means.

**Independent Test**: With a forecast showing, confirm the forecast's last-updated/freshness time is visible somewhere on the page, expressed simply (not requiring the user to understand which provider supplied which part).

**Acceptance Scenarios**:

1. **Given** a forecast is displayed, **When** the user looks for freshness information, **Then** a last-updated time for the forecast is visible without opening any menu.
2. **Given** the two providers' forecasts were fetched at different times, **When** the freshness time is shown, **Then** it's presented as a single, unambiguous reading (e.g., the most recent of the two, or the app's own fetch time), not a confusing list of two different times.

---

### User Story 7 - The same icon style everywhere (Priority: P2)

A user comparing the Overview's timeline icons to the Details page's own icons expects them to look and align the same way.

**Why this priority**: A visual-consistency polish item, not a functional defect.

**Independent Test**: Compare the weather-condition icon presentation (size, alignment, spacing) between the Overview's timeline and the Details page.

**Acceptance Scenarios**:

1. **Given** the same underlying condition data, **When** it's shown as an icon on the Overview versus the Details page, **Then** the icon's size and alignment relative to its row/column are visually consistent between the two.

---

### User Story 8 - A dashboard that works well on a phone (Priority: P2)

A user on a mobile device expects the dashboard to be fully usable — readable text, reachable controls, no broken layout — without the rough edges reported from limited testing so far.

**Why this priority**: Important for a broad audience, but less urgent than the P1 defects since the app is at least partially usable on mobile today.

**Independent Test**: Open the app on a small viewport (phone-sized); walk through selecting a location, switching tabs, opening Details, and opening the map; confirm no control is unreachable, no text is truncated illegibly, and no layout element overflows the screen.

**Acceptance Scenarios**:

1. **Given** a phone-sized viewport, **When** the user performs the primary flows (select location, switch tabs, view details, view map), **Then** every control remains reachable and every piece of text remains legible.
2. **Given** a phone-sized viewport, **When** the timeline or any other wide element is shown, **Then** only the elements intended to scroll horizontally do so — no unintended horizontal scrolling of the whole page.

---

### Edge Cases

- What happens when neither forecast source has data for a period? The existing gap indicator is shown — no fabricated average (unchanged convention).
- What happens when a location has less than 7 days of combined data for the forecast-brief strip? It shows only what's actually available, never padded with fabricated days.
- What happens on the Details page when there's no prior Overview state to return to (e.g., a direct deep link)? "Back" falls back to the Overview with the currently-selected location.
- What happens to the day-boundary line when the 3-day view's data doesn't span a midnight boundary at all (e.g., very short data)? No line is shown for a boundary that doesn't exist in the data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The 3-day view MUST show real observed values (not gaps) for any period that has underlying observed data, matching the 24-hour and 7-day views' treatment of the same data.
- **FR-002**: The app MUST NOT present an "Automatic"/"Combined" forecast-source choice to the user.
- **FR-003**: Whenever both forecast sources have data for a period, the app MUST show a single value averaging the two; whenever only one source has data for a period, the app MUST show that source's own reading.
- **FR-004**: Observed conditions MUST come from SMHI whenever the location is SMHI-covered, falling back to Open-Meteo for locations outside SMHI's coverage (unchanged existing behavior).
- **FR-005**: The 3-day view's day-boundary line(s) MUST align to local midnight based on actual calendar-day transitions in the data, not a fixed column-count assumption that can drift out of alignment.
- **FR-006**: The Details page's back control MUST return the user to the Overview.
- **FR-007**: Equivalent navigation controls (e.g., Back, Details, Map) MUST appear with consistent placement and labeling across the Overview, graph, and Details pages.
- **FR-008**: The persistent forecast-brief strip on the Overview MUST show at most 7 cards, regardless of how much combined observed+forecast data is available, prioritizing today and the days ahead.
- **FR-009**: The app MUST show a single, unambiguous "last updated" time for the forecast, visible without opening a menu.
- **FR-010**: Weather-condition icons MUST be presented with consistent size and alignment between the Overview's timeline and the Details page.
- **FR-011**: All primary flows (location selection, tab switching, Details, Map) MUST remain fully usable on a phone-sized viewport, with no unreachable controls, illegible text, or unintended page-level horizontal scrolling.
- **FR-012**: None of the above changes MUST alter the app's existing gap-vs-fabrication behavior — a period or day with no underlying data continues to show the existing no-data indicator rather than an invented value.

### Key Entities

- **Averaged forecast reading**: A single value per forecast period, derived from whichever of the two providers has data for that period (averaged when both do, passed through unchanged when only one does).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The 3-day view shows observed values for 100% of periods that have underlying observed data, matching the other two tabs' behavior.
- **SC-002**: No forecast-source picker exists anywhere in the app.
- **SC-003**: The 3-day view's day-boundary line falls at the exact local-midnight transition, verified visually against the column labels on either side of it.
- **SC-004**: Using "Back" from the Details page always lands on the Overview, with zero exceptions across all tested locations/states.
- **SC-005**: The Overview's forecast-brief strip never shows more than 7 cards, regardless of a location's forecast reach.
- **SC-006**: A first-time viewer can find the forecast's freshness time without opening any menu, on 100% of screens where a forecast is shown.
- **SC-007**: A side-by-side visual comparison of the Overview and Details pages shows matching icon size/alignment.
- **SC-008**: A full primary-flow walkthrough on a phone-sized viewport completes with zero unreachable controls and zero instances of unintended page-level horizontal scrolling.

## Assumptions

- "Print out API lastupdated" (User Story 6) is interpreted as showing a single, simplified freshness time for the forecast as a whole, not separately exposing each provider's own raw timestamp — consistent with User Story 2 removing the provider-choice concept from the user's view entirely.
- The forecast-brief strip (User Story 5) prioritizes today and forecast days over older observed history when trimming to 7, since a "week ahead" brief is more useful looking forward than backward.
- "Align navigation on all pages" (User Story 4) covers the Overview, graph, and Details pages — the three screens with their own navigation controls; the map screen's controls are addressed by the existing back-to-previous-screen behavior already in place.
- Mobile testing (User Story 8) targets common phone viewport widths (roughly 360-430px) in portrait orientation; tablet-specific layout is out of scope for this round.
