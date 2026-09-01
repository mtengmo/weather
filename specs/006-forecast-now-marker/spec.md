# Feature Specification: Forecast "Now" Marker & Availability Resilience

**Feature Branch**: `[006-forecast-now-marker]`

**Created**: 2026-09-01

**Status**: Draft

**Input**: User description: "add a vertical line on 'now', so it will be easier to find forecast. The station I have nearest now doesn't have a forecast and is unknown, maybe possible to improve? elaborate on it."

## Clarifications

### Session 2026-09-01

- Q: When the primary weather source has observed data for a location but not a forecast, should the fallback keep the primary source's already-loaded observed data (and station identity) and only pull the forecast portion from the secondary source, or should it discard the primary's data and switch the whole series (observed + forecast) to the secondary source? → A: Keep observed, swap forecast only — the primary source's observed values and station identity are preserved; only the missing forecast is sourced from the secondary provider.
- Q: If only some metrics (e.g. wind) are missing a forecast from the primary source while others (e.g. temperature) have one, should the app swap in the secondary source's forecast only for the metrics that are actually missing, or treat it as all-or-nothing and swap every metric's forecast to the secondary source together? → A: All-or-nothing swap — if any tracked metric is missing a forecast from the primary source, the whole location's forecast (all metrics) is sourced from the secondary provider instead, so all metrics' forecasts stay consistent with each other.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See exactly where "now" is on the chart (Priority: P1)

A user looking at a 24-hour or 7-day chart wants to immediately see where the observed (measured) portion ends and the forecast (predicted) portion begins, without having to study the dashed-line styling or hover over points to figure it out.

**Why this priority**: The forecast feature (005) already draws the forecast segment differently (dashed/lighter), but a user reported it's still not obvious at a glance where "now" actually falls on the timeline. A single, unambiguous marker directly addresses that gap and is the most requested, lowest-risk part of this request.

**Independent Test**: Open a 24-hour or 7-day chart for a location that has forecast data, and verify a distinct vertical marker appears at the point on the X-axis corresponding to the current time, visible without hovering.

**Acceptance Scenarios**:

1. **Given** a user is viewing the 24-hour chart for a location with forecast data, **When** the chart renders, **Then** a vertical marker appears at the current-hour position, clearly separating the observed portion (to its left) from the forecast portion (to its right).
2. **Given** a user is viewing the 7-day chart for a location with forecast data, **When** the chart renders, **Then** the same vertical marker appears at the boundary between the most recent observed day and the first forecast day.
3. **Given** a user leaves a chart open across the moment forecast data was fetched, **When** enough real time passes, **Then** the marker's position (and the observed/forecast split around it) stays accurate to the current time rather than freezing at load time.
4. **Given** a location has no forecast data at all (e.g., the 30-day view, or a location where no forecast could be obtained), **When** the chart renders, **Then** no "now" marker is shown, so its presence isn't mistaken as a promise of forecast data that doesn't exist.

---

### User Story 2 - Don't lose the forecast just because one data source couldn't provide it (Priority: P2)

A user whose nearest weather station has observed data but, on inspection, matches the description of a location where the primary weather-data source didn't return any forecast for their exact spot — leaving them without a forecast and no explanation of why, while comparison locations elsewhere show one fine.

**Why this priority**: This directly addresses the second half of the report. It's lower priority than the visual fix (P1) because it's a resilience/edge-case improvement affecting a subset of locations, but it meaningfully closes a real gap: today, if the primary source's forecast lookup fails or returns nothing for a location — even though that location's historical/observed data loaded successfully — the app silently shows no forecast, with no attempt to get it from the app's other data source and no message explaining why.

**Why this happens today (investigation)**: The name shown for "current location" and the availability of forecast data come from two independent lookups. The displayed name comes from finding the nearest weather-observation *station* by name; the forecast comes from a location-based (not station-based) lookup against the primary source, with the secondary source used only when the primary source's *observed* data fails outright. If the primary source's forecast lookup specifically comes back empty for a given spot (temporary gap, network hiccup, or a spot outside that source's effective forecast grid) while its *observed* data still loads fine, the app currently has no fallback for that one piece — it just shows nothing, and a user has no way to tell that from "there's genuinely no forecast for this location."

**Independent Test**: For a location where observed data loads but the primary source cannot supply a forecast, verify the app attempts the secondary source's forecast before giving up, and — if truly no forecast is available from either — shows a clear explanatory message rather than silently displaying nothing extra.

**Acceptance Scenarios**:

1. **Given** a location's observed data loaded successfully, **When** the primary data source has no forecast for that location, **Then** the system attempts to obtain a forecast from the app's other data source before concluding none is available.
2. **Given** neither data source can supply a forecast for a location, **When** the user views a chart for that location, **Then** the app clearly states that a forecast isn't available for this location, distinct from the existing "this metric isn't tracked here" message used for individual metrics.
3. **Given** a location's nearest station has no usable name (shown as "Unnamed station"), **When** the user views its forecast, **Then** the unnamed station has no bearing on whether a forecast is shown — naming and forecast availability are resolved independently, and one being unavailable must not be presented as if it explains or requires the other.
4. **Given** a location's forecast was obtained from the secondary source while its observed data came from the primary source (the fallback in Acceptance Scenario 1 was used), **When** the user views the chart, **Then** a visible indicator communicates that the forecast is sourced differently from the observed data, without requiring the user to hover to discover it.

---

### User Story 3 - Give an unnamed station a real identity (Priority: P3)

A user whose nearest weather station has no usable name (shown as "Unnamed station," per 005) wants something more identifiable than that generic label — ideally a real place name for that spot, derived from its coordinates, so they can tell at a glance roughly where their data is coming from.

**Why this priority**: A smaller, more exploratory improvement than the marker (P1) or the forecast fallback (P2) — it doesn't unblock or fix missing data, it just makes an already-working but unhelpfully-labeled case more informative. Independent of both other stories: it applies whether or not that station's forecast is available.

**Independent Test**: Find or simulate a current-position location whose nearest station has a blank name, and verify the app shows a resolved place name instead of the literal "Unnamed station," clearly presented as an approximate location rather than the station's own (still-unknown) name.

**Acceptance Scenarios**:

1. **Given** a current-position location's nearest station has no usable name, **When** the app has the station's coordinates, **Then** it attempts to resolve a human-readable place name for those coordinates and displays that name instead of "Unnamed station."
2. **Given** a resolved place name is shown in place of "Unnamed station," **When** the user reads it, **Then** it's presented in a way that makes clear it's an approximate location for that spot, not a claim that this is the station's official name.
3. **Given** place-name resolution itself fails or returns nothing usable (e.g., a remote or offshore coordinate), **When** the app has already tried, **Then** it falls back to the existing "Unnamed station" text rather than showing a blank, broken, or technical-looking value.
4. **Given** a favorite or searched location (not current-position) has an unnamed nearest comparison station, **When** the user views it, **Then** behavior is unchanged from today — this improvement applies only to the current-position primary location's own name, per 005's existing scope for that case.

---

### Edge Cases

- What happens to the "now" marker on the 30-day view, which never carries forecast data? (It must not appear.)
- What happens if a user's device clock is noticeably wrong? The marker uses the same "now" already used to compute the observed/forecast boundary elsewhere in the app — this feature does not attempt to detect or correct clock skew.
- What happens when only some metrics (e.g., temperature but not wind) have forecast data from the primary source for a location? Per the all-or-nothing fallback (FR-004a), the app switches every metric's forecast for that location to the secondary source together, rather than mixing sources per metric; the "now" marker then applies uniformly across all metric tabs for that location.
- What happens when the secondary source also fails after being attempted as a forecast fallback? The user sees the "forecast unavailable for this location" message (Acceptance Scenario 2), not a silent gap or a technical error.
- What happens for the up-to-4 nearby comparison stations, which don't carry forecast data at all (out of scope per the original forecast feature)? No "now" marker behavior applies to them; this is unchanged.
- What happens when the source-mismatch indicator (User Story 1, Acceptance Scenario 4) would apply but the location's forecast is unavailable from any source (Edge Case above, User Story 2)? The "forecast unavailable" message takes precedence — there's no forecast to attribute to a source, so no mismatch indicator is shown.
- What happens if place-name resolution (User Story 3) is slow to respond? The station keeps showing "Unnamed station" (or whatever was already displayed) until resolution completes or fails, rather than blocking the rest of the page from loading.
- What happens if place-name resolution succeeds but returns something unhelpful (e.g., just a country name for a very remote coordinate)? Whatever is returned is shown as-is with the "approximate location" presentation from Acceptance Scenario 2 — this feature does not attempt to judge the quality/specificity of a successful result.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a distinct vertical marker on any chart currently showing forecast data, positioned at the current point in time, so users can immediately identify the boundary between observed and forecast data without hovering or reading the legend.
- **FR-002**: The "now" marker's position MUST reflect the actual current time whenever the chart is rendered (recomputed the same way the observed/forecast split itself already is), so a chart left open for a long time doesn't show a stale marker.
- **FR-003**: The "now" marker MUST NOT appear on a chart/view that has no forecast data at all (e.g., the 30-day view, or a location with no forecast from any source), so its presence never implies forecast data that isn't actually there.
- **FR-004**: When a location's observed data is available but the primary weather-data source could not supply a forecast for at least one tracked metric, System MUST attempt to obtain the forecast for **all** tracked metrics for that location from the app's secondary weather-data source before treating the forecast as unavailable, without discarding or replacing the primary source's already-loaded observed data or station identity — only the forecast portion is sourced differently.
- **FR-004a**: The fallback to the secondary source's forecast MUST be all-or-nothing per location: if any tracked metric's forecast is missing from the primary source, every metric's forecast for that location comes from the secondary source, so metrics on the same chart never mix forecasts from two different sources.
- **FR-005**: When no forecast data can be obtained for a location from any available source, System MUST display a clear, explicit message stating that a forecast isn't available for that location, distinct from the existing per-metric "not available" message.
- **FR-006**: The system's determination of forecast availability for a location MUST be independent of that location's resolved station display name — a station shown as "Unnamed station" must be evaluated for forecast availability exactly the same way as a named one.
- **FR-007**: When a location's forecast was obtained from a different data source than its observed data (per FR-004's fallback), System MUST visibly indicate this on the chart, discoverable without hovering, so users understand the forecast and the history it continues aren't guaranteed to be apples-to-apples from the same source.
- **FR-008**: When a current-position location's nearest station has no usable name, System MUST attempt to resolve a human-readable place name from that station's coordinates and display it in place of the generic "Unnamed station" label.
- **FR-009**: A resolved place name shown per FR-008 MUST be visually or textually distinguishable as an approximate location for that spot rather than presented as the station's own confirmed name.
- **FR-010**: When place-name resolution (FR-008) fails, times out, or returns nothing usable, System MUST fall back to the existing "Unnamed station" text rather than showing a blank, broken, or technical-looking value.

### Key Entities

- **Now Marker**: A visual reference point on a chart's time axis representing the current moment, shown only when that chart has forecast data to divide.
- **Forecast Availability Message**: User-facing text shown when a location has no forecast data from any source, distinct in wording and purpose from the existing per-metric unavailable message.
- **Forecast Source Indicator**: A visible cue on the chart showing that the forecast segment came from a different data source than the observed segment it continues.
- **Approximate Place Name**: A human-readable place name resolved from a station's coordinates, shown in place of "Unnamed station" and presented as an approximation rather than the station's confirmed identity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify the current-time boundary on any forecast-carrying chart within 2 seconds, without hovering or opening the details table.
- **SC-002**: For a location whose observed data loads successfully, the proportion of cases where a forecast fails to display solely because the primary source's forecast lookup (rather than the location genuinely lacking forecast coverage) is reduced to zero — the secondary source is always attempted first.
- **SC-003**: 100% of views for a location with no forecast from any source show an explicit "forecast unavailable" message rather than a silent absence of the forecast segment.
- **SC-004**: 100% of charts whose forecast came from a different source than their observed data show a visible source-mismatch indicator, discoverable without hovering.
- **SC-005**: For a current-position location whose nearest station has no usable name, users see a resolved place name instead of "Unnamed station" whenever place-name resolution succeeds, and see the existing "Unnamed station" fallback (never a blank or broken value) whenever it doesn't.

## Assumptions

- The "now" marker is a purely visual addition to the existing forecast-continuation chart work (005) — it introduces no new data, only a rendering element at the already-computed observed/forecast boundary.
- "Attempt the secondary source" for a forecast-only gap is resolved per the Clarifications above: the primary source's observed data and station identity are always preserved, and only the forecast portion is swapped to the secondary source, all-or-nothing across every tracked metric for that location — this differs from the existing whole-provider fallback pattern (used when the primary source's *observed* data fails outright), which does replace the entire series.
- The new "forecast unavailable for this location" message follows the same visual/alert treatment as the app's existing "data unavailable" messaging, so it's recognizable as the same category of state to returning users.
- This feature does not change which locations are considered "covered" for observed data (the existing 50km SMHI coverage radius, with a global secondary source as fallback) — it only affects how forecast-specifically is resolved and communicated once a location's observed data is already available.
- Nearby comparison stations remain out of scope for forecast entirely (unchanged from 005); the "now" marker and the availability-fallback/messaging behavior apply only to the primary selected location's chart.
- The source-mismatch indicator (FR-007) only needs to communicate *that* the forecast came from elsewhere, not explain the mechanics of the fallback — a short, plain-language cue is sufficient; it does not need to name the specific data provider.
- Resolving a place name from coordinates (FR-008) is a new lookup this app doesn't perform today (distinct from the existing weather-station lookups) and, like the app's existing weather-data calls, means sending the user's coordinates to an external service — reasonable given the app already sends the same coordinates to its weather-data sources for this exact location. It applies only to the current-position primary location's station name (mirroring 005's existing "Unnamed station" scope), not to favorites, searched places, or nearby comparison stations.
- Place-name resolution runs independently of and does not block observed-data or forecast loading (Edge Cases) — the rest of the page is usable while it's in progress or if it never completes.
