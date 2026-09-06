# Research: Fix Temperature Scale Layout and Add Header Logo

## Decision: Where the degree-scale moves to

**Decision**: Nest the tick-label scale inside the existing `.weather-timeline-row-title` sticky
box (7rem wide, shared by every row), as a flex sub-column to the left of the row's label text,
rather than giving it a separate sticky column after the title.

**Rationale**: Every row's title column is a fixed 7rem so that the scrolling data grid begins at
the exact same x-offset for every row — this is what keeps the "now" marker line and period
columns pixel-aligned down the page (008 research.md §1). Widening only the temperature row's
title column (to fit a separate scale column before it) would shift that one row's data start
point relative to every other row, breaking that alignment. Nesting the scale inside the existing
7rem box avoids the problem entirely — no width change, so no alignment regression — and it
directly satisfies the request that the scale sit to the left of the (now-shortened) "Temp" text.

**Alternatives considered**: A separate sticky column before the title (shifts alignment, rejected
per above). Keeping the scale after the title but adding a visible gap/background separation —
doesn't address the user's explicit "left of Temperature" ask, and doesn't fix the actual
overlap-with-neighboring-tick-labels bug (see below), only relocates the wrong problem.

## Decision: Fixing overlapping tick labels

**Decision**: After computing the full 5°-step tick list (unchanged), apply a greedy minimum-gap
filter to decide which tick *labels* actually render: sorted top-to-bottom by their (clamped)
vertical position, a label is kept only if it's at least ~16% of the 70px row height away from the
previously kept label — enough clearance for the ~0.65rem label text not to visually touch its
neighbor. The topmost and bottommost ticks (the range boundaries) are always kept; a
too-close-to-the-boundary middle tick is dropped in favor of the boundary tick. Gridlines are
unaffected — every 5° step still gets its faint horizontal line in the chart itself; only which
labels are drawn is thinned.

**Rationale**: The regression happens because ticks are generated at a fixed step (every 5°)
independent of the row's actual data range — for a narrow range (e.g. 16–21°C) two adjacent ticks'
*unclamped* Y positions can land extremely close together (or both past the label-safe clamp
bounds added in 032, landing on literally the same clamped position), so their text overlaps.
Thinning by measured vertical gap (rather than, say, dynamically changing the tick step to 10°)
keeps the fix local to the *label* rendering step, leaves `buildTicks`/gridlines untouched, and
degrades gracefully for any range width without needing to guess a "right" step per range.

**Alternatives considered**: Adaptive tick step (e.g. switch from 5° to 10° steps when the range
is narrow) — more invasive (changes `buildTicks`, affects gridlines too, needs its own threshold
tuning) for no added benefit over label-level thinning, which spec Assumptions already accepted as
in-scope.

## Decision: Logo asset and placement

**Decision**: Reuse `public/icon-192.png` (already generated from
`docs/logos/tengmovader_icon_transluent.png` in 034-rebrand-tengmo-vader) as the `<img>` source,
displayed at a small fixed size (2rem) as the first child of the header's `.current-conditions`
flex group in `src/App.tsx`.

**Rationale**: No new binary asset is needed — `icon-192.png` already exists at a size well above
any in-page display size, so the browser can downscale it losslessly. Placing it as the first
child of the existing `.current-conditions` flex group (rather than a new top-level header child)
avoids disturbing the header's existing `justify-content: space-between` two-group layout
(`.current-conditions` vs. the right-aligned controls), and its `flex-wrap: wrap` behavior means
the logo simply wraps onto its own line at narrow widths like the rest of that group already does
— no separate mobile-specific handling needed.

**Alternatives considered**: A dedicated smaller-resolution asset generated just for the header —
unnecessary bytes-savings complexity for a 46KB PNG shown once per page load; the existing file is
small enough already.
