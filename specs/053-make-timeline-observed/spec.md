# Feature Specification: Sticky Observed/Forecast Timeline Label, No Per-Column Repeat

**Feature Branch**: `053-make-timeline-observed`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "Under all weather icons on forecast, you print out forecast. Maybe possible to remove it, as it's little unneccery, or add it to a above the line that are above the hours as one sticky info? Change between observartion and sticky"

Context: The hourly timeline already has a section-header row directly above the hour-column grid, split into an "Observed" band and a "Forecast" band spanning the columns each covers (`018-dashboard-visual-redesign`). Underneath that, every individual forecast column *also* repeats its own small "Forecast" tag beneath its weather icon — redundant with the band already labeling that whole stretch of columns. The user wants that per-column repetition gone, and the existing Observed/Forecast band to stay visible ("sticky") while scrolling through the timeline's other rows (temperature graph, rain, wind), rather than only being visible at the very top.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - No repeated "Forecast" tag under every forecast column (Priority: P1)

A viewer looking at the hourly timeline sees each forecast column's weather icon without a small "Forecast" label repeated underneath it — that's already communicated once by the Observed/Forecast band above the columns.

**Why this priority**: This is the direct complaint — the per-column tag is redundant, noted as "little unnecessary."

**Independent Test**: Render a timeline with both observed and forecast columns; confirm no forecast column shows its own "Forecast" text beneath its icon, while the existing Observed/Forecast band above the columns still does.

**Acceptance Scenarios**:

1. **Given** a timeline with forecast columns, **When** the viewer looks at any forecast column's icon, **Then** no "Forecast" text appears beneath it.
2. **Given** the same timeline, **When** the viewer looks above the hour columns, **Then** the existing Observed/Forecast band is still there, unchanged in what it communicates.

---

### User Story 2 - The Observed/Forecast band stays visible while scrolling the timeline (Priority: P2)

A viewer scrolling down through the timeline's rows (condition icons, temperature graph, rain, wind) can still tell which columns are observed vs. forecast without scrolling back up to the band.

**Why this priority**: Removing the per-column repetition (US1) means that context is now only available in one place — keeping that one place visible while scrolling preserves the information the per-column tags used to provide locally.

**Independent Test**: Scroll down through the timeline's rows; confirm the Observed/Forecast band remains visible (pinned) rather than scrolling out of view.

**Acceptance Scenarios**:

1. **Given** a timeline taller than the viewport, **When** the viewer scrolls down through its rows, **Then** the Observed/Forecast band remains visible at the top of the timeline area.
2. **Given** the viewer has scrolled the timeline horizontally (more hour columns than fit on screen), **When** they look at the band, **Then** it still correctly reflects which visible columns are observed vs. forecast.

---

### Edge Cases

- What happens on a view with no forecast columns at all (e.g. a fully historical window)? The band shows only "Observed," unchanged from today — no forecast band, nothing new to make sticky.
- What happens on a view with no observed columns (all forecast)? The band shows only "Forecast," unchanged from today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: No individual timeline column MUST show its own "Forecast" tag beneath its icon.
- **FR-002**: The existing Observed/Forecast section-header band MUST remain, unchanged in what it communicates (which columns are observed vs. forecast).
- **FR-003**: The Observed/Forecast band MUST remain visible while the viewer scrolls through the timeline's other rows, instead of scrolling out of view with them.
- **FR-004**: This feature MUST NOT change the underlying observed/forecast classification of any period — purely a display change.

### Key Entities

- **Timeline section band**: The existing "Observed"/"Forecast" header row above the hour columns — now the sole place this distinction is shown, and kept visible while scrolling.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 timeline columns show a per-column "Forecast" tag.
- **SC-002**: 100% of the time, the Observed/Forecast band is visible while scrolling through the timeline's rows.
- **SC-003**: 0 regressions to which columns are classified observed vs. forecast.

## Assumptions

- "Sticky" means the band stays pinned in view while the viewer scrolls vertically past the timeline's other rows (condition, graph, rain, wind) — not a dynamically-relabeling indicator; the band already shows both "Observed" and "Forecast" side by side when both are present, which already satisfies "change between observation and forecast."
- The per-column removal (US1) applies only to the small text tag under each forecast icon — the timeline's other existing forecast indicators (e.g. the dashed/lighter styling already used for forecast data on the chart) are unaffected.
