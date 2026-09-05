# Research: Dashboard Polish Round Four

## §1 — Location name missing from the header (US1 / FR-001)

**Decision**: Add the selected location's name as a visible element inside `App.tsx`'s
`.current-conditions` header block (next to/above the temperature reading), always rendered
whenever `selected !== null`, independent of the `LocationPanel` toggle button.

**Rationale**: `LocationPanel`'s toggle button (`src/components/LocationPanel.tsx`) is
hard-coded to the literal text "Change location" and never displays the selected location's
name — that's been true since 013. Before 018, `WeatherIconOverview.tsx` rendered its own
`<h2>{location.displayName} — overview</h2>`, which was visible on-page; 018 turned that heading
visually-hidden (`.visually-hidden`) as part of removing a duplicate-looking title, without
replacing it with anything visible elsewhere. That's the regression: the name has nowhere left
to render. Fixing this in `App.tsx`'s header (rather than restoring the `WeatherIconOverview`
heading) also satisfies FR-001's "every view" requirement — the graph, details, and map views
never rendered that per-view heading in the first place.

**Alternatives considered**: Making `LocationPanel`'s toggle button itself show the location name
instead of "Change location" — rejected because that button's accessible name changing per
selection would break its existing `aria-pressed`/discoverability conventions and several
existing tests assert the literal "Change location" name; a separate, adjacent text element is
lower-risk.

## §2 — Map view has no way back (US2 / FR-002)

**Decision**: Track the view active immediately before switching to `"map"` (a `previousView`
piece of state in `App.tsx`), and render a "Back" button in the header whenever `view === "map"`,
which restores that tracked view (falling back to `"overview"` if none was tracked, e.g. a
stateless deep link).

**Rationale**: `App.tsx`'s "Map" button unconditionally calls `setView("map")` — it never toggles
back, and no other control changes `view` away from `"map"`. The simplest fix matching this
codebase's existing state-management style (no router) is one extra piece of state plus a
conditionally-rendered button, mirroring how `onViewDetails`/`onViewOverview` callbacks already
thread view transitions through `ObservationChart`/`ObservationDetails`.

**Alternatives considered**: Making the always-present "Map" button itself toggle (map ↔
previous view) — rejected because it would silently change the same button's behavior depending
on hidden state, which is what created ambiguity in the first place (016/018 already special-case
which buttons render per `view`); a distinct, clearly-labeled "Back" button is more discoverable.

## §3 — Dropdown legibility in the glass theme (US3 / FR-003)

**Decision**: Add `.display-menu-content` and `.forecast-sources-control ul` to the existing
`[data-theme="glass"] .location-panel-content` CSS rule's selector list (`src/index.css`), so
both new 018 dropdowns get the same opaque/blurred glass-theme treatment `.location-panel-content`
already has.

**Rationale**: In the `glass` theme, `--surface` is `rgba(255, 255, 255, 0.08)` — 8% opaque.
`.location-panel-content` already compensates for this via a dedicated theme override
(`background: var(--surface)` plus `backdrop-filter: blur(...)`, `border-radius`, `padding`)
scoped to `[data-theme="glass"]`. `DisplayMenu`'s and `ForecastSourcesControl`'s panels
(`.display-menu-content`, `.forecast-sources-control ul`, added in 018) use the same bare
`background: var(--surface)` as their base rule but were never added to that glass-theme
override, so in the glass theme they render nearly transparent — exactly the "hard to see
because of the background" report. The `midnight`/`ivory` themes are unaffected (`--surface-alpha`
there is opaque `1`, though that variable itself is currently unused/dead — not needed for this
fix).

**Alternatives considered**: Introducing a shared `--surface-opaque` custom property used by all
three dropdown panels — a cleaner long-term fix, but a larger refactor than this bug warrants;
extending the existing proven selector list is the minimal, consistent fix.

## §4 — Rain bar baseline/scaling for forecast periods (US4 / FR-004)

**Decision (confirmed via live Playwright inspection against real SMHI data)**: The bug is a CSS
percentage-height cascade failure, not a data problem, and affects **every** rain/snow bar (24h,
3-day, and 7-day views alike — the user's report happened to be about forecast periods, but
observed periods are equally affected; jsdom-based unit tests never caught this because jsdom
doesn't compute real CSS percentage-height resolution, only tracks the inline `style` attribute
value as-authored). Root cause: `.weather-timeline-row-bars` sets `align-items: end`, which
overrides CSS Grid's own default `stretch` — so each `.weather-timeline-cell` grid item sizes to
its own content height instead of stretching to the grid's `height: 70px`. Without a definite
height on `.weather-timeline-cell`, `.weather-timeline-bar-cell`'s `height: 100%` can't resolve
against it, which cascades down to `.weather-timeline-bar`'s own percentage height also failing
to resolve — every bar collapses to its `min-height: 2px` floor regardless of amount. Confirmed
via a headless-browser check: before the fix, every bar's *computed* height was `2px` regardless
of its (correctly-varying) inline `style="height: X%"`; after changing `align-items: end` to
`align-items: stretch` (the grid default, made explicit), computed heights scaled proportionally
(e.g. 41px for the tallest bar, 2px for near-zero amounts) and the visual baseline stayed
correctly aligned. `.weather-timeline-bar-cell`'s own `justify-content: flex-end` already
bottom-aligns the bar within its now-full-height cell, so removing the redundant/counterproductive
`align-items: end` has no other visual effect.

**Rationale**: `BarRow`'s height math (`Math.max(2, (point.value / max) * 100)`) was already
correct — confirmed by two separate synthetic jsdom tests during planning that showed the right
percentage in the inline style — which is exactly why the bug was invisible to this repo's
existing test suite despite being present in every prior release since this row's CSS was
authored. Only a real browser (Playwright) surfaces it, since it requires genuine CSS layout
resolution.

## §5 — Wind direction missing on 3-day/7-day views (US5 / FR-005)

**Decision**: Remove the hard-coded `windDirection: null` override in
`src/components/timelineData.ts`'s day/sub-day row-building path (`daysToTimelineData`, ~line 267)
and instead pass through the `DailyAggregate.windDirection` value `aggregateBucket` already
computes (018-dashboard-visual-redesign's `windDirection` field: the bucket's most recent
non-null reading).

**Rationale**: `toDailyAggregates` and `toSubDayBuckets` both call the same `aggregateBucket`
helper (`src/services/dailyAggregation.ts`), which has computed a real `windDirection` value
since 018 (used today only by `TodaySummaryCard`'s compass reading). `daysToTimelineData` — the
shared row-builder behind both the 3-day and the 7-day view — still nulls it out with a comment
("no meaningful 'average direction' at daily/sub-day granularity") that predates that
computation and is simply stale. Wiring it through fixes both the 3-day view (reported) and the
7-day view (same code path, same bug, not explicitly reported but affected identically).

**Alternatives considered**: Computing a circular mean specifically for the timeline's direction
arrow — rejected; "last non-null reading" is this codebase's established, already-implemented
convention for a day-level direction (used by the Today card), and reusing it keeps the two
views consistent with each other.

## §6 — High/low temperature labeling (US6 / FR-006, FR-007)

**Decision**: `TodaySummaryCard.tsx`'s `.today-summary-highlow` gains explicit "High"/"Low" text
labels next to each number. The timeline's high/low parenthetical (`LineRow`'s
`(${high}°/${low}°)` suffix) gains a `title` attribute / adjacent short label clarifying the
convention, consistent with the Today card's wording.

**Rationale**: Directly implements the resolved clarification ("Add High/Low labels").

## §7 — 7-day forecast reach capped at 7 days, with dates (US7 / FR-008, FR-009)

**Decision**: `toDailyAggregates(observations, bucketCount)` does **not** cap its own output at
`bucketCount` — by design (005-add-weather-forecast), it returns `bucketCount` past/observed
buckets *plus* however many additional forward/forecast buckets the data reaches
(`forwardBucketCount`, uncapped), so a location with a week-plus of forecast reach already
produces 12-14 total entries from `toDailyAggregates(observations, 7)`. That's correct and
wanted for its other callers (e.g. graph/details views deliberately show the full forecast
reach), so `toDailyAggregates` itself is unchanged.

The initial implementation added a naive `mostRecent(aggregates, count)` tail-slice
(`aggregates.slice(-count)`) to force a hard "exactly 7 total" cap — this was wrong and caused a
real regression, caught only via live browser testing (not the jsdom-based unit/integration
suite, whose synthetic fixtures happened not to exercise the failure mode): since the array is
oldest → newest, a forecast reaching more than ~6 days out pushes the tail-slice's 7-entry window
entirely past "today," silently dropping every observed day *and* "today" itself from the result.
That broke `WeatherIconOverview`'s `todayIndex` derivation — which locates "today" as the entry
just before the first forecast entry — making the persistent Today card disappear whenever a
location's forecast reached far enough out (a case real SMHI/Open-Meteo data hits routinely).

**Corrected decision**: cap only the *forecast* portion, leaving every observed/historical day
untouched. Since forecast entries are always the array's trailing run (once `bucketEnd` passes
"now", `isForecast` never reverts to false again), the fix is: find the first forecast index, and
slice the array to `firstForecastIndex + maxForecastDays` — keeping all observed entries
(including "today," which sits immediately before that index) and at most `maxForecastDays`
forecast entries after it. Exposed as `capForecastReach(days, maxForecastDays)`, applied in
`buildDailyTimelineData` (the 7-day Overview timeline) and the `weeklyDays` derivation feeding
`TodaySummaryCard`/`WeeklyForecastStrip`. This directly matches the literal user complaint ("the
forecast... just [cap] it [to] 7d") without touching the observed side the Today-card derivation
depends on.

Each column's label switches from a bare weekday (`toLocaleDateString([], {weekday: "short"})`)
to weekday + date (`toLocaleDateString([], {weekday: "short", day: "numeric"})`, e.g. "Fri 5").

**Rationale**: Matches the corrected FR-008/FR-009 (forecast-portion cap, not a total-column cap)
exactly, and fixes an identical, previously-unreported symptom in `WeeklyForecastStrip`
(018-dashboard-visual-redesign): it calls the same `toDailyAggregates(weeklySeries.observations,
7)` and renders every entry returned, so it was already silently showing far more than 7
day-cards under a "7 day forecast" label whenever forecast reach exceeds a week — the same root
cause as the timeline, fixed by the same capping helper for consistency between the two.

**Alternatives considered**: A `count`-wide window anchored on "today" (extend forward first,
backfill from history only if forward reach is short) — closer to a strict "exactly 7 total"
outcome, but changes the observed-history portion's length even when nothing was wrong with it,
which risked further surprising regressions in an already-shipped 018 layout (the dual
Observed/Forecast section design) for no benefit the user actually asked for. Passing a smaller
`bucketCount` to `toDailyAggregates` itself — rejected because `bucketCount` controls how far
*back* it looks for observed data, not the forward reach; reducing it would cut off legitimate
recent-past days rather than excess future ones.

## §8 — Forecast source behavior (US8 / FR-010, FR-011, FR-012)

**Decision (FR-010, Automatic)**: `weatherApi.ts`'s existing `getObservations` fallback
(SMHI primary; Open-Meteo forecast-only fallback used only when SMHI's own forecast came back
entirely empty for a window that expects one) already matches the clarified requirement exactly
— SMHI is preferred, Open-Meteo is a true last-resort. No behavior change needed for "Automatic";
this decision documents/confirms the existing contract as the explicit spec (worth a regression
test, since it wasn't previously asserted as a hard requirement).

**Decision (FR-011, Combined)**: Change `mergeMultiSourceIntoTimelinePoints` (`timelineData.ts`)
from attaching both sources' values side-by-side (`point.sources`, rendered as
"S 8° · O 12°") to instead overwriting `point.value` itself with the mean of the two sources'
per-period averages, and setting a new `point.combined = true` flag so the existing rendering
path can append a short "(avg)" suffix — satisfying "write it out" (make it visibly clear the
number is a blend) without a wall of per-source detail.

**Decision (FR-012, freshness)**: SMHI's point-forecast API response
(`opendata-download-metfcst.smhi.se/.../data.json`) includes top-level `approvedTime` (and
`referenceTime`) fields — an ISO timestamp for when that forecast was generated/approved — which
`SmhiForecastResponse` doesn't currently parse. Add it to that interface and thread it through as
the SMHI forecast's freshness time. Open-Meteo's public API doesn't expose an equivalent
"forecast issued" timestamp (only a `generationtime_ms` query-processing duration, not a model-run
time) — for Open-Meteo, fall back to the app's own last-fetch time (`useObservationData`'s
existing `lastUpdated`), per the spec's own documented Assumption. Surface both in the footer's
existing data-source disclosure line (`dataSourceDisclosure`/`Footer.tsx`), extended to include
each shown source's freshness rather than only the app's own fetch time.

**Rationale**: Keeps the "Combined" UI simple (spec's explicit ask: "no need to have all details
on the page," now formalized as "avg the results") while still surfacing provenance/freshness —
just in the footer rather than inline per-cell, avoiding re-cluttering the timeline the "write it
out" request is reacting against.

**Alternatives considered**: Showing each source's freshness inline per forecast cell — rejected
as exactly the clutter the spec's Combined-mode change is trying to remove; the footer's existing
single-line disclosure is the natural, already-established place for source/freshness text
(018's `dataSourceDisclosure`).
