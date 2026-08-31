# Feature Specification: Weather Observation History for Current Position and Favorite Places

**Feature Branch**: `001-weather-history-locations`

**Created**: 2026-08-30

**Status**: Draft

**Input**: User description: "Weather observation last day and last week for current position and some favo saved places"

## Clarifications

### Session 2026-08-30

- Q: How should the last-24-hours and last-week observation history be presented to the user — as an hourly-resolution timeline for both windows, or as an hourly timeline for the last day and a daily summary (e.g., high/low/total) for the last week? → A: Hourly for both (uniform hourly-resolution data points for both the 24h and 7-day windows, no daily aggregation).
- Q: What unit system should temperature and precipitation be displayed in? → A: Default to the unit system implied by the browser's locale (°C/mm or °F/in), with a manual toggle available for the user to switch.
- Q: If a saved favorite place can no longer be resolved by the weather/geocoding provider (e.g., a temporary outage or an ambiguous stored location), what should happen to that favorite? → A: Keep it in the list and show an inline error/unavailable message when selected; the user can still remove it manually. Never auto-delete a favorite on a resolution failure.
- Q: For the weekly view, what should each plotted point represent? → A: One point per day (7 points), showing that day's high, low, and average temperature plus total precipitation — this supersedes the earlier "hourly for both windows" answer for the weekly view only; the 24-hour view remains hourly.
- Q: What are the "five closest observation places" that should appear as extra comparison series? → A: The 5 physical weather-observation stations nearest the selected location, where the data source provides discrete station-level data.
- Q: What should happen for locations where the data source has no discrete nearby stations to compare against? → A: Hide the comparison series entirely for that location; show only the selected location's own data.
- Q: How should users reach the underlying data table? → A: A "View details" control on each graph opens a details page showing the tabular data for that location and window.

### Session 2026-08-31

- Q: What does "implement a modern and luxury UI" concretely mean for this app's visual design? → A: Rather than one fixed visual direction, the app offers a small set of curated, user-selectable themes — each theme is a distinct take on "modern and luxury" (this generalizes the earlier per-theme options into a theme-picker requirement).
- Q: Which themes should be included in the initial theme set? → A: Three themes — "Midnight" (dark, editorial/premium: deep neutral backgrounds, high-contrast typography, a restrained metallic accent color), "Ivory" (light, minimalist/luxury: soft off-white backgrounds, elegant typography, generous whitespace), and "Glass" (glassmorphism/premium-tech: translucent frosted panels, soft gradients, blur effects, a vibrant accent color).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View recent weather history for current location (Priority: P1)

A user opens the app and wants to see what the weather has actually been like — not a forecast — at their current location over the last day and the last week, so they can understand recent conditions (e.g., "has it been unusually hot/rainy lately?").

**Why this priority**: This is the core value of the feature and the primary reason a user opens the app. Without this, there is no feature.

**Independent Test**: Can be fully tested by granting/simulating location access, opening the app, and verifying that last-24-hours and last-7-days observation data is displayed for that location.

**Acceptance Scenarios**:

1. **Given** the user has granted location access, **When** they open the app, **Then** the app displays a graph of observed weather (temperature and precipitation) for their current location covering the last 24 hours, plotted hourly.
2. **Given** the user is viewing their current location's weather history, **When** they switch to the weekly view, **Then** the app displays a graph of observed weather for the last 7 days for the same location, plotted as one daily high/low/average temperature and total precipitation point per day.
3. **Given** the user has not granted location access, **When** they open the app, **Then** the app informs them location is unavailable and offers a way to proceed (e.g., pick a saved place or search for a location) instead of showing an error with no path forward.
4. **Given** the user is viewing either graph, **When** they use the "View details" control, **Then** the app shows a details page with the underlying observation data for that location and window in a table.

---

### User Story 2 - Save and view favorite places (Priority: P2)

A user wants to save a small set of places they care about (e.g., hometown, a family member's city, a frequent travel destination) and view the same last-day/last-week observation history for each without re-entering the location every time.

**Why this priority**: Extends the core value beyond a single current location, which is the second most common use case, but the app is still useful with just current-location history.

**Independent Test**: Can be fully tested by adding a place by name/search, confirming it is saved, reopening the app, and verifying the saved place still appears with its own last-day/last-week observation history.

**Acceptance Scenarios**:

1. **Given** the user is viewing the app, **When** they search for and add a place, **Then** that place is saved to their list of favorite places and remains after the app is closed and reopened.
2. **Given** the user has one or more saved favorite places, **When** they select a saved place, **Then** the app displays that place's last-day and last-week observed weather history.
3. **Given** the user has a saved favorite place, **When** they remove it from favorites, **Then** it no longer appears in the favorites list on subsequent visits.
4. **Given** the user attempts to add a new favorite place beyond the maximum allowed, **When** they try to save it, **Then** the app prevents the addition and explains the limit has been reached.

---

### User Story 3 - Switch between locations quickly (Priority: P3)

A user with several saved places wants to quickly move between their current location and each favorite place to compare recent weather at a glance.

**Why this priority**: A convenience/usability enhancement on top of P1 and P2; valuable but not required for the feature to deliver its core benefit.

**Independent Test**: Can be fully tested by having at least one favorite place saved alongside current location, then switching between them and confirming the displayed observation data updates to match the selected location each time.

**Acceptance Scenarios**:

1. **Given** the user has current location and at least one favorite place available, **When** they switch selection from one to another, **Then** the displayed last-day/last-week data updates to reflect the newly selected location within a few seconds.

---

### User Story 4 - Compare with nearby weather stations (Priority: P4)

A user viewing a location's weather history wants to see, at a glance, how conditions there compare to a handful of the nearest physical weather-observation stations — e.g., to gauge how local/hyperlocal the reading is, or spot a station-specific anomaly.

**Why this priority**: A comparison/context enhancement on top of US1–US3; useful but not required for the feature's core value, and only meaningful where the data source actually has nearby discrete stations to compare against.

**Independent Test**: Can be fully tested by selecting a location that has nearby observation stations and verifying the graph shows the location's own series plus up to 5 nearby-station series; and by selecting a location with no nearby stations and verifying only the location's own series is shown.

**Acceptance Scenarios**:

1. **Given** the user is viewing the 24-hour or weekly graph for a location that has nearby observation stations, **When** the graph renders, **Then** it includes the selected location's own series plus comparison series for up to the 5 nearest observation stations, visually distinguishable from each other.
2. **Given** the user is viewing a location with no nearby observation stations available, **When** the graph renders, **Then** only the selected location's own series is shown, with no comparison series and no error.
3. **Given** fewer than 5 nearby stations exist for a location, **When** the graph renders, **Then** it shows comparison series for however many are available (up to 5) rather than an error or a request for more.

---

### User Story 5 - Choose a visual theme (Priority: P5)

A user wants the app to feel modern and premium, and to be able to pick the visual style that suits their taste from a small set of curated, distinct themes.

**Why this priority**: A cosmetic/branding enhancement — it changes how the app looks, not what it does, so it doesn't affect any other story's core functionality; lowest priority.

**Independent Test**: Can be fully tested by switching between the available themes and confirming the app's visual styling (background, typography, accent color) changes accordingly on every screen, and that the choice persists after a reload.

**Acceptance Scenarios**:

1. **Given** the user opens the app for the first time with no theme preference saved, **When** the app loads, **Then** it displays using the default theme ("Midnight").
2. **Given** the user is viewing the app, **When** they open the theme picker and select a different theme, **Then** the app's visual appearance updates across every screen (graphs, details page, favorites, other controls) to match the chosen theme.
3. **Given** the user has selected a theme, **When** they reload the app or return in a later session, **Then** the app displays using their previously selected theme.

---

### Edge Cases

- What happens when observation data for part of the last day/week is missing or unavailable from the data source (e.g., a gap in the historical record)? The app should indicate a gap rather than showing a misleading flat/zero value.
- If a saved favorite place can no longer be resolved (e.g., provider outage or ambiguous stored location), the app keeps it in the favorites list and shows an inline error/unavailable message when selected, rather than silently removing it; the user may still remove it manually.
- What happens when the device's location cannot be determined (permission denied, no GPS signal, offline)?
- How does the system handle duplicate favorite place entries (same place added twice)?
- What happens when the user has zero favorite places saved — is current location still shown by default?
- How does the system behave when the user is offline and no cached observation data exists for the selected location?
- What happens when a day within the weekly window has partial or no hourly readings to aggregate from — does that day's graph point show a gap rather than a misleading high/low/average?
- What happens when one of the up-to-5 nearby comparison stations has missing data for part of the window — does only that station's series show a gap, without affecting the other series?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display observed (historical, not forecast) weather for the user's current location covering the most recent 24 hours.
- **FR-002**: System MUST display observed weather for the user's current location covering the most recent 7 days.
- **FR-003**: System MUST allow the user to request their device's current location to determine "current position" weather.
- **FR-004**: System MUST allow the user to add a place (by search or selection) to a list of favorite/saved places.
- **FR-005**: System MUST allow the user to remove a place from their list of favorite/saved places.
- **FR-006**: System MUST persist the user's favorite places across app sessions.
- **FR-007**: System MUST display last-24-hours and last-7-days observed weather for any selected favorite place, in the same manner as for current location.
- **FR-008**: System MUST allow the user to switch between viewing current location and any saved favorite place.
- **FR-009**: System MUST limit the number of favorite places a user can save to 10, and MUST inform the user when this limit is reached.
- **FR-010**: System MUST indicate to the user when observation data is missing or unavailable for part of the requested time range, rather than presenting a misleading value.
- **FR-011**: System MUST inform the user when current location cannot be determined and provide an alternative path (e.g., select a favorite place or search manually).
- **FR-012**: System MUST prevent duplicate entries of the same place in the favorites list.
- **FR-013**: Observed weather displayed MUST include, at minimum, temperature and precipitation for each time period shown.
- **FR-014**: System MUST display the last-24-hours window at hourly resolution (24 points), and MUST display the last-7-days window as one aggregated point per day (7 points: daily high, low, and average temperature, and daily total precipitation) — no hourly-for-both requirement remains (superseded, see Clarifications).
- **FR-015**: System MUST display temperature and precipitation using the unit system (metric or imperial) implied by the user's browser locale by default, and MUST allow the user to manually switch between metric and imperial units.
- **FR-016**: System MUST retain a saved favorite place in the favorites list when its location cannot be resolved (e.g., provider outage or ambiguous data), showing an inline error/unavailable message for that place when selected instead of removing it automatically; the user MAY still remove it manually.
- **FR-017**: System MUST present the last-24-hours observation data as a graph (not a table) on the primary view.
- **FR-018**: System MUST present the last-7-days observation data as a graph (not a table) on the primary view, using the daily aggregation defined in FR-014.
- **FR-019**: System MUST provide a "View details" control on each graph that opens a details page showing the underlying observation data for that location and window in tabular form.
- **FR-020**: For a location where the data source provides discrete nearby weather-observation stations, System MUST include, on both graphs, comparison series for up to the 5 nearest such stations in addition to the selected location's own series, visually distinguishable from one another.
- **FR-021**: For a location where the data source has no discrete nearby stations to compare against, System MUST show only the selected location's own series, with no error and no placeholder comparison series.
- **FR-022**: System MUST indicate a gap (per FR-010) independently for each series — the selected location's own series and each nearby-station comparison series — so that missing data in one series does not misrepresent or hide data in another.
- **FR-023**: System MUST offer the user a choice of at least 3 distinct visual themes — a dark "Midnight" theme, a light "Ivory" theme, and a "Glass" theme — each presenting a modern, premium visual style (distinct color palette and typography treatment).
- **FR-024**: System MUST apply the user's selected theme consistently across every screen (graphs, details page, favorites list, and all controls).
- **FR-025**: System MUST persist the user's selected theme across sessions, defaulting to "Midnight" when no preference has been set.

### Key Entities

- **Location**: A geographic point (current device position or a named/saved place) for which weather observations are retrieved. Attributes: display name, coordinates, source (current position vs. saved place).
- **Favorite Place**: A user-saved Location, persisted across sessions, with a user-assigned or resolved display name. Belongs to one user.
- **Weather Observation**: A historical (already-occurred) weather data point tied to a Location and a timestamp. Attributes: temperature, precipitation, timestamp.
- **Observation Window**: The reporting period requested for display — either "last 24 hours" (hourly points) or "last 7 days" (one aggregated daily point per day: high/low/average temperature, total precipitation) — relative to the current time.
- **Nearby Observation Station**: A physical weather-observation station near a selected Location, available only where the data source exposes discrete station-level data. Attributes: display name/identifier, coordinates, distance from the selected Location. Up to 5 nearest stations are shown as comparison series alongside the selected Location's own data (User Story 4).
- **Theme**: A named, app-wide visual style the user can select (id, display name — e.g., "Midnight", "Ivory", "Glass"). Persisted as a user preference; applies uniformly across all screens (User Story 5).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view last-24-hours observed weather for their current location within 5 seconds of opening the app (given location access already granted).
- **SC-002**: Users can save a new favorite place and see its observation history in under 30 seconds from initiating a search.
- **SC-003**: 95% of requests to switch between current location and a saved favorite place update the displayed data within 3 seconds.
- **SC-004**: Users can successfully add, view, and remove a favorite place without needing external instructions (first-attempt success in usability testing) at least 90% of the time.
- **SC-005**: The app correctly indicates missing observation data (rather than showing misleading values) in 100% of cases where the underlying data source has a gap.
- **SC-006**: Users can reach the underlying data table for any graph (the details page) in a single interaction from that graph.
- **SC-007**: For a location with nearby observation stations, users can visually distinguish the selected location's own series from each comparison series on first viewing, without needing external instructions.
- **SC-008**: Users can switch between any of the available themes and see the change applied across the whole app within 1 second, with no page reload required.

## Assumptions

- "Last day" is interpreted as the most recent 24 hours of observed data, and "last week" as the most recent 7 days, both relative to the current time (not fixed calendar day/week boundaries).
- "Weather observation" refers to actual historical/recorded conditions, not forecasted conditions.
- Users may use the app without saving any favorite places; current-location viewing does not require favorites to be configured.
- A reasonable cap of 10 saved favorite places balances usability with typical user needs; this is a default assumption, not an explicit requirement from the user.
- The app has access to a weather/observation data provider capable of returning historical (not just forecast) data for arbitrary coordinates; provider selection is an implementation detail out of scope for this specification.
- Device location access is requested using standard platform permission prompts; no custom consent flow is required beyond informing the user when access is unavailable.
- Minimum displayed metrics are temperature and precipitation; additional metrics (wind, humidity, etc.) may be added later but are not required for this feature.
- Not every weather data source exposes discrete, per-station observation data; the nearby-station comparison (User Story 4) is only available where the source does, and is simply omitted elsewhere — this is expected, not a defect.
- "Nearest" for comparison stations is by geographic distance to the selected location, not by data recency, quality, or any other ranking.
- The details page shows the exact same underlying data already fetched for the graph; it does not require a separate data request or a different level of aggregation than what its corresponding graph is showing.
- Themes affect only visual presentation (colors, typography, decorative styling, and similar surface treatments) — they do not change any functional behavior, layout structure, or data shown by the app; the same requirements and acceptance scenarios apply identically regardless of which theme is active.
- The exact colors, fonts, and other visual design tokens for each theme are an implementation detail beyond this specification's scope; FR-023 fixes only the three theme names/identities and their general character (dark/light/glass), not their precise styling.
