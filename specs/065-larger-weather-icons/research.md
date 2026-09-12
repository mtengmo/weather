# Phase 0 Research: Larger Weather Icons

## 1. Current sizes and target sizes

**Decision**: Roughly 1.6x each placement's current size, rounded to a clean number:

| Placement | File | Current | New |
|---|---|---|---|
| Today card | `TodaySummaryCard.tsx` | 40px | 64px |
| Hourly timeline "Weather" row | `WeatherIconOverview.tsx` | 28px | 44px |
| Details table | `ObservationDetails.tsx` | 28px | 44px |
| 7-day forecast strip | `WeeklyForecastStrip.tsx` | 28px | 44px |

**Rationale**: 64/40 ≈ 1.6x and 44/28 ≈ 1.57x — both comfortably clear spec.md's SC-001 minimum
("at least 50%") with headroom, while 64px continuing to exceed 44px preserves FR-002's "Today
card stays largest" ordering exactly as it is today (40 > 28 becomes 64 > 44). Confirmed directly
in code that all three non-Today-card placements currently share the identical 28px size, so
giving them the same new size keeps that existing parity intact too — this feature doesn't invent
a new size hierarchy, it scales the existing one up uniformly.

**Alternatives considered**: A single flat multiplier applied to non-round pixel values (e.g.
28 × 1.5 = 42) — rejected in favor of clean, easy-to-read numbers (44, 64) that any future
follow-up change can reference without doing arithmetic first.

## 2. The hourly timeline's grid already absorbs a larger icon safely

**Decision**: No grid/column-width change needed in `WeatherIconOverview.tsx` or its CSS.

**Rationale**: Confirmed in `src/index.css`: the timeline's scrollable wrapper already has
`min-width: max(900px, 100%)` and its own `width: max-content` sizing, with each row using
`grid-template-columns: repeat(periods.length, 1fr)` (equal-width columns) inside that wrapper —
so a taller/wider icon at 44px simply makes the row (and the container it scrolls in) grow to fit,
exactly like any other row content already does; this is the same existing mechanism spec.md's
Edge Cases already describes ("the row keeps scrolling exactly as it does today, just with bigger
icons in it"). No code change beyond the `width`/`height` props themselves.

**Alternatives considered**: Adding an explicit `min-width` per timeline cell to "guarantee" room
for the larger icon — rejected as unnecessary; the existing `1fr` + scrollable-wrapper setup
already guarantees it structurally.

## 3. The 061 cartoon-companion character (Today card) should scale alongside the weather icon it's paired with

**Decision**: Also update `.today-summary-character`'s CSS `height` from `40px` to `64px`, matching
the Today card's enlarged weather icon.

**Rationale**: This isn't the weather icon artwork itself (spec.md's scope), but
`.today-summary-character`'s own existing CSS comment says it's deliberately "capped to the icon's
own height" — that stated intent (matching heights) breaks if the weather icon grows to 64px and
the companion stays pinned at 40px, leaving it looking undersized next to its now-larger neighbor.
Keeping the two in sync preserves the already-documented design intent rather than introducing a
new mismatch as a side effect of this change.

**Alternatives considered**: Leaving `.today-summary-character` untouched, since it's technically
a different feature (061) — rejected; per FR-004's own logic (the lucide fallback icon must scale
alongside the artwork so the two "stay visually consistent in size"), the same reasoning applies to
this other same-row neighbor even though it's not literally named in spec.md.

## 4. The `windy` lucide fallback icon

**Decision**: The lucide `<iconInfo.Icon size={...} />` fallback branch at each of the four call
sites already shares the exact same `size`/`width`/`height` value as its sibling `<img>` branch
(confirmed in code: both branches are set from the same local size at each call site today) — so
updating that one shared value at each site satisfies FR-004 automatically, no separate change
needed.

**Rationale**: FR-004 is already structurally guaranteed by how the existing code is written (one
size value driving both branches of the `iconInfo.kind === "smhi-symbol" ? <img ...> :
<iconInfo.Icon ...>` conditional at each site) — nothing new to design here.
