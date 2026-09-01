# Feature Specification: Add Weather Forecast

**Feature Branch**: `[005-add-weather-forecast]`

**Created**: 2026-09-01

**Status**: Draft

**Input**: User description: "Add a forecast of weather for same stations, next 24h and next 7d, align with same logic as before. I guess SMHI have it in the api´s. Clarify that the forecast, maybe have a different background color, or a dotted line for future? I know we already have dotted lines for other series. But I want the observation and the forecast to be on the same serie data. The current position, print the name of it it's unclear today."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See tomorrow's forecast alongside today's observations (Priority: P1)

A user checking their location's weather wants to see, in the same 24-hour chart they already use for recent observations, what's expected to happen next — without switching to a separate forecast screen or losing the historical trend they were just looking at.

**Why this priority**: This is the core value of the feature — forward-looking weather is only useful if it's easy to find and directly comparable to what just happened. Without it, the feature delivers no value.

**Independent Test**: Open the 24-hour view for a supported location and verify the chart extends past "now" with predicted values for temperature, continuing the same line/series used for observed values.

**Acceptance Scenarios**:

1. **Given** a user is viewing the 24-hour chart for a supported station, **When** the chart loads, **Then** it shows observed values for the past hours and forecast values for the upcoming hours, on the same series/line per metric.
2. **Given** a user is viewing the 24-hour chart, **When** they look at the chart, **Then** they can visually tell which points are observed (measured) and which are forecast (predicted) without needing to hover or open a details view.
3. **Given** a user switches metric tabs (temperature, rain, wind, cloud), **When** forecast data exists for that metric, **Then** the forecast continuation is shown for that metric too, following the same visual distinction.
4. **Given** the "view details" data table is open, **When** it includes upcoming hours, **Then** each row is labeled as observed or forecast.

---

### User Story 2 - See the week ahead alongside the week just passed (Priority: P2)

A user who normally checks the 7-day history wants to see the coming week's outlook in the same view, using the same daily high/low/average summary style already used for past days.

**Why this priority**: Extends the same value to a longer, planning-relevant horizon, but depends on the 24-hour merge working first (P1) since it reuses the same merge and distinction logic at a daily grain.

**Independent Test**: Open the 7-day view for a supported location and verify it shows daily aggregates for the past week and daily forecast aggregates for the upcoming week, in the same chart.

**Acceptance Scenarios**:

1. **Given** a user is viewing the 7-day chart for a supported station, **When** the chart loads, **Then** it shows daily high/low/average for past days and forecast daily high/low/average for upcoming days, using the same aggregation logic as historical daily rows.
2. **Given** a user is viewing the 7-day chart, **When** they look at the chart, **Then** they can visually tell which days are historical and which are forecast.
3. **Given** the forecast provider does not supply a full 7 days of outlook for a location, **When** the chart renders, **Then** it shows forecast only for the days actually available and does not fabricate missing days.

---

### User Story 3 - Know where "current location" weather is actually coming from (Priority: P3)

A user who lets the app use their current position wants to see the actual place name their weather is based on, instead of the generic "Current Location" label shown today, so they can trust and identify the data.

**Why this priority**: A real, standalone clarity fix independent of forecast data — valuable on its own, and doubly useful once forecast is added since users will want to trust which station both their observed and forecast data represent.

**Independent Test**: Grant location access, load the app, and verify the location name shown in the chart heading and legend is a specific, identifiable place/station name rather than the literal text "Current Location".

**Acceptance Scenarios**:

1. **Given** a user grants browser location access, **When** their nearest weather station is resolved, **Then** the chart heading and legend show that station's actual name instead of "Current Location".
2. **Given** the resolved station has no usable name from the data provider, **When** the app displays the location, **Then** it falls back to the existing "Unnamed station" pattern already used elsewhere in the app, rather than showing "Current Location".
3. **Given** a user has previously selected a favorite or searched location, **When** they view its chart, **Then** the naming behavior is unchanged (this fix only affects the current-position case).

---

### Edge Cases

- What happens when a location is outside forecast coverage even though historical observations are available for it?
- How does the system handle the moving boundary between "observed" and "forecast" as real time passes (e.g., a chart left open across the observed/forecast boundary)?
- What happens when the forecast provider returns data for only some metrics (e.g., temperature and wind, but not cloud cover)?
- How does the system handle a forecast value that is later superseded by an actual observation for the same hour (the two "same serie" values disagree)?
- What happens when nearby comparison stations lack forecast data even though the primary station has it?
- How does the system indicate forecast data has gone stale (e.g., a chart left open for many hours without a refresh)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a weather forecast for the next 24 hours for the currently selected location's weather station, at the same hourly granularity used for the existing 24-hour observation view.
- **FR-002**: System MUST display a weather forecast for the next 7 days for the currently selected location's weather station, using the same daily high/low/average aggregation logic used for the existing 7-day observation view.
- **FR-003**: Forecast values MUST be rendered as a continuation of the same chart series/line as historical observed values for that metric, not as a separate series.
- **FR-004**: System MUST visually distinguish the forecast portion of a series from its observed portion using a dotted line for the forecast segment, consistent with the dashed-line convention already used elsewhere in the charts.
- **FR-005**: Forecast MUST be available for the same weather metrics currently shown for observations (temperature, precipitation, wind, cloud cover), for whichever of those metrics the data source provides forecast values.
- **FR-006**: Forecast MUST be shown only for the primary selected location's series; nearby comparison stations continue to show historical data only, unaffected by this feature.
- **FR-007**: When the user switches location (current position, a favorite, or a searched place), the forecast MUST update to reflect the newly selected location's nearest weather station, consistent with how historical data is resolved today.
- **FR-008**: When using the current-position/geolocation-based location, System MUST display the resolved weather station's actual name (the same station used to source its observations) in place of the generic "Current Location" label used today, falling back to the existing "Unnamed station" text when the station has no usable name.
- **FR-009**: System MUST clearly indicate when forecast data is unavailable for a given metric or location, following the existing "data unavailable" messaging pattern used for other unavailable metrics.
- **FR-010**: System MUST label forecast points (e.g., in tooltip and/or legend) as predictions, distinct from measured observations, so users do not mistake forecast for historical fact.
- **FR-011**: The existing "view details" data table MUST include upcoming forecast rows in addition to observed rows, with each row indicating whether it is observed or forecast.
- **FR-012**: The existing unit toggle and theme settings MUST apply to forecast values the same way they apply to observed values.

### Key Entities

- **Forecast Data Point**: A predicted value for a single weather metric (temperature, precipitation, wind, cloud cover) at a specific future time, tied to a weather station, distinct from an observed value only by its "forecast" status.
- **Merged Metric Series**: The single chart-ready timeline per metric that spans from recent observed values into upcoming forecast values, with each point tagged as observed or forecast so the chart can render them as one continuous, visually-differentiated line.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any location currently supported for historical observations, users can view a merged observed+forecast timeline for the next 24 hours without navigating away from the existing chart view.
- **SC-002**: For any location currently supported for historical observations, users can view a merged observed+forecast timeline for the next 7 days without navigating away from the existing chart view.
- **SC-003**: In an unmoderated usability check, at least 95% of viewers can correctly point to where "forecast" begins on a chart within 5 seconds, without hovering or opening the details table.
- **SC-004**: 100% of current-position sessions display a specific place/station name rather than the generic "Current Location" label (excluding the documented "Unnamed station" fallback case).
- **SC-005**: When forecast data is unavailable for a metric or location, 100% of affected views show an explicit unavailable-data message rather than a blank or broken chart.

## Assumptions

- Forecast data will be sourced from the same meteorological data provider(s) already used for historical observations (today: primarily SMHI, falling back to Open-Meteo outside SMHI coverage), reusing the existing provider/coverage/fallback pattern rather than introducing a new one.
- Forecast horizon is capped at what this feature requires (next 24 hours / next 7 days) even if the underlying provider offers a longer outlook.
- "Same logic as before" means forecast data is shaped and aggregated using the existing hourly (24h view) and daily high/low/average (7d view) logic already used for historical observations, not a new aggregation scheme.
- The dotted-line convention used for forecast continuation is understood by users as "not yet observed," distinct from the existing dotted-line convention used to distinguish comparison-station identity; both can coexist in the same chart without confusing users, since the forecast dotted segment always trails the same-colored solid observed segment of the same series.
- Nearby comparison stations (up to 4, shown today) are out of scope for forecast in this iteration; only the primary selected location's series is affected.
- Forecast data refreshes on the same cadence/trigger as historical observation data (e.g., on page load / existing refresh interval), with no new dedicated refresh mechanism introduced.
