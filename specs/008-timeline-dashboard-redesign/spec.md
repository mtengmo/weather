# Feature Specification: Timeline Weather Dashboard Redesign

**Feature Branch**: `[008-timeline-dashboard-redesign]`

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "could you look on the two images under docs\mockup and do a new dashboard more like these?"

## Reference Mockups

Two reference images in `docs/mockup/`:

- **Mockup 1** (`2331ca69-...png`) — a wide, desktop-style "24H Weather" dashboard: a single shared time axis across the top (hour labels, with the current hour highlighted as "NOW"), and every metric laid out as its own aligned horizontal row beneath it — condition icons, a temperature line (solid for the observed portion, dashed for the forecast portion), feels-like temperature, a precipitation bar row, a snow row, a wind row (directional arrows + speed), a gusts row, a cloud-cover line, and a "Sun & Moon" row (sunrise/sunset arc, moonrise/moonset). A vertical "now" line runs through every row at once. A 24H/WEEK toggle switches the same layout to a 7-day view. A legend at the bottom marks solid vs. dashed as "Observed" vs. "Forecast".
- **Mockup 2** (`99a54f56-...png`) — the same idea adapted to narrower panels: a "24H Forecast" card (headline condition, hourly icon strip, then stacked mini charts for temp/wind/precipitation/cloud cover, plus sun/moon/UV summaries) and a "24H Observations" card (summary stat tiles, then an hour-by-hour detail table), plus a row of compact circular "at a glance" widgets (forecast summary, wind, rain, moon phase).

This feature redesigns this app's existing combined weather overview (introduced previously) to match the spirit of these mockups — most directly Mockup 1's synchronized multi-row timeline, since it fits this app's existing wide desktop-style layout — rather than introducing a second, separate dashboard.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One synchronized timeline instead of a grid of cards (Priority: P1)

A user opening the overview wants to see temperature, precipitation, wind, and cloud cover for the next 24 hours all lined up against the *same* shared time axis — so they can look straight down through a given hour and read every metric for it at once — instead of the current layout, which repeats the full set of values inside one card per hour.

**Why this priority**: This is the heart of what the reference mockups show and what was explicitly asked for — a fundamentally different, denser reading experience than the existing per-hour card grid. Everything else in this feature builds on this shared-axis layout existing first.

**Independent Test**: Open the overview for a location with a full 24 hours of data; confirm hour labels appear once across the top, a distinct row exists per metric (condition icon, temperature, precipitation, wind, cloud cover) beneath that shared axis, and a single vertical "now" marker lines up in the same horizontal position across every row.

**Acceptance Scenarios**:

1. **Given** a user opens the redesigned overview for a location with 24 hours of data, **When** it renders, **Then** hour labels appear once, above a stack of per-metric rows (condition, temperature, precipitation, wind, cloud cover) that all align to those same hour positions.
2. **Given** a location's data includes both observed and forecast hours, **When** the temperature, precipitation, wind, and cloud-cover rows render, **Then** each row visually distinguishes its observed portion from its forecast portion the same way (solid vs. dashed, or equivalent), consistent across every row.
3. **Given** a user is looking at the timeline, **When** they look at any single hour, **Then** they can read that hour's condition icon and every metric's value by looking at one vertical position, without hovering.
4. **Given** an hour is missing the data for a given row, **When** that row renders, **Then** it shows a clear gap for that hour (matching how this app already marks missing data elsewhere) rather than a misleading value.

---

### User Story 2 - The same timeline for a week (Priority: P2)

A user planning ahead wants the same synchronized-row experience for the 7-day period, one column per day instead of per hour, switched via the same 24-hours/week control already used elsewhere in this app.

**Why this priority**: Extends User Story 1's already-built layout to the second time range this app already supports elsewhere; depends on that layout existing first.

**Independent Test**: Switch the overview to the 7-day period; confirm the same row layout (condition, temperature, precipitation, wind, cloud cover) now aligns to one column per day, with daily high/low where the existing 7-day view already shows them.

**Acceptance Scenarios**:

1. **Given** a user switches the overview to the 7-day period, **When** it renders, **Then** the same per-metric row layout appears with one column per day instead of per hour.
2. **Given** a day includes forecast data, **When** its rows render, **Then** they're distinguished as forecast the same way User Story 1 distinguishes forecast hours.

---

### User Story 3 - Sun, moon, and richer context rows (Priority: P3)

A user looking at the timeline wants the extra context the mockups show — when the sun rises and sets, what the moon phase is, and (where available) feels-like temperature, snow, and wind gusts — to round out the picture beyond this app's four core tracked metrics.

**Why this priority**: Meaningfully enriches the mockup-inspired redesign but depends on data this app doesn't currently source (sunrise/sunset, moon phase, feels-like temperature, snow amount, wind gusts) — lower priority than getting the core shared-timeline layout (User Stories 1–2) right first, and reasonably deferrable per row if a given data point turns out unavailable.

**Independent Test**: Open the overview for a location where sunrise/sunset data is available; confirm a "Sun & Moon" summary appears showing sunrise and sunset times and the current moon phase. For any of feels-like temperature, snow, or wind gusts that turn out available, confirm a corresponding row appears using the same shared-axis pattern as User Story 1; for any that aren't available, confirm the row is simply omitted rather than shown empty or broken.

**Acceptance Scenarios**:

1. **Given** sunrise/sunset data is available for a location, **When** the overview renders, **Then** a "Sun & Moon" summary shows sunrise and sunset times for the displayed day(s).
2. **Given** moon phase data is available, **When** the "Sun & Moon" summary renders, **Then** it also shows the current moon phase.
3. **Given** feels-like temperature, snow amount, or wind gusts data is available for a location, **When** the timeline renders, **Then** each available one appears as its own row using the same shared-axis, observed/forecast-distinguished pattern as the core rows.
4. **Given** any of those three data points is not available for a location, **When** the timeline renders, **Then** its row is simply not shown, rather than appearing empty or in an error state.

---

### Edge Cases

- What happens on the 30-day window? Unchanged from the existing overview — out of scope for this timeline layout, same as before.
- What happens for the up-to-4 nearby comparison stations? Unchanged — the timeline continues to summarize the primary selected location only.
- What happens when a location has no forecast data at all? The timeline shows only the observed portion, using this app's existing "forecast unavailable" messaging rather than an empty or broken-looking chart.
- What happens on a narrow (e.g., mobile-width) screen, given the timeline is inherently wide (many hour or day columns)? The timeline scrolls horizontally within its own frame rather than shrinking each column to illegibility or breaking the rest of the page's layout.
- What happens to the existing per-hour "card" layout this feature replaces? It's retired in favor of the new synchronized-row layout — this is a redesign of the same "Overview" entry point, not an additional third way to view the same data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The existing combined weather overview MUST be redesigned so that condition icons, temperature, precipitation, wind, and cloud cover are each shown as their own row, all aligned to one shared time axis, instead of the current one-card-per-hour layout.
- **FR-002**: The shared time axis MUST show one set of hour labels (24-hour view) or day labels (7-day view) that every row aligns to, rather than repeating labels per row.
- **FR-003**: A single "now" marker MUST appear at the same horizontal position across every row simultaneously, consistent with how this app already marks "now" on its charts.
- **FR-004**: Every row that carries forecast data MUST distinguish its observed portion from its forecast portion using one consistent visual convention applied the same way across all rows.
- **FR-005**: Every row's values MUST remain readable directly on the row (e.g., inline labels or an adjacent value), without requiring the user to hover, consistent with this app's existing "no data hidden behind hover-only tooltips" pattern.
- **FR-006**: An hour or day missing the data a row needs MUST show as a clear gap in that row, consistent with how this app already marks missing data elsewhere, rather than a misleading or fabricated value.
- **FR-007**: The redesigned timeline MUST be available for both the 24-hour and 7-day periods this app already supports, switched via the same control pattern already used elsewhere in the app.
- **FR-008**: The redesigned timeline MUST remain usable on a narrow screen by scrolling horizontally within its own frame, rather than shrinking columns illegibly or breaking the surrounding page layout.
- **FR-009**: When sunrise/sunset data is available for a location, the overview MUST show a summary of sunrise and sunset times.
- **FR-010**: When moon phase data is available for a location, the overview MUST show the current moon phase alongside the sunrise/sunset summary.
- **FR-011**: When feels-like temperature, snow amount, or wind gusts data is available for a location, each MUST appear as its own row on the shared timeline, using the same alignment and observed/forecast distinction as the core rows (FR-001–FR-004); when any of these is not available, its row MUST simply be omitted.
- **FR-012**: The redesigned timeline MUST continue to reflect the user's existing unit system and theme selections, consistent with the rest of the app.
- **FR-013**: The redesigned timeline MUST replace the existing per-hour card layout at the same "Overview" navigation entry point, rather than being offered as an additional, separate view.

### Key Entities

- **Timeline Row**: One metric's values (condition, temperature, precipitation, wind, cloud cover, or — where available — feels-like temperature, snow, or wind gusts) laid out across the shared time axis, each point tagged observed or forecast, or absent for a gap.
- **Sun & Moon Summary**: Sunrise time, sunset time, and current moon phase for the displayed period, shown once per view rather than as a per-hour row.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can read every tracked metric for a single hour or day by looking at one vertical position on the timeline, without hovering or scrolling between separate charts.
- **SC-002**: 100% of rows on the timeline align to the same shared time axis and share one "now" marker position.
- **SC-003**: 100% of forecast data points across every row are visually distinguishable from observed points, using one consistent convention.
- **SC-004**: The timeline remains fully readable (no illegible or overlapping content) on both a typical desktop window and a narrow mobile-width window, via horizontal scrolling on the latter.
- **SC-005**: 100% of the enrichment rows/summary from User Story 3 (sun/moon, feels-like, snow, gusts) that aren't available for a given location are cleanly omitted rather than shown broken or empty.

## Assumptions

- "A new dashboard more like these" is interpreted as a redesign of this app's existing combined overview (introduced previously) into a synchronized multi-row timeline, replacing its current per-hour card grid at the same navigation entry point — not a second, additional dashboard alongside the existing one, and not a rebuild of this app as a mobile app matching Mockup 2's phone-shaped panels.
- The four core rows (condition icons, temperature, precipitation, wind, cloud cover) are fully in scope since this app already tracks all four; the enrichment rows the mockups also show (feels-like temperature, snow amount, wind gusts, sunrise/sunset, moon phase, UV index) depend on data this app does not currently source. Sunrise/sunset and moon phase are treated as expected to be reasonably available (common in weather data sources) and are in scope (User Story 3); feels-like temperature, snow, and gusts are included on a best-effort, show-only-if-available basis; UV index is out of scope for this iteration as the least central element of the reference mockups.
- Mockup 2's circular "watch face" widgets and separate mobile card layout are treated as alternate presentations of the same underlying idea already covered by Mockup 1's timeline, not additional requirements — this feature does not add a distinct compact/widget view.
- The existing 30-day window, nearby comparison stations, unit system, and theme behavior are all unchanged by this redesign except where an FR above explicitly says otherwise.
