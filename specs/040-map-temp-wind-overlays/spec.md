# Feature Specification: Temperature and Wind Map Overlays

**Feature Branch**: `040-map-temp-wind-overlays`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description:
"what easy part could we take from https://www.ventusky.com/#p=59.0;16.0;5 and deploy on my app? the radar overlay? I don't want to build a backend, does it exist som good framework that could be used to visualize things?"

Clarified with the user: a live rain/radar overlay already exists on the Map view (from a prior feature, using RainViewer's free, key-free radar tiles). Asked what to build next given that, the user said: "the rain, temp and wind is nice to have overlay of if possible" — i.e. add Temperature and Wind as additional selectable map overlays, alongside the existing Rain radar overlay. Further clarified on Wind specifically: the user initially wanted a genuinely animated wind visualization (the Ventusky/Windy-style moving-particle look) and asked to prototype and compare two candidate approaches (an embedded third-party animated widget vs. a data-driven overlay built into the app's own map). During planning, the animated on-map approach was found infeasible without a backend (NOAA's wind data has no CORS support), so the embedded-widget approach (Windy.com's iframe) shipped first. After trying it, the user rejected it: "the windy map wasn't so nice, as it's embedd[ing] another site" — preferring an overlay merged into the app's own map, matching Rain/Temperature's look, over a nicer/animated but disconnected embedded page. Wind is now a static overlay on the app's own map instead (see Assumptions).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See temperature across the map, not just at pins (Priority: P1)

A user opens the Map view and wants a general sense of how temperature varies across the visible area — warmer south, cooler north, etc. — the way Ventusky's temperature layer shows a color-coded map, not just numbers at individual pins.

**Why this priority**: Named alongside wind as a "nice to have," and temperature is the single most commonly checked weather figure, making it the most broadly useful of the two new overlays.

**Independent Test**: Open the Map view, switch to the Temperature overlay, and confirm the visible map area is tinted with a color gradient representing temperature, distinct from the existing rain radar look.

**Acceptance Scenarios**:

1. **Given** the Map view is open, **When** the user selects the Temperature overlay, **Then** the map shows a color-coded temperature layer across the visible area.
2. **Given** the Temperature overlay is showing, **When** the user pans or zooms the map, **Then** the overlay updates to continue covering the visible area, without breaking pin selection or map interaction.
3. **Given** the Temperature overlay is showing, **When** the user switches to a different overlay (e.g. Rain) or turns overlays off, **Then** the Temperature layer is no longer shown.

---

### User Story 2 - See wind strength across the map, as part of the app's own map (Priority: P2)

A user opens the Map view and wants a general sense of wind strength across the visible area, shown as a layer on the same map they already use for Rain and Temperature — not a separate, disconnected page.

**Why this priority**: Named alongside temperature as a "nice to have," but wind is generally checked less often day-to-day than temperature or rain.

**Independent Test**: Open the Map view, switch to the Wind overlay, and confirm a wind-strength visualization renders on the app's own map (same pins, same map instance), distinct from the Rain and Temperature overlays.

**Acceptance Scenarios**:

1. **Given** the Map view is open, **When** the user selects the Wind overlay, **Then** the map shows a wind-strength visualization across the visible area, on the same map instance as the pins (not a separate embedded page).
2. **Given** the Wind overlay is showing, **When** the user pans or zooms the map, **Then** the overlay updates to continue covering the visible area, without breaking pin selection or map interaction.

---

### User Story 3 - Switch between overlays without losing the map's core job (Priority: P1)

A user who already relies on the map to pick a saved location needs the existing Rain radar overlay and pin selection to keep working exactly as before, with Temperature and Wind added as alternatives the user can pick from — not additional layers stacked on top of each other, and not something that breaks the map's existing behavior.

**Why this priority**: A guardrail equal in importance to User Story 1 — the map's already-shipped jobs (picking a location, showing rain radar) must not regress for the sake of the new overlays.

**Independent Test**: With any overlay selected, every pin remains clickable and selects its location exactly as before; switching between Rain, Temperature, Wind, and "none" produces exactly one overlay (or none) visible at a time.

**Acceptance Scenarios**:

1. **Given** any overlay is selected, **When** the user clicks/taps a location pin, **Then** that location is selected exactly as it was before this feature existed.
2. **Given** one overlay is currently shown, **When** the user selects a different overlay, **Then** the previous overlay disappears and only the newly selected one shows.
3. **Given** the Map view first opens, **When** it finishes loading, **Then** the Rain overlay is shown by default, matching today's existing behavior before this feature.

---

### Edge Cases

- What happens if the Temperature or Wind overlay's data can't be fetched (network failure, source unavailable)? The map must still show, with pins fully usable — the overlay is simply absent, mirroring how the existing Rain radar overlay already degrades (per its own prior feature).
- What happens if a user has never granted/needed any special permission or paid plan? All three overlays must be available on the map's free, no-signup usage — no overlay may be gated behind something the app doesn't already provide the user.
- What happens when switching overlays quickly (e.g. Rain → Wind → Temperature within a second)? Only the most recently selected overlay ends up visible; no stale overlay lingers or flashes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Map view MUST offer three selectable overlays: Rain (the existing radar layer), Temperature, and Wind.
- **FR-002**: Exactly one overlay (or none) MUST be visible on the map at a time — selecting a new overlay replaces the previously shown one.
- **FR-003**: The Map view MUST default to showing the Rain overlay when it first opens, matching current behavior.
- **FR-004**: The Temperature overlay MUST visually represent temperature variation across the visible map area using a color gradient.
- **FR-005**: The Wind overlay MUST be rendered as a layer on the app's own map (the same map instance as the pins and the Rain/Temperature overlays), not as a separate embedded third-party page — this reverses the feature's original animated-embed approach, rejected by the user as feeling disconnected from the app.
- **FR-006**: The Wind overlay MUST visually represent wind strength across the visible map area.
- **FR-007**: All existing map functionality (pin display, pin selection, panning, zooming) MUST continue to work unchanged regardless of which overlay is selected.
- **FR-008**: If an overlay's underlying data cannot be fetched, the map MUST still render fully and remain usable, simply without that overlay visible.
- **FR-009**: None of the three overlays MUST require the user to sign up for a paid plan or grant any new permission beyond what the app already requires.

### Key Entities

- **Map overlay**: One of three named visual layers (Rain, Temperature, Wind) that can be shown on the Map view; exactly one is active at a time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can switch between all three overlays (Rain, Temperature, Wind) and "off" using a single, direct action per overlay — no more than one selection step per switch.
- **SC-002**: For a representative set of map sessions, 100% show exactly one overlay at a time (no stacked or duplicate overlays observed).
- **SC-003**: Pin selection and map panning/zooming work identically to today's behavior in 100% of sessions, regardless of which overlay is active.
- **SC-004**: When an overlay's data is temporarily unavailable, the map still loads and remains fully interactive in 100% of such cases.
- **SC-005**: A user viewing any overlay (Rain, Temperature, or Wind) sees it on the same map/pins they already use — 0 overlays require navigating to or embedding a separate page.

## Assumptions

- "Radar overlay" in the original request refers to the same live rain-radar layer already shipped on the Map view; this feature is additive (Temperature, Wind), not a rebuild of that existing layer.
- Overlays are mutually exclusive (one at a time), matching how Ventusky itself presents its layer picker, and how the existing Rain overlay is the map's only current layer — this keeps the map legible rather than stacking multiple tinted layers on top of each other.
- "No backend" is interpreted as: no new server-side component owned/operated by this project. A free, publicly documented third-party data source reachable directly from the browser (as the existing Rain overlay already does) satisfies this; if the best available free source for Temperature/Wind requires a client-embedded API key (a common, standard pattern for free-tier map-tile services), that is acceptable and not considered "building a backend."
- Wind ships as a static, merged-into-the-map overlay (FR-005/FR-006), not the animated Ventusky/Windy-style moving visualization originally requested — after shipping and trying the animated embedded-widget approach (Windy.com's iframe), the user found it "wasn't so nice, as it's embedd[ing] another site" and preferred consistency with Rain/Temperature (both plain layers on the app's own map) over animation. The two-approach comparison from the original request (embedded widget vs. data-driven on-map overlay) is resolved: the on-map approach wins, using the same free OpenWeatherMap tile product as Temperature (global coverage, no region limit needed — the earlier Nordic-only fallback discussed for a from-scratch animated build is moot once the simpler static tile layer was used instead).
- This feature is scoped to the Map view only; it does not add these overlays anywhere else in the app (e.g. the dashboard timeline or Details/graph view).
