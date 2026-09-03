# Research: Dashboard Usability Fixes

## §1. Viewing a search result without favoriting (User Story 1)

**Decision**: `PlaceSearch.tsx` gains a second prop, `onView: (place: PlaceCandidate) => void`,
rendered as a second button ("View") alongside the existing "Add to favorites" button on each
result row. The existing prop (currently misleadingly named `onSelect` even though it only ever
adds a favorite) is renamed to `onAddFavorite` for clarity, matching what `LocationPanel` already
calls it at its own call site. `LocationPanel` wires `onView` to the same `selectAndClose` helper
already used by `LocationSwitcher`/`FavoritesList`, converting the clicked `PlaceCandidate` into a
`Location` with `source: "favorite"` — reusing the exact conversion `FavoritesList`'s `onSelect`
handler in `LocationPanel` already performs today, extracted into a small shared helper.

**Rationale**: `PlaceSearch` is already a simple, prop-driven, presentation-only component (no
internal favorites logic) — adding a second callback prop is the smallest change that satisfies
FR-001-FR-003 without altering how favoriting itself works. Renaming the confusingly-named
existing prop while touching this file anyway avoids leaving a second onView-shaped prop next to
one still called onSelect, which would read as "select for what?" to a future reader.

**Alternatives considered**: *Make search results directly select-on-click (remove the button)* —
rejected: would remove the ability to add a place to favorites without also viewing it, a
capability the spec doesn't ask to remove (Assumptions: "both actions coexist").

## §2. Retrying "current location" after a permission decline (User Story 2)

**Decision**: `LocationSwitcher` gains two new props: `geoStatus: GeolocationStatus` and
`onRequestCurrentLocation: () => void`. When `currentLocation` is `null` and `geoStatus` is
`"denied"` or `"unavailable"`, it renders a `"Use current location"` button in the same position
the `"Current Location"` button would otherwise occupy, calling `onRequestCurrentLocation` (which
`App.tsx` wires directly to `useGeolocation`'s existing `request` function — the same one already
called once on mount). `LocationPanel` forwards both new props through unchanged.

**Rationale**: `useGeolocation`'s `request` callback (`src/hooks/useGeolocation.ts`) is already
fully idempotent and safe to call again — it doesn't check `status` before running, and browsers
natively re-surface their own permission UI (or silently reuse a previously-granted/denied
decision) when `getCurrentPosition` is called again, so no new hook logic is needed, only a UI
affordance to trigger a call that already exists. Gating the retry button on `geoStatus` (rather
than always showing both "Current Location" and "Use current location") keeps the control singular
and avoids a confusing "why are there two current-location buttons" state once a location is
actually resolved.

**Alternatives considered**: *Auto-retry on a timer* — rejected: browsers intentionally don't want
silent repeated permission prompts, and the spec asks for a user-initiated retry (Acceptance
Scenario 1: "an option... is still available"), not automatic re-prompting.

## §3. The 7-day Overview filling available width (User Story 3)

**Decision**: `WeatherIconOverview.tsx` conditionally adds a `weather-timeline-fill` class to the
existing `.weather-timeline` div only when `window === "last-7-days"`. In `index.css`, that class
overrides the existing `width: max-content` (added in 013 to fix the "now" line's mispositioning
bug) with `width: 100%`, while keeping `min-width: 900px` unchanged. A block element's
`width: 100%` resolves against its containing block's (the scrollable wrap's) available width — on
a wide screen that's more than 900px, so the grid's `1fr`-based columns (already `repeat(N, 1fr)`
per `PeriodGrid`) stretch to fill it; on a narrow screen where the wrap's available width is less
than 900px, `min-width: 900px` still wins (CSS `min-width` always overrides a conflicting `width`),
preserving today's scroll behavior unchanged.

**Rationale**: This is a pure two-line CSS change, made possible by 013's own `width: max-content`
fix (research.md from that feature) already making `.weather-timeline`'s box match its true content
width — without that fix, `width: 100%` here would have had no visible effect, since the box
would already have been silently capped at `min-width`'s floor regardless. The 24-hour view's own
48-column-wide content already exceeds any wide screen's available width, so leaving its behavior
as `max-content` (no fill class applied) is correct — FR-008 is satisfied by simply not applying
this class outside the 7-day window.

**Alternatives considered**: *A visible border/"frame" around the 7-day timeline, without changing
its width* — considered (the user's own "frame?" phrasing) but not chosen as the primary fix per
the spec's own Assumptions: filling the available width is the more direct fix for "a lot of empty
space," and a static frame would leave that same empty space, just visually boxed.

## §4. Overview's High/Low toggle (User Story 4)

**Decision**: `TimelineRowPoint` gains two new optional fields, `high?: number | null` and
`low?: number | null`, populated only by `buildDailyTimelineData`'s temperature row (never by the
hourly builder, which has no daily high/low concept) from `DailyAggregate.high`/`.low` — fields
that already exist, computed by `dailyAggregation.ts` for the classic graph's own High/Low lines
(003-extended-history-metrics) and already unit-converted the same way `average` already is.
`WeatherIconOverview.tsx` receives a new `highLowVisible: boolean` prop (passed from `App.tsx`,
the same state `HighLowToggle` already controls); when true and rendering the temperature row's
value label, if a point's `high`/`low` are both present, the label switches from the current plain
average (e.g. `"17 °C"`) to include both (e.g. `"17 °C (20°/14°)"`), reusing the exact
`"<value> (<secondary>)"` parenthetical convention the wind row already established for gusts
(009-timeline-polish-and-header).

**Rationale**: `DailyAggregate.high`/`.low` are already computed once per bucket regardless of
whether anything displays them — reading them into the timeline's existing row-point shape is a
pure plumbing change, no new computation. Reusing the wind row's established parenthetical-value
convention (rather than inventing a new visual treatment, or adding separate SVG high/low lines to
the timeline's line-chart rendering) keeps this feature's footprint small and consistent with how
this app already handles "a primary value plus a related secondary value" elsewhere in the exact
same component.

**Alternatives considered**: *Draw separate high/low SVG lines on the temperature row, mirroring
the classic graph's dashed HIGH_COLOR/LOW_COLOR lines* — considered, more visually rich, but
rejected as disproportionate effort for this feature relative to the spec's actual bar
("both visible," Acceptance Scenario 1) — the parenthetical text approach already satisfies that
bar exactly the way the existing gust convention does for wind.

## §5. Hiding "Nearby stations" on the Overview (User Story 5)

**Decision**: `App.tsx` wraps the existing `<NearbyStationCountControl .../>` in
`{view !== "overview" && (...)}`.

**Rationale**: `view` is already the single source of truth for which main content area is
showing; no new state or prop threading needed. `NearbyStationCountControl`/its underlying
preference hook are otherwise completely unchanged — the preference itself still persists across
view switches (so a user's chosen count is remembered when they return to the graph), only the
control's visibility changes.

**Alternatives considered**: *Disable the control instead of hiding it* — rejected: the spec
explicitly asks to hide it ("hide that option"), and a disabled-but-visible control would still
occupy header space, the exact clutter being removed.

## §6. Nordic-first search ranking (User Story 6)

**Decision**: `geocodingApi.ts`'s request adds `&language=en` (unchanged) but the parsed response
now also reads each result's `country_code` field (Open-Meteo's geocoding API already returns this
alongside `name`/`admin1`/`country` — confirmed in the existing response shape, just not
previously read). `searchPlaces` sorts the mapped candidates with a stable sort: any result whose
`country_code` is one of `SE`, `NO`, `DK`, `FI`, `IS` sorts before every other result, preserving
the API's own relative ordering within each group (Nordic-first, then everything else in its
original order).

**Rationale**: The ranking only needs to reorder the (at most 5, per the existing `count: "5"`
request parameter) results already being fetched — no new API call, no change to which places are
findable, satisfying the clarification's "soft preference" answer and FR-012's "without excluding
or hiding non-Nordic results" directly. `PlaceCandidate`'s public shape (`latitude`/`longitude`/
`displayName`) is unchanged — the country code is consumed internally by the sort and discarded,
since nothing downstream needs to keep it.

**Alternatives considered**: *Issue two separate requests (one scoped to Nordic countries via the
geocoding API's own country filter, one unscoped) and merge* — rejected: doubles the network calls
for every keystroke-triggered search for no benefit, since a single request's results can already
be sorted client-side once country codes are available.

## §7. Combining multiple forecast sources (User Story 7)

**Decision**: New `weatherApi.ts` export, `getMultiSourceForecast(location, window):
Promise<{ source: "smhi" | "open-meteo"; observations: WeatherObservation[] }[]>`, called only
when the new `combineForecastSources` preference is on. It always attempts both
`smhiProvider`'s forecast path (reusing the same coverage check `getObservations` already
performs) and `openMeteoProvider.getForecastOnly` in parallel via `Promise.allSettled`, returning
one entry per source that actually produced forecast points (a source with none — e.g. SMHI
outside its coverage area — is simply absent from the result, satisfying FR-017's "no misleading
single-source average" via `chartData.ts`'s averaging step: averaging a one-element array is just
that element, which is FR-017's specified no-op, not a special case). A new `chartData.ts`
function, `buildMultiSourceForecastRows`, takes this array and produces one `ChartRow` key per
source (`sourceKey(0)`, `sourceKey(1)`, ...) plus an `average` key computed per-timestamp across
whichever sources have a non-null value at that point. `ObservationChart.tsx`'s temperature chart
renders one additional `<Line>` per returned source plus one for the average, all only when
`combineForecastSources` is on and the multi-source fetch actually returned more than one source
(FR-017) — otherwise the chart is completely unaffected, still rendering exactly as it does today.

**Rationale**: `smhiProvider`/`openMeteoProvider` already expose independent forecast-capable
functions (`getForecastOnly` on the Open-Meteo side already exists for 006's fallback path; SMHI's
own forecast fetch is already a separate internal step inside `smhiProvider.getObservations`) —
fetching both in parallel, gated behind the new preference, avoids restructuring either provider's
existing single-source logic. Scoping this to the classic graph's temperature chart only (not the
Overview) is a deliberate research-stage narrowing: the Overview's timeline has no existing
multi-series rendering path (unlike `ObservationChart.tsx`, which already renders multiple
`<Line>`s for nearby-station comparisons), so extending the graph — which already has the exact
multi-series precedent this feature needs — is far less invasive than teaching the Overview's
single-line-per-row model to render several lines in the same row for the first time.

**Alternatives considered**: *Average at the provider layer, storing only the merged value* —
rejected: FR-015 explicitly requires each individual source's own line to remain visible, so the
per-source data must survive into the rendering layer, not be collapsed away during fetching.
*Always fetch both sources regardless of the toggle* — rejected: violates the plan's own
constraint (no wasted API calls when the feature is off) and this repo's established pattern of
never fetching data a feature doesn't need yet.

## §8. Sub-day periods for the 7-day view's first two days (User Story 8)

**Decision**: New `dailyAggregation.ts` export, `toSubDayAndDailyBuckets(observations,
dailyBucketCount)`, which: (a) computes the same 24-hour rolling buckets `toDailyAggregates`
already does for buckets 2 through `dailyBucketCount - 1` (days 3 onward, unchanged), and (b)
replaces just the two most-recent buckets (today's rolling 24h and the next day's) with five
fixed local-time sub-day buckets each (morning 06:00-11:00, lunch 11:00-13:00, afternoon
13:00-17:00, evening 17:00-21:00, night 21:00-06:00 — spec Assumptions), by re-bucketing the same
underlying hourly observations that would have fallen into those two 24-hour windows into whichever
of the five sub-day windows their timestamp's local hour falls into. Each sub-day bucket reuses the
exact same aggregation math (`mean`/`Math.max`/`Math.min`/etc.) `toDailyAggregates` already applies
per-bucket, just over a narrower time window and with an `isForecast` flag set per-bucket based on
whether that sub-day window's end time is in the future — identical in spirit to the existing daily
`isForecast` computation, just at finer granularity. `timelineData.ts`'s `buildDailyTimelineData`
switches to this function; its output period count is no longer fixed at 7 (it becomes
`5 + 5 + (dailyBucketCount - 2)` when both of the first two buckets have any data to report, fewer
when the series doesn't reach that far — the periods array simply reflects whatever sub-day/daily
buckets exist).

**Rationale**: Reuses `toDailyAggregates`'s exact aggregation logic instead of duplicating it —
the sub-day buckets are "the same kind of bucket, just narrower," so the cleanest implementation
factors the per-bucket math into a small shared helper both the existing daily loop and the new
sub-day loop call, rather than forking the whole function. Keeping days 3-7 on the unchanged
existing path (FR-019) means this feature can't regress the already-shipped, already-tested
7-day behavior for the bulk of the view.

**Alternatives considered**: *Always show 5 sub-day periods for day 1 and day 2 regardless of
whether there's genuinely hourly data reaching that far* — rejected: would violate this app's
"never fabricate data beyond what's provided" convention (established repeatedly since 005) if a
short-forecast location doesn't actually have hourly data for the full two days; the function
naturally produces fewer non-empty sub-day buckets in that case rather than inventing placeholders,
consistent with `toDailyAggregates`'s own existing "extend forward only as far as forecast data
actually reaches" rule.
