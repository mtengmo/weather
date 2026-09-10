# Feature Specification: Debug Section With Raw Source Responses

**Feature Branch**: `060-debug-page-bottom`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "add a debug page with the responses from all sources in the bottom, no extra api call for the debug."

Context: Comparing what each of the app's three weather sources (SMHI, MET Norway, Open-Meteo) actually returned for a given hour today required manually fetching each API by hand outside the app to diagnose a discrepancy. This feature surfaces that same raw data inside the app itself, at the bottom of the page, reusing exactly the responses the app already fetched for its normal rendering — not a separate diagnostic fetch.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See each source's raw forecast response without leaving the app (Priority: P1)

A viewer scrolls to the bottom of the page and finds a debug section showing the raw response each of the three forecast sources returned for the currently-viewed location, exactly as received.

**Why this priority**: This is the entire request — make source comparison possible from inside the app, without manually calling each API.

**Independent Test**: Load the app for a location covered by all three sources; confirm a debug section at the bottom shows three raw responses, one per source, matching what the app already fetched to render its own forecast.

**Acceptance Scenarios**:

1. **Given** a location with data from all three sources, **When** the viewer scrolls to the bottom of the page, **Then** a debug section shows each source's raw response, clearly labeled by source.
2. **Given** a location where one source has no data (e.g. outside SMHI coverage), **When** the viewer looks at the debug section, **Then** that source is shown as having no data, rather than an error or a stale response from a different location.
3. **Given** the viewer changes location, **When** the page's forecast data updates, **Then** the debug section's contents update to match the new location — never showing a previous location's stale response.

---

### User Story 2 - The debug section causes no additional network activity (Priority: P1)

A developer/curious viewer opening the debug section causes no extra API requests beyond what the app already makes to render the page.

**Why this priority**: Explicitly required — the whole point is to inspect data the app already has, not to add a parallel diagnostic path that could itself contribute to rate limits or skew the very data being inspected.

**Independent Test**: Monitor network requests while opening/viewing the debug section; confirm no request fires as a result of viewing it — only the app's normal, already-existing fetches.

**Acceptance Scenarios**:

1. **Given** the app has already loaded a location's data, **When** the viewer opens the debug section, **Then** no new network request is made.

---

### Edge Cases

- What happens before any location has loaded data yet? The debug section shows nothing (or an explicit "no data yet") rather than an error.
- What happens if a source's fetch failed? The debug section reflects that (e.g. empty/no data for that source) — it shows the same real outcome the app itself already has, not a separate re-attempt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST show a debug section at the bottom of the page containing each forecast source's raw response for the currently-viewed location.
- **FR-002**: Opening/viewing the debug section MUST NOT trigger any network request beyond the app's own already-existing fetches.
- **FR-003**: The debug section's contents MUST always reflect the same data currently backing the rest of the page — never a separately-fetched or stale copy.
- **FR-004**: Each source's raw response MUST be clearly labeled by source name.
- **FR-005**: A source with no data for the current location/fetch MUST be shown as such, not omitted silently or shown as an error.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the time, the debug section's per-source content matches what the app actually used to render the page for the current location.
- **SC-002**: 0 additional network requests result from viewing the debug section.

## Assumptions

- "All sources" means the three weather forecast providers (SMHI, MET Norway, Open-Meteo) — the same three already blended into the app's own multi-source forecast — not every internal API call the app makes (geocoding, warnings, UV, map tiles, etc.), since those aren't part of the forecast-comparison problem that prompted this request.
- "Raw response" means each source's own response body as received, not the app's own simplified/transformed representation of it — this is the actual point of the feature (comparing sources exactly as they answered).
- The debug section is always present (not behind a settings toggle or query flag) — the user asked for it directly in the page, not as a hidden developer-only mode.
