# Feature Specification: Extended History Window, Additional Weather Metrics, and Display Controls

**Feature Branch**: `003-extended-history-metrics`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "Could you avg decimals to to one decimal. also, add 30 days history. And a tab to switch between rain, windy, maybe cloud coverage. Also, the main view, would it be possible to add the other series to the barcharts? And also an option dropdown, to choose how many near closets to add, 0-4. Default to celsius, and ms/s, mm."

## Clarifications

### Session 2026-08-31

- Q: The existing app shows up to 5 nearby comparison stations (from `001-weather-history-locations`). The new dropdown range is "0-4" — does this replace the old up-to-5 behavior with a new up-to-4 maximum, and what should the default selection be? → A: Max becomes 4; default 4 (closest to today's "always show max" behavior, just one fewer station).
- Q: New metric tabs (rain, wind, cloud coverage) — should nearby comparison stations show a series for each of these metrics too (same as temperature/precipitation today), or are comparison stations limited to temperature/precipitation only? → A: Same comparison behavior for every metric — wind/cloud tabs also show up to N nearby stations when available.
- Q: The existing app defaults temperature/precipitation units to whatever the browser's locale implies (FR-015 from `001-weather-history-locations`), with a manual override. This request asks for a fixed default of "celsius, m/s, mm" — should this replace the locale-based default entirely (always start in metric regardless of locale), or only change what metric values look like once metric is selected? → A: Replace locale detection — new users always default to metric (Celsius/m per s/mm), regardless of browser locale.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a 30-day history alongside the existing views (Priority: P1)

A user who already reviews the last 24 hours and last 7 days wants to zoom out further and see the last 30 days of observed weather for a location, to spot longer-term patterns (e.g., "has this month been unusually dry?").

**Why this priority**: This is the single most-requested new capability (a new time window) and is independently valuable without any of the other asks in this feature.

**Independent Test**: Can be fully tested by opening a location's graph, switching to the new "Last 30 days" window, and confirming a graph of daily-aggregated observed weather for the last 30 days is displayed.

**Acceptance Scenarios**:

1. **Given** the user is viewing a location's observation graph, **When** they select the "Last 30 days" window (alongside the existing "Last 24 hours" and "Last 7 days"), **Then** the app displays one aggregated point per day (high/low/average temperature, total precipitation) for the last 30 days, consistent with how the existing 7-day window aggregates data.
2. **Given** the user is viewing the 30-day window, **When** they use "View details," **Then** the details page shows the same 30-day tabular data.

---

### User Story 2 - Switch between weather metrics via tabs (Priority: P2)

A user wants to look beyond temperature and precipitation — at rain intensity, wind, and cloud coverage — for the same location and time window, using a tab control to switch which metric the graph displays.

**Why this priority**: Expands the app's usefulness beyond the original two metrics; valuable but the app remains functional with temperature/precipitation alone if this isn't delivered.

**Independent Test**: Can be fully tested by opening a location's graph, switching between the metric tabs (temperature/rain, wind, cloud coverage), and confirming the graph redraws to show the selected metric for the same location and time window.

**Acceptance Scenarios**:

1. **Given** the user is viewing a location's graph, **When** they select the "Wind" tab, **Then** the graph redraws to show observed wind speed for the current location and time window, replacing the temperature/precipitation view.
2. **Given** the user is viewing the "Cloud coverage" tab, **When** the graph renders, **Then** it shows observed cloud coverage for the current location and time window.
3. **Given** the user switches tabs, **When** the new metric's graph renders, **Then** the currently selected location, time window, and nearby-station count selection (User Story 4) remain unchanged — only the displayed metric changes.
4. **Given** a metric has no data available for the current location (e.g., the data source doesn't report cloud coverage there), **When** its tab is selected, **Then** the app indicates the metric is unavailable for that location rather than showing an empty or misleading graph.

---

### User Story 3 - See comparison-station data on the bar chart too (Priority: P3)

A user comparing a location against its nearby stations wants the bar-based chart (currently precipitation only) to also show each nearby station's own bars, not just the primary location's, so the comparison is visible on both chart types, not only the line-based temperature view.

**Why this priority**: A visual-completeness improvement on top of the existing comparison feature; the comparison is still available via the line series without this.

**Independent Test**: Can be fully tested by viewing a location with nearby stations and a bar-based metric (e.g., precipitation), and confirming each nearby station's own bar series appears alongside the primary location's, distinguishable from one another.

**Acceptance Scenarios**:

1. **Given** the user is viewing a bar-based metric (e.g., precipitation) for a location with nearby comparison stations, **When** the graph renders, **Then** it shows a bar series for the primary location and a bar series for each selected nearby station, visually distinguishable from one another.
2. **Given** multiple bar series are shown for the same time period, **When** the user inspects the chart, **Then** the primary location's bar remains clearly identifiable as the primary series (consistent with how the line chart already distinguishes the primary series, per `001-weather-history-locations` FR-006).

---

### User Story 4 - Choose how many nearby stations to compare (Priority: P4)

A user wants direct control over how many nearby comparison stations are shown, rather than always seeing the maximum available, so they can reduce clutter or turn comparisons off entirely.

**Why this priority**: A convenience/control enhancement over the existing always-maximum behavior; valuable but not required for the core comparison feature to work.

**Independent Test**: Can be fully tested by opening the nearby-station count control, selecting each available value (0 through the new maximum), and confirming the graph updates to show exactly that many comparison series (or none, at 0).

**Acceptance Scenarios**:

1. **Given** the user is viewing a location's graph, **When** they open the nearby-station count dropdown, **Then** it offers a choice of 0, 1, 2, 3, or 4, defaulting to 4 for users with no saved preference.
2. **Given** the user selects 0, **When** the graph renders, **Then** no comparison-station series are shown, regardless of how many stations are actually available nearby.
3. **Given** the user selects a value greater than the number of stations actually available for a location, **When** the graph renders, **Then** it shows as many as are available (consistent with existing under-the-maximum handling from `001-weather-history-locations` FR-020's "up to" semantics) rather than an error.
4. **Given** the user changes the nearby-station count, **When** they switch locations or metric tabs, **Then** their chosen count is remembered and applied to the new view.

---

### User Story 5 - See rounded, easy-to-read values by default (Priority: P5)

A user viewing tooltips, the details table, or any displayed numeric weather value wants to see a clean, single-decimal number (e.g., "17.8°C") instead of a long, hard-to-scan decimal (e.g., "17.7541666666666°C").

**Why this priority**: A readability polish that applies across every view; low priority because it doesn't change what data is available, only how it's displayed.

**Independent Test**: Can be fully tested by viewing any graph tooltip or the details table and confirming every displayed numeric weather value shows at most one decimal place.

**Acceptance Scenarios**:

1. **Given** the user hovers over any point on any graph (any metric, any window), **When** the tooltip appears, **Then** every numeric weather value shown is rounded to at most one decimal place.
2. **Given** the user opens the details table for any location/window/metric, **When** the table renders, **Then** every numeric weather value shown is rounded to at most one decimal place.

---

### User Story 6 - Sensible default units without relying on locale (Priority: P6)

A user wants the app to start in metric units (Celsius, meters per second, millimeters) by default, rather than depending on browser-locale detection to decide.

**Why this priority**: A default-behavior change affecting first impressions; low priority because a manual unit toggle already exists and lets any user switch regardless of the default.

**Independent Test**: Can be fully tested by clearing any stored unit preference, loading the app fresh, and confirming it displays temperature in Celsius, wind speed in meters per second, and precipitation in millimeters, regardless of browser locale.

**Acceptance Scenarios**:

1. **Given** a user with no previously saved unit preference, **When** they open the app, **Then** temperature is shown in Celsius, wind speed in meters per second, and precipitation in millimeters — regardless of browser locale, replacing the previous locale-based default (`001-weather-history-locations` FR-015).
2. **Given** the user manually switches units, **When** they reload the app, **Then** their manual selection is remembered (unchanged from existing behavior).

---

### Edge Cases

- What happens when a location has data for temperature/precipitation but not wind or cloud coverage? That tab shows an "unavailable" state rather than an empty or misleading graph (User Story 2, edge case).
- What happens to a saved nearby-station-count preference if the user later views a location with fewer available stations than their chosen count? The app shows as many as are available, not an error (User Story 4).
- What happens when the 30-day window has a day with partial or no readings to aggregate? Consistent with the existing 7-day window's behavior, that day's point shows a gap rather than a misleading value.
- What happens to a value that rounds to a whole number (e.g., 18.0)? It still displays with the rounding rule applied consistently (i.e., "18.0", not sometimes "18" and sometimes "18.0") so the decimal formatting reads as uniform across the view.
- What happens if a user had already saved a metric-unit preference (from `001-weather-history-locations`) before this feature ships? Their saved preference is respected; only users with no saved preference are affected by any default change (User Story 6).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST offer a "Last 30 days" observation window, in addition to the existing "Last 24 hours" and "Last 7 days" windows (`001-weather-history-locations` FR-014), showing one aggregated point per day (daily high, low, average temperature, and total precipitation) for the last 30 days.
- **FR-002**: System MUST make the "Last 30 days" window's data available via "View details" in tabular form, consistent with existing windows (`001-weather-history-locations` FR-019).
- **FR-003**: System MUST offer a way to switch the displayed metric among temperature/precipitation (existing default), rain, wind, and cloud coverage, for the currently selected location and time window.
- **FR-004**: System MUST indicate when a selected metric has no available data for the current location, rather than showing an empty or misleading graph.
- **FR-005**: Switching the displayed metric MUST NOT change the currently selected location, time window, or nearby-station count.
- **FR-006**: For any metric rendered as a bar-based chart, System MUST show a bar series for the primary (selected) location and a bar series for each currently-shown nearby comparison station, visually distinguishable from one another, extending the existing line-chart distinguishing behavior (`001-weather-history-locations` FR-006, FR-020) to bar charts.
- **FR-006a**: Nearby comparison stations MUST be shown for every metric (temperature, rain/precipitation, wind, cloud coverage) wherever the data source provides station-level data for that metric — the same "up to N, omitted if unavailable" behavior already defined for temperature/precipitation (`001-weather-history-locations` FR-020, FR-021) applies uniformly to wind and cloud coverage.
- **FR-007**: System MUST provide a control letting the user choose how many nearby comparison stations to show: 0, 1, 2, 3, or 4. This lowers the previous maximum of 5 (`001-weather-history-locations` FR-020) to 4.
- **FR-007a**: System MUST default the nearby-station count to 4 for users with no saved preference.
- **FR-008**: When the user selects 0 nearby stations, System MUST show no comparison-station series on any chart, regardless of availability.
- **FR-009**: When the user's chosen nearby-station count exceeds the number of stations actually available for a location, System MUST show as many as are available rather than an error, consistent with existing "up to N" handling (`001-weather-history-locations` FR-020).
- **FR-010**: System MUST remember the user's chosen nearby-station count and apply it when the user switches location or metric tab.
- **FR-011**: System MUST round every displayed numeric weather value (in tooltips and in the details table) to at most one decimal place, applied uniformly across all metrics and windows.
- **FR-012**: System MUST default new users (no saved unit preference) to Celsius for temperature, meters per second for wind speed, and millimeters for precipitation, regardless of browser locale — replacing the locale-based default from `001-weather-history-locations` FR-015.
- **FR-013**: System MUST continue to respect a user's previously saved unit preference and manual unit toggle, unchanged from existing behavior (`001-weather-history-locations` FR-015's manual-override mechanism; only its locale-based *default* is superseded by FR-012).

### Key Entities

- **Observation Window**: Extended from `001-weather-history-locations` to include a third value, "last 30 days" (one aggregated daily point per day, 30 points), alongside the existing "last 24 hours" (hourly) and "last 7 days" (daily) values.
- **Weather Metric**: A new concept — the category of weather data currently being displayed (temperature/precipitation, rain, wind, cloud coverage). Each Weather Observation may carry additional attributes (wind speed, cloud coverage percentage) beyond the existing temperature/precipitation, where available from the data source.
- **Nearby-Station Count Preference**: A user-controlled setting (0-4, default 4) determining how many Nearby Observation Stations are shown as comparison series, applied uniformly across all metrics; persisted similarly to other display preferences (unit system, theme).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view a 30-day observation history for any location within the same time it takes to view the existing 7-day view (no perceptible additional delay).
- **SC-002**: Users can switch between all available metric tabs and see the graph update to the newly selected metric within 1 second.
- **SC-003**: 100% of displayed numeric weather values (tooltips and details table) show at most one decimal place.
- **SC-004**: Users can change the nearby-station count and see the chart(s) update to reflect exactly the chosen count (or all available, if fewer) within 1 second.
- **SC-005**: A first-time user with no saved preferences sees metric units (Celsius/m per s/mm) without needing to change any setting.
- **SC-006**: On a bar-based metric with nearby stations selected, users can visually distinguish the primary location's bars from each comparison station's bars on first viewing, without external instructions.

## Assumptions

- This feature extends `001-weather-history-locations` and `002-vibrant-award-theme` and does not change any of their requirements except where explicitly superseded above (nearby-station maximum, unit default, decimal display).
- "Rain" is treated as the same underlying precipitation metric already displayed (`001-weather-history-locations` FR-013), now given its own dedicated tab alongside the temperature view rather than being combined into a single default view; the temperature/precipitation combined view remains the default tab.
- Wind and cloud coverage are new weather attributes not previously required; where the underlying data source cannot provide them for a given location (for the primary series or for a nearby station's comparison series, per FR-006a), FR-004's "unavailable" indication applies rather than blocking the rest of the feature.
- A user who already had a saved nearby-station-count or unit preference from before this feature ships keeps that saved value; the new defaults (4 stations; Celsius/m-s/mm) apply only to users with no prior saved preference, consistent with how `001-weather-history-locations`' and `002-vibrant-award-theme`'s defaults were scoped.
- Rounding (FR-011) is a display-only concern — it does not change what data is fetched, stored, or exported (e.g., the details table shows rounded values, not raw un-rounded ones, consistent with "one decimal place" being the single source of truth for display).
- The existing favorites limit (10), theme system, and location-switching behavior are unchanged by this feature.
