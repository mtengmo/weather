# Feature Specification: UV Index Risk Indicator

**Feature Branch**: `027-uv-index-alert`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "could you add UV index, if it risky just. Maybe just add it to the weather icon if it's in risk, no seperate part of the graph that bloat the design, keep it simple. doc: https://opendata.smhi.se/metanalys/strang/introduction, example of api: https://opendata-download-metanalys.smhi.se/api/category/strang1g/version/1/geotype/point/lon/16/lat/58/parameter/116/data.json?from=20260905"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a UV risk warning at a glance (Priority: P1)

A user checking the weather during a sunny stretch of the day wants to know, without hunting through a separate chart, whether the sun is currently strong enough that they should think about sun protection. Today the app shows a plain weather condition icon (sun, cloud, rain, etc.) per hour/day and says nothing about UV exposure.

**Why this priority**: This is the entire feature — a lightweight visual cue on data the user is already looking at, not a new screen or chart to learn.

**Independent Test**: For a period whose UV level is high enough to matter, the period's existing weather icon shows a small added indicator; for a period whose UV level is low/moderate, the icon looks exactly as it does today.

**Acceptance Scenarios**:

1. **Given** the 24-hour overview for a location with UV data, **When** a period's UV level falls at or above the "risk" threshold, **Then** that period's weather icon shows a small UV warning indicator alongside the existing condition icon.
2. **Given** the 24-hour overview for the same location, **When** a period's UV level is below the "risk" threshold (including all night-time periods), **Then** that period's weather icon renders unchanged from today, with no UV indicator.
3. **Given** a period showing the UV indicator, **When** the user inspects that period (e.g. hovers/taps for its accessible label), **Then** the label mentions the UV risk in plain language, not just a raw number.

---

### User Story 2 - No clutter when UV data isn't available (Priority: P2)

A user viewing a location outside Sweden, or a forecast period in the future, still wants a clean, working overview — the app must not show a broken indicator, an error, or a stray blank badge for periods where UV data simply doesn't exist.

**Why this priority**: Directly required by the "keep it simple, no bloat" instruction — an indicator that sometimes renders wrong or empty is worse than not having the feature. Second priority because it's a guardrail on User Story 1, not a separate capability.

**Independent Test**: Load a non-Swedish location, and separately load a forecast (future) period for a Swedish location; in both cases the weather icons render exactly as they do today, with no UV indicator and no console errors.

**Acceptance Scenarios**:

1. **Given** a location outside the UV data provider's coverage area, **When** the overview loads, **Then** every weather icon renders as it does today, with no UV indicator anywhere.
2. **Given** a Swedish location with a forecast (not-yet-observed) period, **When** the overview loads, **Then** that forecast period's icon shows no UV indicator, since UV risk isn't known for periods that haven't happened yet.

---

### Edge Cases

- What happens when the UV data source is temporarily unreachable? The rest of the weather data (temperature, precipitation, wind, condition icons) must still load and display normally — the UV indicator is simply absent for that load, the same way a missing wind reading doesn't block the rest of the page.
- What happens at the boundary between "risky" and "not risky" (a reading exactly at the threshold)? The threshold value itself counts as risky (inclusive), consistent with how public UV-risk guidance ("UV index 6 and above") is normally phrased.
- What happens for a period that mixes a partly-cloudy condition with a high UV reading (UV isn't blocked much by thin cloud)? The indicator reflects the UV reading itself, independent of the condition icon it's attached to — clouds in the icon don't suppress the UV badge.
- What happens in the 3-day and 7-day views, where each column already aggregates several hours/a whole day into one icon? The aggregated period shows the indicator when its representative UV reading (the same aggregation approach already used for that period's other values) meets the risk threshold.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST show a small, visually distinct UV risk indicator attached to an existing weather condition icon for any period whose UV level meets or exceeds the risk threshold — never as a separate row, chart, or section of the display.
- **FR-002**: The system MUST NOT show any UV indicator for a period whose UV level is below the risk threshold, so the change is invisible on non-risky days/hours.
- **FR-003**: The risk threshold MUST match the commonly recognized public-health guidance level at which sun-protection precautions are recommended (UV Index 6, the boundary between "moderate" and "high" on the standard 0–11+ scale).
- **FR-004**: The UV indicator MUST carry an accessible text description (e.g. "High UV") wherever the underlying weather icon already carries one, so the warning is available to assistive technology, not just conveyed by color/shape.
- **FR-005**: The system MUST omit the UV indicator (without showing an error or placeholder) for any period or location where UV data isn't available, including locations outside the data source's coverage and forecast (future, not-yet-observed) periods.
- **FR-006**: A failure to load UV data MUST NOT prevent or delay the rest of the weather overview (condition, temperature, precipitation, wind) from loading and displaying.
- **FR-007**: The UV indicator MUST appear consistently across every view that already shows the per-period weather condition icon (24-hour, 3-day, and 7-day overview), using each view's own existing period grouping.

### Key Entities

- **UV Reading**: One period's UV exposure level, tied to the same timestamp/period already used by that period's weather condition icon. Used only to decide whether the risk indicator shows — no numeric UV value is displayed to the user.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user glancing at the existing weather icons can identify every period with meaningful UV risk without opening any additional screen, chart, or control.
- **SC-002**: On a day/location with no elevated UV risk, the overview is pixel-for-pixel unchanged from before this feature — zero added visual clutter.
- **SC-003**: Locations or periods without UV data available continue to load and render the full weather overview with no errors, delays, or broken indicators, 100% of the time.

## Assumptions

- **Data source**: SMHI's STRÅNG analysed-irradiance product (`strang1g`, parameter 116) is the UV data source, reused via the app's existing SMHI integration. It provides hourly *analyzed* (measured/modelled-from-observations) readings, confirmed via a live sample request — not a forecast product.
- **Forecast periods have no UV indicator**: Because STRÅNG only publishes analyzed (past/near-real-time) data, forecast periods (today's later hours onward, and every future day) have no UV reading available and therefore never show the indicator. This is a real scope limit, not a bug — the feature only ever warns about UV risk for periods that have already happened or are happening now.
- **Geographic coverage**: STRÅNG covers Sweden (and immediate surrounding area) only, matching the app's existing SMHI-only features (e.g. station-based observations) — locations outside this coverage simply never show the indicator, consistent with how other SMHI-only capabilities already degrade gracefully elsewhere in the app.
- **Threshold**: UV Index ≥ 6 ("High" on the WHO scale) is used as the single "risky" cutoff, matching common public sun-safety guidance, rather than exposing the full 0–11+ scale or multiple tiers — kept to one simple yes/no signal per the "keep it simple" instruction.
- **No numeric display**: The feature shows a presence/absence warning only (icon badge), never the raw UV index number or a trend — the user asked specifically to avoid a new graph/section, and a bare number without context would invite exactly that kind of expansion.
- **Aggregated periods (3-day/7-day)**: A day or sub-day period's UV indicator is driven by that period's peak UV reading (the highest hourly value within it) — using the peak rather than an average, since "was there a risky window" is the question being answered, not "was the whole period risky on average."
