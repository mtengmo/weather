# Feature Specification: Combined Weather Icon Overview

**Feature Branch**: `[007-weather-icon-overview]`

**Created**: 2026-09-01

**Status**: Draft

**Input**: User description: "add a new view, with combine data of everything, with weather icons for sun, cloud, rain, windy, snow, moon based on the data you have. i guess you could find some online example. icons should be easy to understand. maybe do it the page a lot bigger so it scale the screen size"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the next 24 hours at a glance with icons (Priority: P1)

A user checking their selected location's weather wants to understand, in a few seconds, what the next 24 hours will generally be like — sunny, cloudy, rainy, windy, or snowy — without switching between separate temperature/rain/wind/cloud tabs and reading numbers.

**Why this priority**: This is the core of the request — a single combined view that summarizes everything at once, using icons instead of requiring the user to interpret several charts. It delivers the primary value on its own.

**Independent Test**: Open the new overview view for a location with a full 24 hours of data; verify each displayed time period shows one clear weather icon (sun, cloud, rain, wind, or snow, or moon at night) that matches that period's underlying temperature/precipitation/wind/cloud data, alongside the key values it's based on.

**Acceptance Scenarios**:

1. **Given** a user opens the new overview view for a location with normal, complete data, **When** the view loads, **Then** it shows one weather icon per displayed hour (or comparable time slice) across the next 24 hours, each representing that period's overall condition.
2. **Given** a period's data indicates clear skies at night, **When** its icon is shown, **Then** it displays a moon icon rather than a sun icon.
3. **Given** a period's data indicates more than one condition at once (e.g., windy and rainy), **When** its icon is chosen, **Then** exactly one icon is shown, chosen by a consistent priority so the result isn't ambiguous, and the underlying values remain visible near the icon.
4. **Given** a period includes forecast (not yet observed) data, **When** its icon is shown, **Then** it's visually distinguished as a forecast, consistent with how forecast data is already distinguished elsewhere in the app.
5. **Given** a period is missing the data needed to determine a condition, **When** its icon slot is shown, **Then** it displays a distinct "no data" indicator instead of guessing a specific weather icon.

---

### User Story 2 - See the week ahead the same way (Priority: P2)

A user planning a few days ahead wants the same at-a-glance icon summary, but for the 7-day view — one representative icon and summary per day instead of per hour.

**Why this priority**: Extends the same core value to a longer, planning-relevant horizon. Depends on User Story 1's icon-selection logic already existing, so it's a smaller increment once that's built.

**Independent Test**: Switch the overview view to the 7-day period; verify each of the 7 days shows one weather icon representing that day's overall condition, alongside key daily values (e.g., high/low temperature).

**Acceptance Scenarios**:

1. **Given** a user switches the overview view to the 7-day period, **When** it loads, **Then** it shows one weather icon per day for the next 7 days, each representing that day's overall condition.
2. **Given** a day includes forecast data, **When** its icon is shown, **Then** it's visually distinguished as a forecast, the same way User Story 1 distinguishes forecast hours.

---

### User Story 3 - A view that actually uses the screen (Priority: P3)

A user opening the overview view wants it to take advantage of their screen size — filling more of the browser window on a desktop, and adapting sensibly on a smaller window — rather than being squeezed into the same small fixed-size box the existing charts use.

**Why this priority**: A presentation refinement on top of User Stories 1–2. The icon overview delivers its core value even in a modestly-sized box, but the user specifically asked for it to scale with the screen, so this is worth doing as part of the same feature rather than a fixed small widget.

**Independent Test**: Resize the browser window while the overview view is open; verify the icon grid/layout visibly grows and shrinks to use the available space, remaining legible at both a small and a large window size.

**Acceptance Scenarios**:

1. **Given** a user opens the overview view in a large browser window, **When** it renders, **Then** it visibly occupies substantially more of the window than the existing chart views do today.
2. **Given** a user resizes the browser window smaller, **When** the overview view re-renders, **Then** the icons and layout adapt to remain legible rather than overflowing or becoming unusably tiny.

---

### Edge Cases

- What happens when a time period's cloud cover, precipitation, or wind data is null/missing (a data gap)? It shows the distinct "no data" indicator (User Story 1, Acceptance Scenario 5) rather than a potentially-misleading specific icon.
- What happens on the 30-day window? Out of scope for this feature — the icon overview covers the 24-hour and 7-day periods only, matching where forecast data (and thus the most "planning at a glance" value) already exists.
- What happens for the up-to-4 nearby comparison stations? Out of scope — the overview summarizes the primary selected location only, consistent with how other single-purpose views in this app already work.
- What happens when a location has no forecast data at all (e.g., the "forecast unavailable" case from a prior feature)? The overview shows icons only for the periods that do have data (observed hours/days), with no icons — not guessed ones — for the periods that don't.
- What happens when snow and rain conditions are both technically possible for a period (e.g., precipitation present near freezing)? The icon selection uses one consistent, defined rule (based on temperature) to pick a single icon rather than showing both or picking inconsistently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a new view that shows a combined overview of temperature, precipitation, wind, and cloud cover for the currently selected location's 24-hour period, without requiring the user to switch between separate per-metric tabs.
- **FR-002**: The overview MUST show one weather icon per displayed time period (hourly for the 24-hour view, daily for the 7-day view), representing that period's overall condition as one of: clear/sunny, clear/night, cloudy, rainy, windy, or snowy.
- **FR-003**: The system MUST determine whether a period is "day" or "night" (to choose between a sun and a moon icon for clear conditions) using a reasonable, consistent method.
- **FR-004**: System MUST also provide the same combined-icon overview for the currently selected location's 7-day period, with one icon and summary per day.
- **FR-005**: When a period's data indicates more than one condition at once, the icon selection MUST follow one consistent, defined priority order so exactly one unambiguous icon is shown, while the underlying values (temperature, wind speed, precipitation, cloud cover) remain visible near the icon.
- **FR-006**: The weather icons MUST be immediately recognizable, conventional symbols for their condition (not custom, ambiguous, or unfamiliar shapes) so users can interpret them without a legend.
- **FR-007**: When a period includes forecast (not yet observed) data, its icon MUST be visually distinguished as a forecast, consistent with how forecast data is already distinguished elsewhere in the app.
- **FR-008**: When a period is missing the data needed to determine its condition, System MUST show a distinct "no data" indicator for that period instead of an icon implying a specific (possibly wrong) condition.
- **FR-009**: Users MUST be able to navigate to the new overview view from, and back to, the existing chart/details views for the currently selected location.
- **FR-010**: The overview view MUST reflect the user's existing unit system (metric/imperial) and theme selections, consistent with the rest of the app.
- **FR-011**: The overview view's layout MUST scale to use substantially more of the available browser window than the existing fixed-size chart views, and MUST remain legible when the window is resized smaller.

### Key Entities

- **Weather Condition**: A single classification (clear-day, clear-night, cloudy, rainy, windy, or snowy) derived from a time period's temperature, precipitation, wind speed, and cloud cover values, used to select that period's icon.
- **Icon Overview Period**: One displayed time slice (an hour, for the 24h view; a day, for the 7-day view) paired with its derived Weather Condition, its key underlying values, and whether it's observed or forecast data (or missing entirely).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can determine, without reading any numbers, whether the upcoming hours or days will be generally sunny, cloudy, rainy, windy, or snowy, for their selected location.
- **SC-002**: The overview view visibly occupies a majority of the browser window's available space on a typical desktop window size, rather than a small fixed-size box.
- **SC-003**: 100% of time periods with complete underlying data show one of the six defined weather icons; 100% of periods with missing data show the distinct "no data" indicator instead of a guessed icon.
- **SC-004**: 100% of forecast periods shown in the overview are visually distinguishable from observed periods.

## Assumptions

- "Combine data of everything" is interpreted as unifying the four already-tracked metrics (temperature, precipitation, wind speed, cloud cover) into one glanceable icon-based summary per time period, for the currently selected location — not a merge across multiple locations or stations.
- Day/night determination (FR-003) uses a simple, consistent local-time-of-day rule (e.g., a fixed morning/evening boundary) rather than location-specific sunrise/sunset calculation, since the app does not currently source sunrise/sunset data. This can be revisited later if more precision is wanted.
- Condition-priority order (FR-005) defaults to: snowy > rainy > windy > cloudy > clear, i.e., precipitation-based conditions take priority over wind, which takes priority over cloud cover, which takes priority over a clear sky — matching common weather-app conventions where precipitation is the most planning-relevant condition.
- The weather icons themselves will be a widely-recognized, conventional symbol set (the kind already used across most weather apps/sites) rather than a custom-designed icon set, so they read as familiar on sight per FR-006.
- The 30-day window and nearby comparison stations are out of scope for this feature's icon overview (Edge Cases) — it applies only to the primary selected location's 24-hour and 7-day periods.
- This is an additional, separately-navigable view alongside the app's existing chart and details views (not a replacement for either), consistent with how the app already offers multiple views of the same underlying data.
