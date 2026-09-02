# Feature Specification: Timezone Label and Temperature Heat Scale

**Feature Branch**: `012-timezone-and-temperature-scale`

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "add a timezone, left of the Now vertical line, on same level as Now. The temprature scaling, could it fade från dark blue -40 celsius to red +40 ? Everything below 0 should be to the blue color."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Temperature that reads hot or cold at a glance (Priority: P1)

A user scanning the timeline's temperature row today sees every value in the same single warm-orange color, regardless of whether it's -20°C or +20°C — the line's shape (dashed line 008 already added gradient shading, but the timeline's temperature line and its color are the same warm tone in mid-winter as in mid-summer. The temperature row is recolored so its color reflects the actual temperature: a continuous scale fading from a dark, cold blue at -40°C, staying in blue tones for the entire range below freezing, up through a neutral point at 0°C, and on to a warm red at +40°C — so a user can tell "this is a cold stretch" or "this is a hot stretch" from color alone, before reading a single number.

**Why this priority**: Directly requested; the temperature row is the most-scanned row on the timeline, and a value-reflecting color is a bigger at-a-glance improvement than a fixed accent color.

**Independent Test**: Open the timeline for a series spanning both sub-zero and warm hours; confirm the coldest hours render in a visibly darker/more saturated blue, the hours right around 0°C render in a neutral tone, and the warmest hours render in red — with every value below 0°C staying within the blue portion of the scale (never appearing in a warm hue).

**Acceptance Scenarios**:

1. **Given** a column with a temperature of -40°C or colder, **When** the temperature row renders, **Then** that column's color is the scale's darkest/coldest blue.
2. **Given** a column with a temperature of +40°C or warmer, **When** the temperature row renders, **Then** that column's color is the scale's warmest red.
3. **Given** a column with a temperature of exactly 0°C, **When** the temperature row renders, **Then** that column's color is the scale's neutral midpoint, visually distinct from both the coldest blue and the warmest red.
4. **Given** two columns, one at -10°C and one at -30°C, **When** the temperature row renders, **Then** both are shades of blue, and the -30°C column is visibly darker/colder than the -10°C column.
5. **Given** the temperature row's forecast-vs-observed distinction, **When** it renders, **Then** the dashed-forecast/solid-observed styling is preserved, with the same value-driven color underneath.
6. **Given** any active theme (Midnight, Bright, Glass), **When** the temperature row renders, **Then** the color scale remains legible against that theme's background.

---

### User Story 2 - See what timezone the timeline's hours are in (Priority: P2)

A user looking at the 24-hour timeline's hour labels today has no indication of which timezone those hours are shown in — they're the viewer's own local time (established in 009), but nothing on screen says so. A timezone indicator is added to the timeline, positioned to the left of the "Now" marker line at the same vertical level as the "Now" label, so a user can immediately confirm the hours they're reading match their own local time (or spot when they don't, e.g. if traveling).

**Why this priority**: A smaller orientation aid, directly requested but lower-impact than the temperature scale — useful context, not a correctness fix.

**Independent Test**: Open the 24-hour timeline for a series with an observed/forecast boundary; confirm a timezone indicator appears immediately to the left of the vertical "Now" line, vertically aligned with the "Now" text label.

**Acceptance Scenarios**:

1. **Given** the 24-hour timeline renders with a "Now" marker line present, **When** the user looks at the marker, **Then** a timezone indicator appears to its left, at the same vertical position as the "Now" label.
2. **Given** the viewer's device is set to a specific local timezone, **When** the indicator renders, **Then** it reflects that same local timezone the hour labels themselves already use (009's locale-independent local-hour fix).
3. **Given** a 24-hour series with no observed/forecast boundary (no "Now" line to anchor to), **When** the timeline renders, **Then** the timezone indicator still appears somewhere clearly associated with the hour-label row, rather than being omitted entirely.
4. **Given** the 7-day view, **When** it renders, **Then** no timezone indicator is shown, since that view's columns are whole days, not hours in a specific timezone-sensitive sense.

---

### Edge Cases

- A temperature value outside the -40°C to +40°C range (extreme cold or heat) is clamped to the scale's coldest-blue or warmest-red endpoint color rather than extrapolating further or breaking the scale.
- The temperature row's existing "no data" gap indicator and the new "interpolated estimate" marker (009) both remain visually distinguishable from a genuinely-colored value — the color scale applies only to columns with an actual (measured, forecast, or interpolated) numeric value.
- The timezone indicator reflects a fixed offset/name for the viewer's current local timezone; it does not need to account for a daylight-saving transition occurring mid-way through the displayed 24-hour window (a rare edge case already out of scope for this app's existing hour-label handling).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The timeline's temperature row MUST color each column's value according to a continuous scale anchored at -40°C (coldest, dark blue) through 0°C (neutral midpoint) to +40°C (warmest, red).
- **FR-002**: Every temperature value at or below 0°C MUST render within the blue portion of the scale — never in a red/warm hue — down to the -40°C endpoint.
- **FR-003**: Every temperature value at or above 0°C MUST render within a scale fading from the neutral midpoint toward red, up to the +40°C endpoint.
- **FR-004**: A temperature value colder than -40°C or warmer than +40°C MUST be clamped to the scale's respective endpoint color, not extrapolated.
- **FR-005**: The temperature row's existing solid-observed / dashed-forecast visual distinction MUST be preserved alongside the new value-driven color.
- **FR-006**: The temperature color scale MUST remain legible against the background of every existing theme (Midnight, Bright, Glass).
- **FR-007**: This recoloring applies to the temperature row in both the 24-hour and 7-day timeline views.
- **FR-008**: The 24-hour timeline MUST display a timezone indicator reflecting the viewer's local timezone (the same timezone already used for the hour labels).
- **FR-009**: When the timeline has a "Now" marker line, the timezone indicator MUST be positioned to the left of that line, at the same vertical level as the "Now" label.
- **FR-010**: When the timeline has no "Now" marker line (no observed/forecast boundary), the timezone indicator MUST still be shown, associated with the hour-label row.
- **FR-011**: The 7-day timeline view MUST NOT show a timezone indicator.

### Key Entities

- **Temperature Color Scale**: A continuous mapping from a temperature value (Celsius) to a display color, anchored at -40°C/0°C/+40°C, clamped beyond those bounds.
- **Timezone Indicator**: A short label reflecting the viewer's local timezone, shown once per 24-hour timeline render.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user glancing at the temperature row can correctly identify whether a given stretch is "cold" or "hot" from color alone, without reading the numeric values, in a usability spot-check.
- **SC-002**: 100% of temperature values at or below 0°C in a rendered series appear in a blue hue; 100% of values at or above 0°C appear fading toward red — verified across a series spanning the full -40°C to +40°C range.
- **SC-003**: The timezone indicator is visible on every 24-hour timeline render, whether or not a "Now" line is present.
- **SC-004**: The timezone indicator correctly matches the viewer's actual local timezone in a spot-check across at least two different timezone settings.

## Assumptions

- The temperature scale's exact intermediate hues (between -40°C dark blue and 0°C neutral, and between 0°C neutral and +40°C red) are a smooth, continuous fade — not discrete color bands — since the user asked for a "fade," not a stepped scale.
- "Neutral midpoint" at 0°C is interpreted as a pale/desaturated tone (e.g. a light grey or near-white blue) that reads as neither warm nor cold, rather than picking an arbitrary third hue — this is the most common convention for cold/hot diverging color scales and keeps the transition visually smooth.
- The timezone indicator displays a UTC-offset-style label (e.g. "UTC+2") rather than an IANA zone name (e.g. "Europe/Stockholm") or a locale-dependent abbreviation (e.g. "CEST") — an offset is unambiguous, always computable from the browser's own timezone data, and doesn't depend on locale/browser support for zone-name formatting.
- This feature does not add a legend or color-key explaining the temperature scale — the scale is expected to read intuitively (blue = cold, red = hot) the way it does in other weather apps and forecast graphics.
- The temperature color scale replaces this row's existing fixed accent color (010-timeline-visual-styling) for the temperature row specifically; it does not change any other row's coloring.
