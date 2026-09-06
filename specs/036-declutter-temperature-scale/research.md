# Research: Coarser Temperature Timeline Scale

## Decision: Widen `TEMPERATURE_TICK_STEP` from 5 to 10

**Rationale**: `buildTicks()` already generates a step-based list of ticks by flooring/ceiling the row's min/max to the nearest step. Changing `TEMPERATURE_TICK_STEP` from `5` to `10` halves the number of gridlines/labels with no other logic change, satisfying FR-001/FR-002/FR-003.

**Alternatives considered**: Removing the scale entirely (the original ask) — superseded by the user's own follow-up request to keep a coarser scale instead.

## Decision: Anchor tick generation at 0 instead of at the row's own min

**Rationale**: Today `buildTicks()` computes `start = floor(scale.min / STEP) * STEP`. Since `scale.min` varies per period, the set of tick values (and which values are multiples of the step) shifts from period to period — e.g., a period ranging 3–22°C floors to 0, but one ranging 4–22°C floors to 0 too, while 6–22°C would floor to 5 under the old 5-step (not a multiple of 10 anymore under the new step unless anchoring is fixed). To guarantee 0 is *always* one of the generated values (FR-004/FR-005), the sequence must be generated as multiples of `TEMPERATURE_TICK_STEP` counted from literal 0, not from `scale.min`. Concretely: `start = floor(scale.min / STEP) * STEP` already produces a multiple of `STEP` from 0 (e.g., `floor(3/10)*10 = 0`, `floor(-13/10)*10 = -20`) — so the existing floor/ceil formula already anchors at 0 by construction, as long as `STEP` itself doesn't change per period. No change to the formula is needed beyond the step constant; the "anchor at 0" requirement is really "keep computing ticks as multiples of a fixed step from 0" (which the current code already does) plus a new guarantee that 0 itself is always included even if the natural floor/ceil range doesn't need it to cover the data (e.g., data 5–25°C floors to 0 already; but data exactly 12–25°C would floor to 10, excluding 0).

**Follow-up implication**: A small explicit check is needed after generating the floor/ceil range: if the resulting tick list doesn't include `0`, extend it (widen `start` to `min(start, 0)` and `end` to `max(end, 0)`) so 0 is always present, per FR-005.

**Alternatives considered**:
- *Always start the axis exactly at 0 and never extend below/above the natural range otherwise* — rejected because it would clip the temperature line/fill for negative-only periods, contradicting FR-006 (line/fill must render unchanged).
- *Show 0 only when it falls naturally within the rounded range* — rejected because it doesn't satisfy FR-005's explicit "always show 0" requirement.

## Decision: Leave `dedupeCloseTicks`, `clampTickLabelPercent`, and gridline rendering untouched

**Rationale**: These operate on whatever `ticks` list `buildTicks()` produces; widening the step and guaranteeing a 0 tick doesn't change their contracts (a list of `{value, y}` ticks). Existing overlap/edge-clamping safeguards continue to apply unmodified, satisfying the Assumptions note in the spec.

**Alternatives considered**: Rewriting the thinning logic — unnecessary; the existing algorithm already handles "few ticks after widening the step," including the guaranteed extra 0 tick, without modification.
