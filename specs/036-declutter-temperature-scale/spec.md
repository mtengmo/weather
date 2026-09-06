# Feature Specification: Coarser Temperature Timeline Scale

**Feature Branch**: `036-declutter-temperature-scale`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "could you remove the temp scale number on the line, on temperature, enough with the 5 degress level of lines on the diagram." Follow-up: "maybe have fixed level of 10 degrees instead?" Follow-up: "could we also start the diagram with 0 and write that out? maybe easier to read, at least worth a test"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cleaner temperature trend line (Priority: P1)

A dashboard viewer looks at the temperature row of the weather timeline to get a quick sense of how temperature rises and falls over the period. Today the row is covered in a repeating set of numeric degree labels and a matching horizontal line for every 5-degree step, which competes visually with the temperature curve itself, and the scale's starting point shifts with each period's data. The viewer wants fewer, coarser reference lines and labels — one for every 10 degrees instead of every 5 — anchored to a consistent, always-labeled 0° line, so the scale is easier to read at a glance.

**Why this priority**: This is the entire scope of the request — the temperature row is the one row affected, and widening the step and anchoring it at zero is the whole value being delivered.

**Independent Test**: Can be fully tested by opening the dashboard, viewing the temperature timeline row across periods with different temperature ranges (including ranges that stay above zero, ranges that stay below zero, and ranges that cross zero), and confirming labels and reference lines only appear at 10-degree steps counted from 0 (never at intermediate 5-degree steps), with a 0° line and label always present, while the temperature line, its shaded fill, and existing high/low indicators still render normally.

**Acceptance Scenarios**:

1. **Given** the dashboard is open and the temperature timeline row is visible, **When** the viewer looks at the row, **Then** numeric degree labels appear only at 10-degree steps counted from 0, never at the intermediate 5-degree steps shown today.
2. **Given** the temperature timeline row is visible, **When** the viewer looks at the area behind the temperature line, **Then** horizontal reference lines appear only at those same 10-degree steps, and a 0° reference line and label are always present even when every observed/forecast temperature in the period is above or below zero.
3. **Given** the temperature timeline row after the change, **When** the viewer looks at the line itself, **Then** the temperature curve, its shaded fill, and the existing high/low value indicators still appear exactly as before.

---

### Edge Cases

- What happens when every temperature in the period is well above zero (e.g., 18-25°C)? The scale must still extend down to include and label the 0° line, not just the range immediately around the data.
- What happens when every temperature in the period is well below zero (e.g., -15 to -5°C)? The scale must still extend up to include and label the 0° line, not just the range immediately around the data.
- What happens when the temperature range for the displayed period is very narrow (e.g., a 4°C spread, smaller than one 10-degree step)? The row must still show 0 plus whatever additional 10-degree steps are needed to cover the range.
- What happens when the temperature range for the displayed period is very wide (e.g., a 30°C spread, or a range crossing zero)? The row must still only show 10-degree steps counted from 0, not a denser scale, and steps must not visually overlap or collide.
- What happens for the other timeline rows (wind, rain, cloud) that never had degree labels or 5-degree reference lines? They must remain visually unchanged — this request only affects the temperature row.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The temperature timeline row MUST show numeric degree-scale labels at a fixed 10-degree step, replacing today's 5-degree step.
- **FR-002**: The temperature timeline row MUST render horizontal reference lines at the same fixed 10-degree step, replacing today's 5-degree step.
- **FR-003**: The temperature timeline row MUST NOT show any label or reference line at an intermediate 5-degree step that falls between two 10-degree steps.
- **FR-004**: The temperature scale's steps MUST be counted from a fixed 0° anchor (i.e., ...-10, 0, 10, 20...), rather than each period rounding outward from its own data range independently.
- **FR-005**: The temperature timeline row MUST always show a 0° reference line and label, even when the period's actual temperatures never reach zero, extending the visible scale to include it.
- **FR-006**: The temperature timeline row MUST continue to render the temperature line, its shaded gradient fill, and existing high/low value indicators unchanged in position and appearance.
- **FR-007**: The change MUST be limited to the temperature row; the wind, rain, and cloud timeline rows MUST render exactly as they do today.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any period shown on the dashboard, all visible degree labels and reference lines on the temperature row fall on a 10-degree step counted from 0 (e.g., ...-10, 0, 10, 20...), with none at an intermediate 5-degree step.
- **SC-002**: The number of reference lines and labels shown on the temperature row is reduced by roughly half compared to today's 5-degree step, for the same temperature range.
- **SC-003**: A 0° reference line and label are visible on the temperature row for 100% of periods, regardless of whether the period's actual temperatures cross zero.
- **SC-004**: The temperature trend line, its shaded fill, and the high/low indicators remain fully visible and unchanged for 100% of periods after the change.

## Assumptions

- "Fixed level of 10 degrees" means the existing degree-scale step is widened from 5 to 10; the labels and reference lines are not removed, only made coarser.
- "Start the diagram with 0" means the step sequence is always anchored at 0 (0, ±10, ±20, ...) rather than rounding outward from each period's own min/max — so the scale's shape may shift less between periods, and always includes zero as a fixed, labeled reference point.
- Existing safeguards that keep labels from overlapping or running off the row (e.g., clamping label position, thinning labels that land too close together) continue to apply at the new 0-anchored 10-degree step.
- This is called out as worth trying rather than a firm requirement locked in for the long term ("at least worth a test") — it should be easy to revert to the previous per-period rounding if the always-visible 0° line reads poorly for periods far from zero, but the initial implementation should default to the 0-anchored behavior described here.
- This request targets the temperature row of the dashboard's weather timeline overview; it does not affect any other chart elsewhere in the app that happens to show temperature (e.g., detailed history charts), since the description refers to "the diagram" showing the 5-degree lines and numbers on the line.
