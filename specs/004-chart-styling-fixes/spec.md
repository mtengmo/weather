# Feature Specification: Nearby-Station Name Fix and Temperature/Wind Chart Styling

**Feature Branch**: `004-chart-styling-fixes`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "The nearst station is missing the name. The graph, on temperature, with high and low is now, maybe do the high red and low blue? Add option to use max/min (enabled by default) Re-use the max/min avg setup from temperature on the wind graph?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a name for every nearby comparison station (Priority: P1)

A user comparing a location against nearby weather stations expects every station in the legend, table, and tooltips to be identifiable by name. Today, at least one nearby station shows up with a blank/missing name (only the distance is visible), which makes that series impossible to identify.

**Why this priority**: This is a data-integrity bug affecting every screen that lists nearby stations (graph legend, tooltip, details table) — it directly undermines the comparison feature's usefulness and should be fixed first.

**Independent Test**: Can be fully tested by viewing a location whose nearby-station list includes a station with no name in the underlying data source, and confirming the app shows a readable fallback label instead of a blank name, everywhere that station appears (legend, tooltip, details table column header).

**Acceptance Scenarios**:

1. **Given** a nearby comparison station has no name reported by the data source, **When** it appears in the graph legend, tooltip, or details table, **Then** the app shows a readable fallback label (not a blank space) alongside its distance.
2. **Given** all nearby comparison stations have names reported by the data source, **When** they appear anywhere in the app, **Then** behavior is unchanged from today (their real names are shown).

---

### User Story 2 - Distinguish high and low temperature at a glance via color (Priority: P2)

A user viewing the temperature graph's high/low/average lines (7-day or 30-day view) wants to tell the high and low lines apart instantly using familiar color cues, instead of having to read the legend every time.

**Why this priority**: A quick visual-clarity improvement on an existing, already-shipped view; valuable but the data is still fully readable today via the legend.

**Independent Test**: Can be fully tested by viewing the temperature graph's 7-day or 30-day window and confirming the "high" line renders in a warm/red tone and the "low" line renders in a cool/blue tone, distinct from the "average" line and from any nearby-station series' colors.

**Acceptance Scenarios**:

1. **Given** the user is viewing the temperature graph for the 7-day or 30-day window, **When** the chart renders, **Then** the primary location's "high" line is a warm/red tone and its "low" line is a cool/blue tone.
2. **Given** the user is viewing either window, **When** nearby comparison stations are also shown, **Then** the high/low color convention applies only to the primary location's own high/low lines — comparison-station lines keep their existing distinguishing colors so no two series are confused.

---

### User Story 3 - Choose whether to see high/low alongside the average (Priority: P3)

A user viewing the temperature (and, per User Story 4, wind) graph's 7-day/30-day view wants the option to simplify the chart to just the average line, hiding the high/low lines when they're not needed, while still seeing high/low by default since that's the more complete picture.

**Why this priority**: A display-preference convenience on top of already-available data; the average line remains visible either way, so no information is lost by leaving this feature out.

**Independent Test**: Can be fully tested by opening a location's 7-day or 30-day temperature graph, confirming high/low lines are shown by default, toggling the option off, confirming only the average line remains, and toggling back on.

**Acceptance Scenarios**:

1. **Given** a user with no previously saved preference, **When** they view a 7-day or 30-day graph, **Then** the high and low lines are shown alongside the average line (the option defaults to on).
2. **Given** the user turns the option off, **When** the graph re-renders, **Then** only the average line is shown for the primary location and for each nearby comparison station, for the current metric.
3. **Given** the user has set a preference (on or off), **When** they switch location, window, or metric tab, **Then** their preference is remembered and applied to the new view.

---

### User Story 4 - See wind high/low the same way as temperature (Priority: P4)

A user viewing the wind graph's 7-day/30-day view wants the same high/low/average presentation already available for temperature, so they can see the range of wind speeds each day, not just the average.

**Why this priority**: Extends an existing, already-decided presentation pattern to a second metric; valuable but the wind graph is still usable with average-only data if this isn't delivered.

**Independent Test**: Can be fully tested by viewing the wind graph's 7-day or 30-day window and confirming it shows high, low, and average wind-speed lines (using the same color convention and on/off option from User Stories 2-3), consistent with the temperature graph's presentation.

**Acceptance Scenarios**:

1. **Given** the user is viewing the wind graph for the 7-day or 30-day window, **When** the chart renders, **Then** it shows high, low, and average wind-speed lines for the primary location, styled the same way (colors and the on/off option) as the temperature graph's high/low/average lines.
2. **Given** the user toggles the high/low option off while viewing the wind graph, **When** the graph re-renders, **Then** only the average wind-speed line remains, mirroring User Story 3's behavior.

---

### Edge Cases

- What happens when a bucket (day) has only one reading? High and low are equal for that bucket — both lines still render (coincident), which is expected, not an error.
- What happens when the high/low option is off and a user opens "View details"? The details table is unaffected by this display option — it continues to show high, low, and average columns as it does today, since the option only simplifies the graph view.
- What happens on the 24-hour (hourly) window, where there is no daily high/low concept? The high/low option and its color convention do not apply — the hourly view is unchanged by this feature.
- What happens if a station's name is missing but its distance is also unavailable? Out of scope for this feature — the name fallback applies independently of distance, which is already required data (per `001-weather-history-locations`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a readable fallback label for any nearby comparison station whose name is missing or blank in the underlying data, everywhere that station's name is shown (graph legend, tooltip, details table).
- **FR-002**: System MUST continue showing a station's real name, unchanged, whenever the data source provides one.
- **FR-003**: On the temperature graph's 7-day and 30-day windows, System MUST render the primary location's "high" line in a warm/red tone and its "low" line in a cool/blue tone, distinct from the "average" line's color and from every nearby comparison station's color.
- **FR-004**: System MUST leave nearby comparison stations' line colors unchanged by FR-003 (they keep their existing distinguishing colors, not the high/low red/blue convention).
- **FR-005**: System MUST provide a user-facing option to show or hide the high/low lines on the 7-day/30-day temperature and wind graphs, independent of the average line (which is always shown).
- **FR-006**: The high/low option MUST default to "on" (shown) for users with no previously saved preference.
- **FR-007**: System MUST persist the user's high/low option choice across location, window, and metric-tab changes, consistent with how other display preferences (theme, unit, nearby-station count) already persist.
- **FR-008**: System MUST apply the high/low option only to the 7-day/30-day graph views — the 24-hour (hourly) view and the details table are unaffected.
- **FR-009**: On the wind graph's 7-day and 30-day windows, System MUST show high, low, and average wind-speed lines for the primary location, using the same color convention (FR-003) and the same on/off option (FR-005) as the temperature graph.
- **FR-010**: System MUST compute each daily wind high/low value as the maximum/minimum of that day's hourly wind-speed readings, consistent with how temperature's existing daily high/low is already computed.

### Key Entities

- **Nearby Observation Station** (existing, from `001-weather-history-locations`): gains a display rule — an empty/missing name resolves to a fallback label; no change to the underlying data itself.
- **High/Low Display Preference**: a new user-controlled setting (on/off, default on) determining whether high/low lines are shown on the 7-day/30-day temperature and wind graphs; persisted similarly to other display preferences (unit system, theme, nearby-station count).
- **Daily Aggregate** (existing, from `003-extended-history-metrics`): gains wind high/low fields alongside the existing wind average, computed the same way temperature's high/low already are.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of nearby comparison stations shown anywhere in the app display a non-blank name, regardless of whether the data source provided one.
- **SC-002**: Users can visually distinguish the primary location's high line from its low line on the temperature graph without reading the legend, on first viewing.
- **SC-003**: Users can toggle high/low visibility on the 7-day/30-day temperature and wind graphs and see the change applied within 1 second.
- **SC-004**: A first-time user sees high/low lines by default on both the temperature and wind 7-day/30-day graphs, without changing any setting.

## Assumptions

- This feature builds on `001-weather-history-locations` (nearby stations), `002-vibrant-award-theme` (chart styling), and `003-extended-history-metrics` (metric tabs, wind metric, daily aggregation) and does not change any of their requirements except where explicitly extended above.
- The fallback label for a nameless station is a simple, generic placeholder (e.g., "Unnamed station") — the exact wording is an implementation detail; only its non-blank, readable nature is a hard requirement.
- "Warm/red" and "cool/blue" are interpreted per the existing app's own theme accent conventions, adapted so the two lines remain visually distinguishable under every theme (Midnight, Bright, Glass), not fixed literal hex colors specified by the user.
- "Add option to use max/min (enabled by default)" is interpreted as a toggle for showing/hiding the existing high ("max") and low ("min") lines alongside the average on the 7-day/30-day temperature graph — this is the reading that makes the following sentence ("re-use the max/min avg setup from temperature on the wind graph") coherent: the "max/min avg setup" being reused is exactly this three-line (high/low/average) presentation plus its new on/off option. The high/low option is a single, global display preference (not tracked separately per metric) — turning it off hides high/low on both the temperature and wind graphs at once.
- The existing details table (View details) is intentionally unaffected by this option, since it already exists as the place to see full high/low/average data regardless of graph simplification preferences.
