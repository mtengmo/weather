# Feature Specification: Coarser Temperature Timeline Scale

**Feature Branch**: `036-declutter-temperature-scale`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "could you remove the temp scale number on the line, on temperature, enough with the 5 degress level of lines on the diagram." Follow-up: "maybe have fixed level of 10 degrees instead?" Follow-up: "could we also start the diagram with 0 and write that out? maybe easier to read, at least worth a test" Follow-up (after trying it live): "the scale is not correct, must be some kind of bug on it. looks like 10 degrees is zero" — the always-visible 0° line was reverted; see Assumptions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cleaner temperature trend line (Priority: P1)

A dashboard viewer looks at the temperature row of the weather timeline to get a quick sense of how temperature rises and falls over the period. Today the row is covered in a repeating set of numeric degree labels and a matching horizontal line for every 5-degree step, which competes visually with the temperature curve itself. The viewer wants fewer, coarser reference lines and labels — one for every 10 degrees instead of every 5 — so the row still shows a scale, but with roughly half the visual clutter.

**Why this priority**: This is the entire scope of the request — the temperature row is the one row affected, and widening the step is the whole value being delivered.

**Independent Test**: Can be fully tested by opening the dashboard, viewing the temperature timeline row across periods with different temperature ranges, and confirming labels and reference lines only appear at 10-degree steps (never at intermediate 5-degree steps), while the temperature line, its shaded fill, and existing high/low indicators still render normally.

**Acceptance Scenarios**:

1. **Given** the dashboard is open and the temperature timeline row is visible, **When** the viewer looks at the row, **Then** numeric degree labels appear only at 10-degree steps, never at the intermediate 5-degree steps shown today.
2. **Given** the temperature timeline row is visible, **When** the viewer looks at the area behind the temperature line, **Then** horizontal reference lines appear only at those same 10-degree steps.
3. **Given** the temperature timeline row after the change, **When** the viewer looks at the line itself, **Then** the temperature curve, its shaded fill, and the existing high/low value indicators still appear exactly as before.

---

### Edge Cases

- What happens when the temperature range for the displayed period is very narrow (e.g., a 4°C spread, smaller than one 10-degree step)? The row must still show at least the boundary steps needed to cover the range.
- What happens when the temperature range for the displayed period is very wide (e.g., a 30°C spread)? The row must still only show 10-degree steps, not a denser scale, and steps must not visually overlap or collide.
- What happens when the period's temperatures stay entirely well above zero (e.g., 18-25°C) or entirely well below zero (e.g., -15 to -5°C)? The scale must show only steps rounded outward from that period's own range — it must NOT force a 0° line into view (see Assumptions for why this was tried and reverted).
- What happens for the other timeline rows (wind, rain, cloud) that never had degree labels or 5-degree reference lines? They must remain visually unchanged — this request only affects the temperature row.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The temperature timeline row MUST show numeric degree-scale labels at a fixed 10-degree step, replacing today's 5-degree step.
- **FR-002**: The temperature timeline row MUST render horizontal reference lines at the same fixed 10-degree step, replacing today's 5-degree step.
- **FR-003**: The temperature timeline row MUST NOT show any label or reference line at an intermediate 5-degree step that falls between two 10-degree steps.
- **FR-004**: The temperature timeline row MUST continue to render the temperature line, its shaded gradient fill, and existing high/low value indicators unchanged in position and appearance.
- **FR-005**: The change MUST be limited to the temperature row; the wind, rain, and cloud timeline rows MUST render exactly as they do today.
- **FR-006**: The temperature scale MUST NOT force a 0° reference line/label into view for periods whose data doesn't naturally round to it — each period's steps are still rounded outward from that period's own min/max, same as before, just at the wider 10-degree step. (Superseded FR-004/FR-005 from the previous draft — see Assumptions.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any period shown on the dashboard, all visible degree labels and reference lines on the temperature row fall on a 10-degree step rounded outward from that period's own range, with none at an intermediate 5-degree step.
- **SC-002**: The number of reference lines and labels shown on the temperature row is reduced by roughly half compared to today's 5-degree step, for the same temperature range.
- **SC-003**: The temperature trend line, its shaded fill, and the high/low indicators remain fully visible and unchanged for 100% of periods after the change.
- **SC-004**: No degree label appears clamped to the top/bottom edge of the row in a position that misrepresents its own value (the specific defect reported live from the always-visible-0° attempt).

## Assumptions

- "Fixed level of 10 degrees" means the existing degree-scale step is widened from 5 to 10; the labels and reference lines are not removed, only made coarser.
- **Reverted**: an earlier draft of this feature additionally forced a 0° line to always be visible ("start the diagram with 0"), anchoring the step sequence at a fixed 0 regardless of the period's own range. Once deployed, this produced a real bug: the row's Y-scale stays fixed to the plotted temperature curve's own min/max (unchanged per FR-004/SC-003), so for a period far from freezing (e.g. 15-25°C), the forced 0° tick's true vertical position landed far outside the visible chart area. Its *label* was then pulled back into view by the existing edge-clamping safeguard while its gridline stayed off-canvas, and the collision between that clamped "0°" label and the real boundary tick's label (e.g. "10°") could result in the wrong one being kept — reported live as "looks like 10 degrees is zero." Given the original ask already called this "worth a test," it's reverted to rounding outward from the period's own range (matching pre-existing behavior, just at the wider step), and forcing a 0° anchor is out of scope for this feature.
- Existing safeguards that keep labels from overlapping or running off the row (e.g., clamping label position, thinning labels that land too close together) continue to apply at the new 10-degree step, unchanged from before this feature.
- This request targets the temperature row of the dashboard's weather timeline overview; it does not affect any other chart elsewhere in the app that happens to show temperature (e.g., detailed history charts), since the description refers to "the diagram" showing the 5-degree lines and numbers on the line.
