# Data Model: Coarser Temperature Timeline Scale

This feature has no persisted or transmitted data entities — it changes how an existing in-memory structure is generated for rendering. Documented here for completeness.

## Tick

Represents one degree-scale reference point on the temperature row (both its gridline and, if kept after label-thinning, its label).

| Field   | Type   | Description |
|---------|--------|--------------|
| `value` | number | Temperature in the row's display unit (°C/°F), always a multiple of `TEMPERATURE_TICK_STEP` counted from 0 |
| `y`     | number | Vertical position (percent, 0–100) within the row's plotting area, derived from `value` via the row's Y-scale |

**Invariants (post-change)**:
- `TEMPERATURE_TICK_STEP` is `10` (was `5`).
- The set of `Tick.value`s generated for a row always includes `0`, regardless of whether the row's actual min/max naturally rounds to include it.
- All `Tick.value`s are multiples of `10` (e.g., ..., -10, 0, 10, 20, ...) — no intermediate 5-degree values are ever generated.
- Ticks are still generated only for the `temperature` row; other rows (`wind`, `rain`, `cloud`) never have a `Tick` list (unchanged).

No changes to any other entity (`TimelineRow`, `Pt`, `YScale`, etc.) — this feature only touches how the `Tick[]` list is produced.
