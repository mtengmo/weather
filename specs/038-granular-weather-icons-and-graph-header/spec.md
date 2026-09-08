# Feature Specification: More Granular Weather Icons and a Slimmer Graph Header

**Feature Branch**: `038-granular-weather-icons-and-graph-header`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description:
"1. could we add better icons if its heavy cloudy, mist, or so? i see a small rain forecast today, but chance is 7%. so in reality its not a rain forecast. = more granitular and accurate weather icons so the goal.
2. remove the sticky header from the graph, at least on mobile as it bloat the screen. maybe add the title to the left"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - More granular, more accurate weather icons (Priority: P1)

A dashboard viewer looks at today's forecast icon and sees a rain icon, but on closer inspection the actual chance of rain is only 7% — the icon overstates how likely rain really is. Separately, the viewer wants the cloud icon itself to distinguish a lightly overcast sky from a heavily overcast one, rather than lumping every cloudy condition into one look.

**Why this priority**: Named first in the request and is the core, concrete complaint — a viewer made a real decision (or judgment) based on a misleading icon.

**Independent Test**: Look at a forecast period whose recorded rain/snow amount is small and whose rain-chance is low (e.g., 7%) and confirm it no longer shows a rain/snow icon; look at forecast periods with light versus heavy cloud cover and confirm they show two visually distinct cloud icons.

**Acceptance Scenarios**:

1. **Given** a forecast period has some small amount of forecast precipitation but the forecast's own chance-of-rain figure is low, **When** the viewer looks at that period's icon, **Then** the icon does NOT show rain or snow — it falls back to reflecting cloud cover or clear sky instead.
2. **Given** a forecast period has a high chance of rain (or the amount/chance data isn't available at all, e.g. an already-observed/historical period), **When** the viewer looks at that period's icon, **Then** the existing rain/snow icon behavior is unchanged — this only prevents *low-confidence* forecasts from being shown as rain.
3. **Given** a period is lightly clouded (not heavily overcast) and not otherwise rainy/snowy/stormy/foggy/windy, **When** the viewer looks at its icon, **Then** it shows a distinct "partly cloudy" look, different from a heavily overcast period's icon.
4. **Given** a period is heavily overcast, **When** the viewer looks at its icon, **Then** it shows the existing overcast/cloudy look, now specifically meaning "heavily clouded" rather than "any cloud cover at 50% or more."

---

### User Story 2 - A slimmer graph view on mobile (Priority: P2)

A dashboard viewer opens the Details/graph view on a phone and finds that the fixed area at the top of the screen (the app's header plus the graph's own window/tab controls) eats up so much vertical space that very little of the actual chart is visible without scrolling.

**Why this priority**: A real usability complaint, but narrower in scope than the icon accuracy issue — it affects one view's mobile layout, not the accuracy of information shown everywhere.

**Independent Test**: Open the Details/graph view on a narrow (mobile-width) viewport and confirm the fixed area at the top takes up meaningfully less vertical space than before, with the chart itself visible sooner.

**Acceptance Scenarios**:

1. **Given** the Details/graph view is open on a narrow viewport, **When** the viewer looks at the top of the screen, **Then** the combined header/controls area takes up less vertical space than it does today, leaving more room for the chart itself.
2. **Given** the graph view's own title/location context, **When** the viewer looks at the window controls (24 hours/7 days/30 days), **Then** the title sits alongside them (e.g., to the left) rather than adding its own separate row.
3. **Given** the same change, **When** the viewer opens the graph view on a wide (desktop-width) viewport, **Then** the view still looks correct and uncluttered — this isn't a mobile-only visual regression waiting to happen on desktop.

---

### Edge Cases

- What happens for a period with no rain-chance data at all (e.g., an older data source, or an already-observed/historical hour)? It must keep today's existing behavior (classify by amount alone) — the new low-confidence guard only applies when a chance-of-rain figure is actually present and low.
- What happens for a period with a large amount of forecast precipitation but (implausibly) also a low stated chance of rain? The amount itself is still a strong enough signal — see Assumptions for how this is resolved.
- What happens to snow, not just rain, under the same low-confidence guard? It's treated the same way — a forecast's low-confidence signal applies to precipitation generally, not rain specifically.
- What happens on a source that doesn't distinguish light from heavy cloud cover at all? It must still fall back to a single reasonable cloud icon rather than showing incorrect or blank output.
- What happens to the currently-hidden accessibility title in the graph view once the visible title moves next to the window controls? Screen-reader users must still get an equivalent announcement of the location when the view loads.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST NOT classify a forecast period as rain or snow when that period's own chance-of-rain figure is present and below a low-confidence threshold, even if a small forecast amount is present for that period.
- **FR-002**: A period excluded from rain/snow classification by FR-001 MUST still resolve to a sensible fallback (cloud-cover-based or clear-sky) icon, not a blank/unknown one.
- **FR-003**: Periods with no chance-of-rain figure available (e.g., observed/historical data) MUST continue to classify rain/snow from amount alone, unaffected by FR-001.
- **FR-004**: The system MUST distinguish "partly cloudy" (lighter cloud cover) from "cloudy"/overcast (heavier cloud cover) as two visually distinct icons, for any data source that already provides enough detail to tell them apart.
- **FR-005**: A data source that does NOT provide enough detail to distinguish light from heavy cloud cover MUST still resolve to one of the two cloud icons via a reasonable fallback, rather than failing to show an icon.
- **FR-006**: The Details/graph view's fixed top area (header plus window/tab controls) MUST take up less vertical space on a narrow (mobile-width) viewport than it does today.
- **FR-007**: The Details/graph view's title/location context MUST be shown alongside the window-selection controls (e.g., to its left) rather than in its own separate always-visible row.
- **FR-008**: The Details/graph view MUST remain fully usable and visually correct on a wide (desktop-width) viewport after this change — the mobile-focused fix must not regress the desktop layout.
- **FR-009**: A screen-reader user opening the Details/graph view MUST still receive an announcement of which location's weather is shown, equivalent to what's given today.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a representative set of forecast periods with a low chance of rain/snow (e.g., under 20%) and only a small forecast amount, 100% show a non-rain, non-snow icon.
- **SC-002**: For a representative set of forecast/observed periods with a high chance of rain/snow, or no chance-of-rain data at all, 100% still show the rain/snow icon exactly as before this change.
- **SC-003**: Across a representative set of cloudy periods spanning light to heavy cloud cover, at least two visually distinct icons are used, correlating with the actual cloud-cover level.
- **SC-004**: On a mobile-width viewport, the graph view's fixed top area is measurably shorter (fewer vertical pixels before the chart's own content begins) than before this change.
- **SC-005**: The graph view's desktop-width layout shows no regression — the same information is present and legible as before.

## Assumptions

- "Mist" from the request is treated as covered by this app's existing "foggy" condition/icon — no separate third fog-like icon is being introduced; the emphasis is on fog/cloud accuracy generally, not a new fog subtype.
- The "low chance of rain" threshold is a reasonable default (in the neighborhood of the 7% the request calls out — well under a coin-flip) rather than a value the request itself specifies; exact tuning is left to planning/implementation, not fixed here.
- When a period has both a large forecast amount and a low stated chance (an unusual combination in practice, since a source's own amount and probability figures are normally consistent with each other), the amount is treated as the more reliable signal and the period still classifies as rain/snow — the low-confidence guard exists to catch "small amount, low confidence" forecasts specifically, not to override a source's own high-confidence heavy-precipitation prediction.
- "Heavy cloudy" is read as a second, more-overcast tier of the existing single "cloudy" condition (partly vs. heavily clouded), not an entirely new weather phenomenon — this keeps the change additive to the existing set of recognized conditions rather than a redesign of all of them.
- "The sticky header" is understood by its reported effect — the fixed top-of-screen area on the graph view consuming too much vertical space on mobile — rather than a specific technical mechanism; the exact cause is left to be diagnosed during planning.
- This feature only affects the Details/graph view's own top area (User Story 2); the dashboard Overview and its own header/timeline are out of scope for that story.
