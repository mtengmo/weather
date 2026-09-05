# Feature Specification: Dashboard Polish Round Four

**Feature Branch**: `019-dashboard-polish-round-four`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "1. The dropdown menu shade to much, hard to see because of the background. 2. Prefer smhi forcast also. If combine forecast, write it out. Add timestamp for both sources, usually they have a update forecast a timestamp. 3. The map is not working not possible to take me back. 4. The forecast above, the daily one, just to it 7d. Write out date also. 5. The rain bar, is not aligned at 0 if it's rain in the forecast. Also the bar's doesn't change size depends on rain forcast. 6. The wind direction is missing on 3d forecast. 7. The location is missing now. 8. What is the temp at the second part? 18 / 6 Celsius. don't understand it. 9. Look on the old picture, I think you could do it better. (mockup image supplied)"

## Clarifications

### Session 2026-09-05

- Q: A paired reading like "18°/6°" shows with no label — what should the fix be? → A: Add explicit "High"/"Low" labels wherever two temperatures are paired (Today card, timeline parenthetical).
- Q: When Forecast sources is "Automatic," how strict should the SMHI preference be, and what should "Combined" show? → A: SMHI is the preferred forecast source; when "Combined" is selected, the two sources' values are averaged into a single reading rather than shown side by side.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See which location the dashboard is showing (Priority: P1)

A user opens the dashboard and needs to see, at a glance, which place's weather they're looking at, without opening the location switcher.

**Why this priority**: The most recent redesign removed the on-page location heading and never replaced it with anything else visible in the persistent header — a user with a saved location can no longer confirm which place is on screen without clicking through. This is a basic orientation regression that affects every screen.

**Independent Test**: Open the app with a selected location; confirm the location's name is visible in the header without opening any menu.

**Acceptance Scenarios**:

1. **Given** a location is selected, **When** any of the three tabs (24 Hours/3 Days/7 Days), the graph, details, or map view is open, **Then** the selected location's name is visible in the persistent header.
2. **Given** the user switches to a different location, **When** the new location's data loads, **Then** the header updates to show the new location's name.

---

### User Story 2 - Leave the map view (Priority: P1)

A user opens the map screen and needs a way to return to the weather dashboard.

**Why this priority**: The map view currently has no exit — the header's "Map" button doesn't toggle back, and there's no other affordance to leave, effectively trapping the user on that screen (aside from reloading the app). This blocks a core navigation path.

**Independent Test**: Open the map view; confirm a control exists that returns to the previous dashboard view, and that using it works.

**Acceptance Scenarios**:

1. **Given** the user is on the map view, **When** they use the header's back/return control, **Then** they land back on the view they came from (Overview, graph, or details).
2. **Given** the user is on the map view, **When** they select a location pin or a favorite from the map, **Then** they're taken to that location's Overview (existing behavior, unaffected).

---

### User Story 3 - Read the Display and Forecast-sources menus in every theme (Priority: P1)

A user opens the Display or Forecast-sources dropdown and needs to read its contents clearly, regardless of which visual theme is active.

**Why this priority**: In at least one theme, these two menus render on a background that's too transparent, making their text hard to distinguish from whatever's behind them — a usability-blocking legibility bug.

**Independent Test**: Open the Display menu and the Forecast-sources menu in each available theme; confirm the menu's background is opaque enough that its text and controls are clearly legible against any page content behind it.

**Acceptance Scenarios**:

1. **Given** any theme is active, **When** the Display menu or the Forecast-sources menu is open, **Then** its background is solid/legible enough that underlying page content doesn't show through and reduce readability.

---

### User Story 4 - See an accurate rain forecast bar (Priority: P1)

A user looks at the Rain row on the timeline and expects each bar's height to reflect that period's precipitation amount, and every bar to start from the same zero line.

**Why this priority**: Forecast rain bars currently don't align to the same baseline as observed bars and don't visibly change height with the forecasted amount, making the rain row misleading or unreadable for forecast periods — undermining a core piece of information on the dashboard's busiest row.

**Independent Test**: View a period with varying forecasted rain amounts across several columns; confirm every bar (observed and forecast) sits on the same zero baseline and taller bars correspond to larger forecasted amounts.

**Acceptance Scenarios**:

1. **Given** a set of forecast columns with different precipitation amounts, **When** the Rain row renders, **Then** each bar's height is proportional to its own amount and a period with more forecasted rain renders a visibly taller bar than one with less.
2. **Given** an observed column and a forecast column with the same precipitation amount, **When** both are shown on the Rain row, **Then** their bars are the same height and share the same bottom (zero) baseline.

---

### User Story 5 - See wind direction on every timeline resolution (Priority: P1)

A user viewing the 3-day (or 7-day) timeline expects to see a wind-direction indicator alongside the wind speed, the same way the 24-hour view already shows one.

**Why this priority**: Wind direction is silently dropped once observations are aggregated into day/sub-day periods, even though a representative direction is already computed for other purposes — an inconsistency between resolutions that a user is likely to notice quickly.

**Independent Test**: Switch to the 3-day view (and the 7-day view) with wind data present; confirm a direction indicator appears on the Wind row alongside the speed, matching the 24-hour view's convention.

**Acceptance Scenarios**:

1. **Given** wind observations exist for a day or sub-day period, **When** that period is shown on the Wind row of the 3-day or 7-day view, **Then** a direction indicator is shown alongside the speed.
2. **Given** a period has no wind reading at all, **When** it's shown on the Wind row, **Then** no direction indicator is fabricated for it (the existing no-data treatment applies).

---

### User Story 6 - Understand a paired temperature reading (Priority: P2)

A user sees two temperatures shown together (e.g., "18° / 6°") and can't tell what each number means.

**Why this priority**: Confusing but not blocking — the data is present and correct, it's just unlabeled, which erodes trust in the dashboard's accuracy.

**Independent Test**: View the Today card and the timeline's high/low parenthetical; confirm each is clearly labeled so a first-time viewer can identify which number is the high and which is the low.

**Acceptance Scenarios**:

1. **Given** the Today card shows a day's high and low temperature, **When** it renders, **Then** "High" and "Low" (or equivalently clear short labels) are shown next to their respective values.
2. **Given** the timeline shows a high/low parenthetical alongside a period's average temperature, **When** it renders, **Then** it's likewise labeled (or otherwise unambiguous) as high/low rather than two bare numbers.

---

### User Story 7 - See a clean, dated week-ahead forecast (Priority: P2)

A user switches to the "7 Days" tab expecting to see about a week of forecast ahead, each column clearly dated.

**Why this priority**: The 7-day timeline's forecast portion currently keeps extending however far the underlying forecast happens to reach (well past a week for some locations), and its day columns show only a weekday name with no calendar date — both make the "7 Days" tab misleading and harder to orient in.

**Independent Test**: Open the "7 Days" tab; confirm the forecast portion never shows more than 7 forecast days, even when the underlying forecast reaches further out, and that "today" and the observed history stay visible; confirm every column is labeled with both weekday and date.

**Acceptance Scenarios**:

1. **Given** the "7 Days" tab is active and forecast data reaches well beyond a week, **When** the timeline renders, **Then** its forecast portion shows at most 7 forecast days, not more — and "today" (and the observed days before it) are still shown, never dropped to make room.
2. **Given** any day column on the "7 Days" tab, **When** it renders, **Then** its label includes both the weekday and the calendar date (e.g., "Fri 9/5").

---

### User Story 8 - Trust the forecast source shown (Priority: P2)

A user wants the forecast to come from the most reliable source available, wants to know how recent that forecast is, and — if they've chosen to combine sources — wants a single clear reading rather than a wall of per-source detail.

**Why this priority**: Refines an existing 016/018 capability rather than fixing a defect, but directly reflects explicit, repeated user feedback about forecast-source trust and clarity.

**Independent Test**: With "Automatic" selected, confirm SMHI's forecast is used whenever the location is SMHI-covered and SMHI has forecast data, with Open-Meteo used only when SMHI has none. With "Combined" selected, confirm the displayed forecast is a single averaged reading per period (not two side-by-side values), and that a per-source "as of" timestamp is shown somewhere.

**Acceptance Scenarios**:

1. **Given** a location is covered by SMHI and SMHI returns forecast data, **When** "Automatic" is selected, **Then** SMHI's forecast is shown (Open-Meteo's forecast is not blended in).
2. **Given** a location's SMHI forecast is entirely unavailable, **When** "Automatic" is selected, **Then** Open-Meteo's forecast is shown instead (existing fallback behavior, confirmed unchanged).
3. **Given** "Combined" is selected and both sources have forecast data for a period, **When** that period renders, **Then** a single averaged value is shown for that period, not two separate per-source values.
4. **Given** either forecast source is in use, **When** the forecast is shown, **Then** the user can see when that source's forecast was last updated (its own "as of" time where the source provides one, otherwise the time the app last fetched it).

---

### Edge Cases

- What happens when a location has no forecast data at all (e.g., a remote area with only observed data)? The 7-day tab shows only the observed columns it actually has, and no source-freshness timestamp is shown for the absent forecast.
- What happens when both forecast sources fail entirely under "Combined"? No averaged value is fabricated for that period — the existing gap indicator is shown instead.
- What happens on the map view when the user arrived there directly (e.g., a bookmark) with no prior view to return to? The return control falls back to the Overview.
- What happens if a source's "forecast issued" timestamp isn't available from that provider? The app's own last-fetch time is shown for that source instead, so a timestamp is always present when that source's data is shown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The persistent header MUST display the name of the currently selected location on every view (Overview's three tabs, graph, details, and map).
- **FR-002**: The map view MUST provide a visible control that returns the user to the dashboard view they were on before opening the map.
- **FR-003**: The Display menu and the Forecast-sources menu MUST render with a background solid/opaque enough to keep their contents clearly legible in every available theme.
- **FR-004**: The Rain row's bars MUST be scaled proportionally to each period's precipitation amount and MUST share a common zero baseline, for both observed and forecast periods.
- **FR-005**: The Wind row on the 3-day and 7-day timelines MUST show a direction indicator for any period that has a wind reading, consistent with the 24-hour view's treatment.
- **FR-006**: The Today card MUST label its high and low temperatures explicitly (e.g., "High"/"Low") rather than showing two unlabeled numbers.
- **FR-007**: Any timeline display that pairs a high and a low temperature (e.g., the daily/sub-day parenthetical) MUST make clear which value is which.
- **FR-008**: The "7 Days" tab's forecast portion MUST NOT extend beyond 7 forecast days even when the underlying forecast reaches further out, and this cap MUST NOT remove or shorten the observed-history portion (including "today").
- **FR-009**: Each day column on the "7 Days" tab MUST display both the weekday name and the calendar date.
- **FR-010**: When Forecast sources is set to "Automatic," the forecast MUST come from SMHI whenever the location is SMHI-covered and SMHI provides forecast data for the requested period, falling back to Open-Meteo only for periods where SMHI provides none.
- **FR-011**: When Forecast sources is set to "Combined," each forecast period MUST show a single value that averages the two sources' readings, rather than each source's reading shown separately.
- **FR-012**: Whenever a forecast is shown, the user MUST be able to see how recent that forecast is (the source's own "as of"/issued time when available, otherwise the time the app last fetched it).
- **FR-013**: None of the above changes MUST alter the app's existing gap-vs-fabrication behavior — a period with no underlying data continues to show the existing no-data indicator rather than an invented value, in the Rain row, Wind row, temperature pairing, or averaged Combined reading alike.

### Key Entities

- **Forecast source reading**: A named source (SMHI or Open-Meteo)'s forecast values for a period, plus that source's own "as of" freshness time when the source provides one.
- **Combined forecast reading**: A single averaged value derived from the available sources' readings for a period, used only when "Combined" is selected.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time viewer can identify the currently displayed location without opening any menu, on 100% of views.
- **SC-002**: A user who opens the map view can always find and use a way back to the dashboard, with zero dead-end navigation states.
- **SC-003**: Every dropdown menu remains fully legible (text distinguishable from its background) across all available themes, verified visually in each theme.
- **SC-004**: In a Rain row with varying forecast amounts, the tallest bar always corresponds to the largest forecasted amount, and every bar's baseline aligns within a pixel of every other bar's baseline.
- **SC-005**: Wind direction indicators appear for 100% of wind readings on the 3-day and 7-day views that have a wind reading, matching the 24-hour view's rate.
- **SC-006**: In a user comprehension check, a first-time viewer correctly identifies which of two paired temperature numbers is the high and which is the low, without prior explanation.
- **SC-007**: The "7 Days" tab's forecast portion never shows more than 7 forecast columns regardless of how far the underlying forecast reaches, "today" is always visible, and every column's label includes a calendar date.
- **SC-008**: When "Combined" is active, each forecast period shows exactly one value, not multiple per-source values.

## Assumptions

- "SMHI-covered" and the existing SMHI/Open-Meteo fallback mechanism are unchanged by this feature; only the Automatic-mode preference strictness and the Combined-mode display are affected (per FR-010/FR-011).
- Where a provider doesn't expose its own forecast-issued timestamp, the app's own last-fetch time is an acceptable substitute for that source's freshness indicator (FR-012), since no external system guarantees issuance metadata.
- FR-008's cap applies only to the forecast portion; the observed-history portion keeps its existing 7-day lookback unchanged, so the tab's total column count is unaffected when the underlying forecast is short, and capped only on its forward-looking side when the forecast reaches unusually far out.
- The map view's "back" control returns to the dashboard view active before the map was opened; a stateless deep-link into the map falls back to the Overview.
