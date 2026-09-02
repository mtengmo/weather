# Research: Overview Default, Location Panel, and Graph Readability

## §1. Where "selecting a location" should route to, now that Overview is the default

**Decision**: `App.tsx`'s `selectLocation` (called by `LocationPanel` on any selection — current
position, a favorite, or a fresh search result) now sets `view` to `"overview"` instead of
`"graph"`, matching the new default landing view.

**Rationale**: Spec FR-001 scopes the default explicitly to "whenever a location has resolved,"
which includes both the initial page load and any subsequent location change — landing back on
the graph after picking a new place would be an inconsistent regression against the same
principle the initial-load default just established. Nothing in the spec asks for `selectLocation`
to keep routing to `"graph"`, and User Story 1's Acceptance Scenario 2 only requires "Back to
graph" to keep working as an explicit action, not that location changes should default there.

**Alternatives considered**: *Keep `selectLocation` routing to `"graph"`* — rejected: would mean
the Overview is only ever the very-first view a user sees, never the view they land on after
actively switching locations, undermining the stated goal that Overview is "the primary, most
digestible view."

## §2. Consolidating location switching into a panel

**Decision**: New `LocationPanel.tsx` component, rendered from `App.tsx`'s header, wrapping the
existing `LocationSwitcher`, `FavoritesList`, and `PlaceSearch` components unchanged — only their
mount location and visibility move. A single header button (`aria-expanded`, `aria-controls`)
toggles the panel open/closed; the panel itself is a simple conditionally-rendered block (no new
portal/overlay library), styled to work as an anchored dropdown-style panel at both mobile and
laptop widths (spec FR-009) via the same responsive CSS approach already used elsewhere in this
app (flex-wrap, `@media` breakpoints — no new UI dependency).

**Rationale**: `LocationSwitcher`/`FavoritesList`/`PlaceSearch` are already self-contained,
prop-driven components with zero coupling to their mount location (confirmed in 009's header
relocation, which moved `PlaceSearch`/`FavoritesList` without touching their internals) — wrapping
them in a togglable container is a presentation-only change, consistent with 009's own precedent
of not rebuilding these components. Building a bespoke modal/portal system would add complexity
and a new interaction pattern this app doesn't otherwise use, when a simple anchored panel
(matching the app's existing lightweight, no-extra-dependency component style) satisfies every
functional requirement (FR-003–FR-009).

**Alternatives considered**:
- *A true modal with a backdrop overlay* — considered (the clarification answer allowed "a
  separate slide-out side panel or modal"); not chosen as the primary approach because an anchored
  panel needs no new focus-trap/backdrop-click machinery to satisfy FR-007 ("dismissible without
  changing selection") — a plain toggle plus an outside-click/Escape handler is sufficient and
  simpler, while still fully satisfying the clarification's intent (consolidating three sections
  behind one control).
- *Reuse `<dialog>`* — rejected: introduces platform-support/styling quirks (default browser
  chrome, `::backdrop` theming) this app's existing CSS-variable theme system doesn't already
  account for; a plain `div` panel keeps full control over theming, consistent with every other
  themed surface in this app (`.app-header`, `.observation-table-wrap`, etc. all already use plain
  elements with `[data-theme="..."]`-scoped rules, not native dialogs).

## §3. Dismissing the panel without changing the selection

**Decision**: The panel closes on: (a) a location actually being selected (FR-005, already
required), (b) an explicit close control inside the panel, (c) clicking/tapping outside the panel,
and (d) pressing Escape while the panel has focus — all four call the same "close" state setter,
none of them touch `selected`.

**Rationale**: FR-006/FR-007 require that adding/removing a favorite keeps the panel open (so
those actions must NOT trigger the same "close" path a selection does) while still needing an
unambiguous way to leave the panel without picking anything — outside-click and Escape are the
two standard, expected dismissal gestures for any anchored panel/dropdown, requiring no new
library (a `mousedown`/`keydown` listener on `document`, scoped only while the panel is open, is
sufficient — the same pattern already used nowhere else in this codebase but standard React).

## §4. Explicit `primarySource` field for the data-source note

**Decision**: Add `primarySource: "smhi" | "open-meteo"` to `ObservationSeries`
(`src/models/types.ts`), set in all three of `weatherApi.ts`'s `getObservations` return paths:
SMHI success (with or without a forecast fallback) → `"smhi"`; Open-Meteo-only (SMHI not covered,
or SMHI failed) → `"open-meteo"`. The already-existing `forecastFromFallbackSource` boolean
(006-forecast-now-marker) continues to describe the forecast-specific fallback case; the new field
describes the *observed* data's source, which — until now — was only implicit in `weatherApi.ts`'s
own control flow and never surfaced to the UI.

**Rationale**: `weatherApi.ts` is already the single place that decides which provider serves a
given location (research subject of no prior feature needing to expose it) — adding one field to
its return value is the smallest change that gives the UI everything FR-013/FR-014 need, without
re-implementing coverage-checking logic in a component. Combining it with the existing
`forecastFromFallbackSource` flag at render time (`"SMHI"` alone, or `"SMHI (forecast: Open-Meteo)"`,
or `"Open-Meteo"`) satisfies FR-014 without needing a third enum value for "mixed."

**Alternatives considered**: *Re-derive the source in the UI by calling `smhiProvider.isCovered`
again* — rejected: duplicates a coverage check `weatherApi.ts` already performed, doubles the
relevant network calls, and risks the UI's answer disagreeing with which provider was actually
used if coverage flips between the two calls.

## §5. Centering the timeline on "now"

**Decision**: In `WeatherIconOverview.tsx`, after the timeline renders (a `useEffect` keyed on the
computed `nowLeftPercent`/series identity), if `timelineWrapRef.current.scrollWidth >
timelineWrapRef.current.clientWidth` and `nowLeftPercent !== null`, set
`scrollLeft = (scrollWidth * nowLeftPercent / 100) - clientWidth / 2` (clamped to
`[0, scrollWidth - clientWidth]`). No-op when the content already fits or there's no "now" column
— covering spec FR-010/FR-011 directly. Re-runs on every fresh render of the timeline's underlying
data (FR-012) because the effect's dependency array includes the values that change when the
window/location changes.

**Rationale**: `timelineWrapRef` (the wheel-scroll ref added in 009) already exists and already
points at the exact scrollable container; `nowLeftPercent` is already computed for positioning the
visual "now" line. Reusing both means this is a small additive effect, not new plumbing. Centering
by scroll-position math (rather than, say, `scrollIntoView` on the "now" element) gives precise
control over the clamping needed at the very start/end of the content (FR-010's "as close as
possible to center" wording anticipates content near an edge not being perfectly centerable).

**Alternatives considered**: *`Element.scrollIntoView({ inline: "center" })` on the now-marker
element* — considered simpler, but rejected: `scrollIntoView`'s browser-native centering behavior
is less predictable across browsers for partial-edge cases (content shorter than the viewport on
one side) than direct `scrollLeft` arithmetic, and this app already computes `nowLeftPercent` as a
percentage — reusing that number keeps the two "now" concepts (visual line position, scroll
target) mathematically tied to the same source value.

## §6. Mirroring single-scale charts' Y-axis

**Decision**: For every `<YAxis>` in `ObservationChart.tsx` that currently appears alone (the
rain/wind/cloud single-metric charts), add a second `<YAxis>` with `orientation="right"` and the
same `dataKey`/domain as the existing left one (Recharts supports multiple `YAxis` elements sharing
one `yAxisId`, or two axes with matching implicit domains rendering identical tick sets). The
temperature chart's existing left-temp/right-precipitation two-`YAxis` layout is left untouched
(already satisfies "scale on both edges," just with two different metrics rather than a mirrored
single one).

**Rationale**: Recharts' `<YAxis>` component already supports an arbitrary number of axis elements
per chart; adding a second one bound to the same series' domain (rather than a different
`yAxisId`) is the standard Recharts pattern for a "mirrored" axis, requiring no manual scale
computation — Recharts derives both from the same plotted data.

**Alternatives considered**: *Custom-drawn duplicate tick labels via a Recharts `Customized`
layer* — rejected: reinvents what a second `<YAxis orientation="right">` already does natively,
for no benefit.

## §7. Point markers on every line

**Decision**: Change every `<Line dot={false} .../>` in `ObservationChart.tsx` to
`dot={{ r: 3 }}` (or a small themed dot renderer), keeping each line's existing
`activeDot={{ r: 5 }}` (hover state) unchanged. For lines split into observed/forecast segments
(the already-established pattern of a `...Forecast`-suffixed sibling `<Line>` with
`strokeDasharray`), each segment's dots inherit that segment's own stroke color/dash convention
automatically since Recharts colors default dots from the line's own `stroke`/`fill` — satisfying
FR-017 ("observed and forecast markers remain visually distinguishable") without extra code, since
the forecast line already renders with reduced-opacity/dashed styling that a dot inherits.

**Rationale**: `dot={false}` was a deliberate original choice (undocumented in any prior spec) to
keep dense hourly charts visually calm — this feature explicitly asks to reverse that. A small
fixed radius (`r: 3`) is legible without overwhelming a 24-point-wide chart; using the same
per-line `stroke` Recharts already applies means no additional color-mapping code is needed for
FR-017.

**Alternatives considered**: *A custom dot-rendering function keyed on `isForecast`* — considered
for stronger visual distinction, but not required: since the forecast series is already a
*separate* `<Line>` element (not a per-point flag within one line), its dots are already visually
distinct by virtue of being drawn by a differently-styled `<Line>` — no extra per-point logic
needed.

## §8. Observed high/low temperature note

**Decision**: A small pure function `findObservedExtremes(observations)` (new, colocated with
`chartData.ts`) filters to `!o.isForecast && o.temperature !== null`, and returns
`{ high: { value, timestamp }, low: { value, timestamp } } | null` (null when no observed points
exist, satisfying FR-020's omission case). `ObservationChart.tsx` renders the result as a small
note above/below the temperature chart, using the already-imported `formatValue`/`toLocaleString`
conventions used elsewhere in this file.

**Rationale**: Keeps the high/low computation as a pure, independently-testable function
(matching this repo's established pattern of computation-in-`chartData.ts`/rendering-in-
`ObservationChart.tsx`, unchanged since 005), rather than folding it into the already-large
per-chart JSX blocks. Applies uniformly to whatever window is displayed (FR-018/FR-019's "for
whatever window is currently displayed") since it operates on `series.observations` directly,
before any hourly/daily bucketing — the "observed" filter is meaningful at the raw-observation
level regardless of which chart granularity is currently selected.

**Alternatives considered**: *Compute high/low from the already-bucketed daily/30-day
`DailyAggregate.high`/`low` fields* — rejected for the 24-hour view specifically, since those
fields don't exist at hourly granularity; and even for daily views, bucketed high/low can include
forecast-bucket values (if `isForecast` buckets are present) that FR-020 explicitly excludes —
operating on raw observations sidesteps needing to special-case bucket-level forecast exclusion a
second time.
