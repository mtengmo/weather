# Feature Specification: Severe Weather Warnings

**Feature Branch**: `028-severe-weather-warnings`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "also add the warning api https://opendata.smhi.se/warnings/introduction"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Know about an active severe weather warning for my location (Priority: P1)

A user checking the weather for a Swedish location wants to immediately know if the authorities have issued an active warning (storm, flooding, extreme heat, water shortage, etc.) covering that area — today this information exists only on SMHI's own site, so the user has to think to go check it separately.

**Why this priority**: This is the core value of the feature — surfacing official safety information the user wouldn't otherwise see without leaving the app. Everything else in this feature supports this one behavior.

**Independent Test**: Load a Swedish location that currently has an active official warning; a warning banner appears near the top of the page, visible without any extra interaction, showing the warning's severity and a short title.

**Acceptance Scenarios**:

1. **Given** the selected location's county currently has one active warning, **When** the location's weather loads, **Then** a warning banner appears showing the warning's severity level and a short title.
2. **Given** the warning banner is showing, **When** the user taps/clicks it, **Then** it expands (or opens a detail view) showing the warning's full description and the period it's valid for.
3. **Given** the selected location's county has no active warning, **When** the location's weather loads, **Then** no warning banner appears and the page looks exactly as it does today.
4. **Given** a warning banner is showing, **When** the warning's validity period ends, **Then** the banner no longer appears the next time the app loads that location's weather.

---

### User Story 2 - See the most serious warning first when several are active (Priority: P2)

A user's location can occasionally be covered by more than one active warning at once (e.g. both a wind warning and a water-shortage message). The user wants the most serious one to be the one they see first, so they don't miss something important behind a less urgent notice.

**Why this priority**: Refines User Story 1's presentation for a real but less common case; the single-warning case (P1) already delivers the core value on its own.

**Independent Test**: Load a location with two active warnings of different severity; the banner leads with the higher-severity warning, and the lower-severity one is still reachable (e.g. a count, or listed after expanding).

**Acceptance Scenarios**:

1. **Given** a location has two active warnings of different severity, **When** the banner renders, **Then** the higher-severity warning is the one shown/leading, with an indication that more than one warning is active.
2. **Given** the user expands the banner, **When** it opens, **Then** every currently active warning for that location is listed, ordered from most to least severe.

---

### User Story 3 - Nothing breaks for locations outside Sweden (Priority: P3)

A user checking a non-Swedish location must still get a clean, working page — the warnings feature must never show an error, an empty banner, or stale data for a place the warning source doesn't cover.

**Why this priority**: A guardrail on the two stories above, not a new capability — but essential given the app already supports non-Swedish locations via other data sources.

**Independent Test**: Load a non-Swedish location; the page renders exactly as it does today, with no warning banner and no console errors.

**Acceptance Scenarios**:

1. **Given** a location outside Sweden, **When** the weather loads, **Then** no warning banner appears and no error is shown anywhere on the page.
2. **Given** the warning data source is temporarily unreachable, **When** a Swedish location loads, **Then** the rest of the weather page still loads and displays normally, simply without a warning banner.

---

### Edge Cases

- What happens when a warning's validity period has a future start (announced ahead of time, not yet in effect)? It is not shown as an active warning until its start time arrives, consistent with the feature only surfacing warnings that are *currently* in effect.
- What happens when a warning covers a broad region (e.g. an entire county) rather than the user's exact coordinates? The warning is shown if the user's location falls within the warned area, matching how the warning issuer itself defines the area — not narrowed further to a smaller radius.
- What happens if the same warning is updated (e.g. downgraded, extended, or cancelled) while the user has the app open? The next time that location's weather is loaded/refreshed, the banner reflects the current state — no separate real-time push is expected.
- What happens on a location the user has favorited but isn't currently viewing? No warning indicator is shown for it — the feature only evaluates the location currently being viewed, not the whole favorites list.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST check for active official weather warnings covering the currently viewed location whenever that location's weather is loaded.
- **FR-002**: When one or more warnings are currently active for the viewed location, the system MUST show a warning banner near the top of the page, visible without requiring the user to open any other view or tab.
- **FR-003**: The warning banner MUST show, at minimum, the warning's severity level and a short title/event type without requiring interaction.
- **FR-004**: The system MUST let the user reveal a warning's full description and its valid time period on demand (e.g. by expanding the banner).
- **FR-005**: When multiple warnings are simultaneously active for the viewed location, the banner MUST lead with the highest-severity one and MUST make every active warning reachable, ordered from most to least severe.
- **FR-006**: The system MUST only surface a warning that is currently within its valid time period — not warnings scheduled to start later, and not warnings whose valid period has already ended.
- **FR-007**: The system MUST show no warning banner, and no error, for a location outside the warning source's coverage area.
- **FR-008**: A failure to retrieve warning data MUST NOT prevent or delay the rest of the weather page from loading and displaying.
- **FR-009**: The system MUST NOT show warning information for any location other than the one currently being viewed (e.g. not for favorited-but-unviewed locations).

### Key Entities

- **Weather Warning**: An official notice covering a geographic area (typically a county), with a severity level, a short event title, a full description, and a start/end validity period. Multiple warnings can be active for the same area at once, and a warning can change or be withdrawn before its originally stated end time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user viewing a Swedish location with an active warning sees it within the normal page-load time, with no extra navigation required.
- **SC-002**: A location or moment with no active warning looks identical to the page before this feature existed — zero added clutter.
- **SC-003**: Locations outside the warning source's coverage, and moments when the warning data can't be retrieved, continue to load the full weather page with no errors, 100% of the time.
- **SC-004**: When multiple warnings are active at once, a user can identify the single most serious one without needing to compare descriptions themselves.

## Assumptions

- **Data source**: SMHI's official Impact-Based Weather Warnings feed (confirmed via a live sample request) is the warning source, reused via the app's existing SMHI integration. Each warning carries a geographic area (as a boundary/polygon, or a named county), a severity/warning level, a bilingual (Swedish/English) title and description, and a validity period — the app uses the English text, matching its existing all-English UI.
- **Geographic coverage**: Sweden only, matching the app's existing SMHI-only features (station-based observations, and the UV risk indicator from `027-uv-index-alert`) — locations outside this coverage simply never show a banner, the same graceful-degradation pattern already established for other SMHI-only capabilities.
- **Matching a location to a warning**: A location is considered covered by a warning when it falls within that warning's stated area (its published boundary or named county) — the exact matching mechanism is a planning-phase decision, not a product decision.
- **Severity ordering**: SMHI's own published warning-level scale (from an informational "message" level up through its highest class) is used as-is to decide the "most severe first" ordering in User Story 2, rather than the app inventing its own scale.
- **No push/background alerts**: The feature checks for warnings only when the location's weather is loaded/refreshed in the app (the same pattern every other data source already follows) — it does not send notifications, badge the browser tab, or check while the app is closed.
- **Single-location scope**: Only the currently viewed location is checked; the favorites list and any background location are out of scope for this feature (may be considered as a future enhancement).
- **Dismissal**: The banner is not permanently dismissible by the user within a session — since it reflects a real, currently active official warning, it reappears on every load of that location for as long as the warning stays active, rather than being hideable (which could cause a user to miss a still-active safety warning).
