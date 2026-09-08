# Feature Specification: Temperature and Wind Map Overlays

**Feature Branch**: `040-map-temp-wind-overlays`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description:
"what easy part could we take from https://www.ventusky.com/#p=59.0;16.0;5 and deploy on my app? the radar overlay? I don't want to build a backend, does it exist som good framework that could be used to visualize things?"

Clarified with the user: a live rain/radar overlay already exists on the Map view (from a prior feature, using RainViewer's free, key-free radar tiles). Asked what to build next given that, the user said: "the rain, temp and wind is nice to have overlay of if possible" — i.e. add Temperature and Wind as additional selectable map overlays, alongside the existing Rain radar overlay. Further clarified on Wind specifically: the user wants a genuinely animated wind visualization (the Ventusky/Windy-style moving-particle look), accepted that this may only be feasible for a limited region (e.g. the Nordic countries) rather than the whole globe, and asked to prototype and compare two candidate approaches (an embedded third-party animated widget vs. a data-driven overlay built into the app's own map) rather than commit to one up front — see Assumptions.

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

### User Story 2 - See wind movement across the map, animated (Priority: P2)

A user opens the Map view and wants to see wind patterns the way Ventusky/Windy show them: moving particles/streamlines that convey both strength and direction at a glance, not just a static tint.

**Why this priority**: Named alongside temperature as a "nice to have," but wind is generally checked less often day-to-day than temperature or rain.

**Independent Test**: Open the Map view, switch to the Wind overlay, and confirm the visible map area shows an animated wind visualization (motion conveying speed/direction), distinct from the Rain and Temperature overlays.

**Acceptance Scenarios**:

1. **Given** the Map view is open, **When** the user selects the Wind overlay, **Then** the map shows an animated wind visualization across the covered area.
2. **Given** the Wind overlay is showing, **When** the user pans or zooms the map, **Then** the overlay continues to behave reasonably (updating to the visible area, or — if the chosen approach only covers a fixed region such as the Nordic countries — clearly indicating that limited coverage), without breaking pin selection or map interaction.
3. **Given** the Wind overlay only covers a limited region (per the Assumptions), **When** the user views a pin outside that region, **Then** the pin and map remain fully usable — the overlay simply doesn't extend there, with no error or broken layout.

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
- **FR-005**: The Wind overlay MUST render as an animated visualization of wind movement (conveying both speed and general direction), not a static tint — matching the Ventusky/Windy-style look the user asked for.
- **FR-006**: The Wind overlay's coverage MAY be limited to a specific region (e.g. the Nordic countries) rather than global, if that is what the chosen approach supports — the map and pins outside that region MUST still work normally.
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
- **SC-005**: A user viewing the Wind overlay sees continuous motion (not a static image) conveying wind speed/direction, for whatever area the shipped approach covers.

## Assumptions

- "Radar overlay" in the original request refers to the same live rain-radar layer already shipped on the Map view; this feature is additive (Temperature, Wind), not a rebuild of that existing layer.
- Overlays are mutually exclusive (one at a time), matching how Ventusky itself presents its layer picker, and how the existing Rain overlay is the map's only current layer — this keeps the map legible rather than stacking multiple tinted layers on top of each other.
- "No backend" is interpreted as: no new server-side component owned/operated by this project. A free, publicly documented third-party data source reachable directly from the browser (as the existing Rain overlay already does) satisfies this; if the best available free source for Temperature/Wind requires a client-embedded API key (a common, standard pattern for free-tier map-tile services), that is acceptable and not considered "building a backend."
- Wind is animated (FR-005), reversing this feature's original "static tint" assumption — the user explicitly wants the Ventusky/Windy-style moving visualization and accepted the added complexity and possible regional-coverage limit that comes with it.
- Two candidate implementation approaches for the animated Wind overlay will be prototyped and compared during planning/implementation, rather than one committed to up front in this spec:
  (a) an embedded third-party animated wind widget (e.g. Windy.com's free embeddable map) — minimal build effort, globally covered, but appears as a separate embedded mini-map rather than a layer merged into this app's own map/pins;
  (b) a data-driven overlay built into the app's own Leaflet map (e.g. via a client-side wind-particle rendering library fed by publicly available wind-vector data), most likely limited to a specific region such as the Nordic countries to keep the data volume/parsing manageable without standing up a backend.
  Whichever approach is actually shipped must still satisfy FR-005/FR-009 and this story's acceptance scenarios; the plan phase documents the comparison and the chosen approach in `research.md`.
- This feature is scoped to the Map view only; it does not add these overlays anywhere else in the app (e.g. the dashboard timeline or Details/graph view).
