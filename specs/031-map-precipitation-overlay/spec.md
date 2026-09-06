# Feature Specification: Forecast Precipitation Overlay on the Map

**Feature Branch**: `031-map-precipitation-overlay`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "what could be done on this one? replace the map functionality? https://opendata.smhi.se/radar/introduction — after research, SMHI's radar API turned out to be raw per-station imagery (no national composite tile layer available), unsuitable for a simple map overlay; the user chose instead to spec a forecast-grid overlay using data already reachable through the app's existing weather sources."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See at a glance where rain is expected near my saved places (Priority: P1)

A user opens the Map view to browse their favorite/recent locations and wants to visually spot
which areas currently have rain in the forecast, without opening each location individually to
check.

**Why this priority**: This is the entire value of the feature — turning the map from a plain
pin list into something that answers "where's the rain" at a glance.

**Independent Test**: Open the Map view with at least one favorite location; areas with forecast
rain show a visible tint/marker distinct from areas with none, without needing to click into any
individual location.

**Acceptance Scenarios**:

1. **Given** the Map view is open with one or more favorite/recent locations, **When** the map
   finishes loading, **Then** the visible area shows a precipitation overlay whose intensity
   varies by location, distinguishing areas with forecast rain from areas without.
2. **Given** the overlay is showing, **When** the user looks at an area with no forecast
   precipitation, **Then** that area shows no rain tint at all (not a fabricated/default color).
3. **Given** the overlay is showing, **When** the user reads its labeling, **Then** it's clearly
   identified as a forecast (not live/real-time radar), so it isn't mistaken for a live
   precipitation tracker.

---

### User Story 2 - The map still works exactly as before (Priority: P2)

A user who already relies on the map to pick and jump to a saved location needs that to keep
working unchanged — the new overlay must sit alongside pin selection, not interfere with it.

**Why this priority**: A guardrail on User Story 1 — the map's existing, already-shipped job
(picking a location) must not regress for the sake of the new visual.

**Independent Test**: With the overlay showing, every existing pin remains clickable and selects
its location exactly as before; panning/zooming the map continues to work normally.

**Acceptance Scenarios**:

1. **Given** the overlay is showing, **When** the user clicks/taps a location pin, **Then** that
   location is selected exactly as it was before this feature existed.
2. **Given** the overlay is showing, **When** the user pans or zooms the map, **Then** the map
   responds normally, with no broken interaction.

---

### User Story 3 - Nothing breaks when the overlay data can't be fetched (Priority: P3)

A user opens the map at a moment when the forecast-grid data can't be retrieved (network issue,
provider hiccup). The map must still be useful for its original job.

**Why this priority**: A guardrail, not a new capability — consistent with every other
best-effort data source already added to this app (UV risk, warnings).

**Independent Test**: Simulate a failed overlay fetch; the map still renders its pins and remains
fully navigable, simply without the precipitation tint.

**Acceptance Scenarios**:

1. **Given** the precipitation-overlay data fails to load, **When** the Map view renders,
   **Then** pins and map navigation work exactly as before, with no error shown and no overlay
   drawn.

---

### Edge Cases

- What happens when there are no favorite/recent locations at all (the map's existing empty
  state)? The existing "no locations to show yet" message is unaffected — no overlay is fetched
  or shown for an empty map.
- What happens when the user pans far away from every pinned location? The overlay reflects
  whatever area was sampled when the map opened — it does not need to keep expanding as the user
  explores unrelated areas (see Assumptions: fetched once per map open, not continuously).
- What happens when precipitation forecast data exists but is very low/negligible? Only
  meaningfully forecast precipitation is tinted — a trace amount doesn't need to visually compete
  with genuine rain, but no specific threshold is prescribed by this spec (an implementation
  detail for planning).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Map view MUST show a visual overlay indicating forecast precipitation across
  the map's currently visible area, alongside the existing location pins.
- **FR-002**: The overlay MUST be clearly labeled as forecast data, not live/real-time radar.
- **FR-003**: An area with no forecast precipitation MUST show no overlay tint there — the
  overlay never implies rain that isn't actually forecast.
- **FR-004**: The overlay MUST NOT change or interfere with existing pin behavior — every pin
  remains visible, clickable, and selects its location exactly as it does today.
- **FR-005**: The overlay MUST NOT change or interfere with existing map panning/zooming.
- **FR-006**: The system MUST fetch only a small, bounded amount of forecast-grid data when the
  Map view opens — not an unbounded amount that grows with panning/zooming/map size.
- **FR-007**: A failure to fetch the overlay's forecast data MUST NOT prevent or delay the map's
  existing pins and navigation from working.

### Key Entities

- **Precipitation Sample**: One point's forecast precipitation amount for the near-term (the
  upcoming hour), tied to a location on the map — used only to decide the overlay's visual
  intensity at that point, not displayed as a number.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can identify, without leaving the Map view or clicking into any location,
  which general areas among their saved places currently have forecast rain versus none.
- **SC-002**: Every existing map interaction (selecting a pin, panning, zooming) continues to
  work exactly as it did before this feature, 100% of the time.
- **SC-003**: Opening the Map view triggers a small, fixed amount of additional data-loading —
  never a per-pixel or unbounded-with-zoom amount.
- **SC-004**: A failed overlay fetch never prevents the map from loading its pins, 100% of the
  time.

## Assumptions

- **Not true radar**: SMHI's public radar data is raw per-station imagery (roughly 30
  individual, limited-range radar sites) with no ready-made national composite tile layer to
  overlay on a map — confirmed via direct API inspection during specification. This feature
  intentionally does not attempt to build one; it instead visualizes forecast precipitation
  (already-shaped, already-reachable data) as a map overlay, which is a materially different
  (and much simpler, deliverable) feature than true weather radar.
- **Metric scope**: Precipitation is the only overlay metric in this feature (most directly
  answers "where's the rain," matching the original request's spirit) — temperature or other
  metric overlays are out of scope for this feature and may be considered separately later.
- **Sampling, not a seamless image**: The overlay is built from a modest set of sampled forecast
  points spanning the map's currently visible/pinned area, rendered as a lightweight visual (e.g.
  tinted regions or markers) — not a continuous, radar-style raster image. This keeps the data
  volume bounded (FR-006) and reuses data shapes the app's existing forecast sources already
  provide, rather than requiring a new imagery pipeline.
- **Refresh timing**: The overlay is fetched once when the Map view opens (or when the set of
  pinned locations meaningfully changes) — it does not continuously refresh while the user pans
  or zooms, consistent with FR-006's bounded-fetch requirement and this app's existing
  "independent, one-shot-per-view" fetch pattern for supplementary data (UV risk, warnings).
- **Time window**: The overlay reflects the near-term forecast (the upcoming hour) rather than a
  scrollable/animatable time range — a single "right now, or very soon" snapshot, keeping the
  feature's scope aligned with "at a glance," not a full radar-style playback tool.
