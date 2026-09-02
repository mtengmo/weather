# Research: Timeline Polish and Header Consolidation

## §1. Root cause of the mobile hour-label mismatch (FR-010)

**Decision**: Force a fixed, locale-independent 24-hour format for the timeline's hour labels —
pass an explicit `hourCycle: "h23"` (with a fixed locale such as `"en-GB"` or `"sv-SE"`, both of
which default to 24-hour anyway, used purely as a stable locale argument) to `toLocaleTimeString`
in `timelineData.ts`'s `buildHourlyTimelineData`, replacing the current
`new Date(obs.timestamp).toLocaleTimeString([], { hour: "2-digit" })`.

**Rationale**: `Date.toLocaleTimeString` always renders in the *runtime's actual local timezone*
(JS `Date` objects are timezone-aware UTC instants internally) — so the underlying hour value is
correct on both devices. What differs is the **format**: the empty-array `[]` locale argument
means "use the runtime's default locale," which varies by device/OS/browser configuration (e.g. a
phone set to `en-US` renders 12-hour `"3 PM"`, a laptop set to `sv-SE` renders 24-hour `"15"`) —
this exact class of bug was already hit and fixed once in this repo (007's CI locale-dependent
test failure, `container.querySelector("svg.lucide-moon")` fix) for a different symptom of the
same root cause: never trust the runtime's default locale for a value users compare across
devices. Forcing a fixed `hourCycle` makes the label format deterministic everywhere, matching
Sweden's own everyday 24-hour convention, and eliminates the device-to-device inconsistency
entirely without touching how the timestamp itself is fetched/stored (Assumptions: "display-
formatting issue, not... fetched for the wrong timezone").

**Alternatives considered**:
- *Detect the user's locale and adapt* — rejected: the whole point of FR-010 is consistency
  between the user's own two devices; detecting-and-adapting is what's already happening today and
  is exactly what produces the mismatch.
- *Leave locale-driven but document it* — rejected: doesn't satisfy FR-010's testable requirement.

## §2. Root cause of "can't scroll left/right on laptop" (FR-011)

**Decision**: Add a `wheel` event handler on `.weather-timeline-wrap` that translates vertical
wheel delta (`deltaY`) into horizontal scroll (`scrollLeft += deltaY`) whenever the container
actually overflows horizontally, in addition to the existing native `overflow-x: auto` (which
already supports trackpad two-finger swipes and manual scrollbar dragging).

**Rationale**: The 008-introduced `.weather-timeline-wrap { overflow-x: auto }` +
`.weather-timeline { min-width: 900px }` already supports horizontal scrolling via touch/trackpad
and a dragged scrollbar — those paths were verified working in 008's own Playwright polish pass.
What's missing is **plain vertical-wheel-only input** (a conventional mouse, common on laptops
docked to an external mouse, or a laptop trackpad configured for vertical-only scroll): a
horizontally-scrolling container with no vertical overflow does not consume vertical wheel events
by default, so the browser just scrolls the outer page instead of panning the timeline — the user
correctly perceives this as "I can't scroll it." This is the same interaction-completeness gap
FR-011 names explicitly ("not just via a visible scrollbar being dragged").

**Alternatives considered**:
- *Increase container height so it has its own vertical scrollbar to "absorb" wheel input* —
  rejected: would clip timeline rows or force an inner vertical scrollbar nobody asked for, a
  worse UX than the wheel-redirect approach.
- *Do nothing, rely on trackpad only* — rejected: doesn't satisfy FR-011's "or mouse-wheel input"
  wording, and the user's own report was from a laptop (where a plain external mouse is common).

## §3. "Now" column interpolation scope and algorithm (FR-012/FR-013)

**Decision**: After building each core row's points (`buildHourlyTimelineData` only — see Edge
Cases, this does not apply to `buildDailyTimelineData`), if the point at
`nowBoundaryIndex + 1` (the "now" column, same index already used for `nowLeftPercent` in
`WeatherIconOverview.tsx`, and reused from 010 research.md §2 for the "now column" concept) has
`value === null`, and the immediately preceding point (`nowBoundaryIndex`) and immediately
following point (`nowBoundaryIndex + 2`) both have non-null values, set the "now" column's value to
the simple midpoint average of those two neighbors and mark the point with a new
`interpolated: true` flag. If either neighbor is null/absent (including when `nowBoundaryIndex + 2`
doesn't exist because the series has only one forecast point), leave the "now" column as a gap —
exactly FR-013's "MUST NOT be produced" condition.

**Rationale**: FR-012 asks for a value "interpolated from that row's nearest observed and forecast
neighbors" for the single boundary column specifically — not a general multi-gap interpolation
engine. A two-point midpoint average is the simplest interpolation that satisfies "derived from its
neighbors" without introducing curve-fitting complexity this app has never used elsewhere. Scoping
it strictly to the one boundary index (rather than any gap anywhere) keeps the change small, keeps
the "never fabricate data" convention intact everywhere else in the timeline, and matches the
user's own framing ("the middle hour" — singular).

**Alternatives considered**:
- *Linear interpolation weighted by actual elapsed time to the two neighbors* — rejected as
  unnecessary precision: neighbors are always exactly one hour apart in the hourly view (fixed
  bucket size), so a plain midpoint average is mathematically identical to a time-weighted
  interpolation here; the extra complexity buys nothing.
- *Apply the same interpolation to the 7-day view's daily boundary column* — rejected per spec's
  own Edge Cases: "now" isn't a single well-defined column boundary in the same sense at daily
  granularity (a whole day already straddles both observed and forecast hours via
  `toDailyAggregates`'s own bridging), so there is no equivalent single point to interpolate.
- *Apply to every row, not just core rows* — the wind row's speed value is interpolated the same
  way; interpolating `direction`/`gust` too would need per-field neighbor lookups. Scoped to
  interpolating each row's numeric `value` independently (temperature, wind speed, precipitation,
  cloud, and whichever other rows remain after this feature's own US2 row removal) — `direction`
  is left as whatever the (possibly null) source point already had, since FR-012 only asks for
  "a value," not a full synthetic reading.

## §4. Location caching mechanism (FR-014/FR-015/FR-016)

**Decision**: New `src/services/locationCache.ts`, mirroring `units.ts`'s existing
`getUnitPreference`/`setUnitPreference` pattern exactly: `getCachedLocation(): Location | null` and
`setCachedLocation(location: Location): void`, both wrapped in `try/catch` around `localStorage`
access (Edge Cases: graceful degradation when unavailable). `App.tsx`'s `selectLocation` function
(the single choke point already used for every explicit location change — favorite click, search
result, "Current Location" button) calls `setCachedLocation` after `setSelected`. On mount, before
the existing `currentLocation`-sync effect can run, read the cache once: if present, call
`setSelected(cached)` immediately (research.md §5 covers the favorite-still-exists check).

**Rationale**: `selectLocation` is already the single function every user-driven location change
funnels through (`LocationSwitcher`, `FavoritesList.onSelect`, and the header's relocated
`PlaceSearch`-via-favorites flow all call it) — hooking the cache write there, rather than in each
individual component, guarantees FR-014's "favorite, search result, or current-position result"
coverage with one line, and guarantees the *passive* `currentLocation`-name-sync effect (which
merely refines a display name, not a user action) never overwrites the cache, which is exactly the
distinction FR-014 draws between an explicit "viewed" location and background enrichment.

**Alternatives considered**:
- *Cache inside `useGeolocation`* — rejected: that hook only ever produces current-position
  results; it can't see favorite/search selections, so the cache would miss most of FR-014's scope.
- *Cache every render of `selected`* — rejected: would also capture the passive display-name-sync
  effect's writes, which is harmless data-wise but pointless churn; gating on the explicit
  `selectLocation` call site is simpler and exactly matches user intent.

## §5. Handling a cached favorite that no longer exists (FR-016)

**Decision**: On mount, only trust a cached location with `source: "favorite"` once the favorites
list itself has loaded (it's already synchronous/local via `useFavorites`, backed by
`favoritesStorage.ts`) — check whether a favorite with matching `latitude`/`longitude` still exists
in the loaded list. If not, discard the cached value for this session (do not call `setSelected`
from it) and let the existing default flow (`currentLocation`-sync effect) take over unchanged. A
cached `source: "current-position"` location needs no such check — it's just a coordinates+name
pair with no external existence to validate, always safe to show immediately.

**Rationale**: This is the same lat/long-comparison approach `App.tsx` already uses to compute
`FavoritesList`'s `selectedId` prop — no new comparison logic needed, just applied one render
earlier (at mount-time validation instead of highlight-time comparison).

**Alternatives considered**: *Store the favorite's own `id`, not just coordinates, and look it up
by id* — considered but not chosen: `FavoritePlace.id` is a generated UUID (per
`favoritesStorage.ts`) with no guarantee of stability if a user removes and re-adds the "same"
place; coordinate-matching is what the rest of the app already relies on for this exact kind of
"is this location still a favorite" check, so reusing it keeps one canonical comparison rule
instead of two.

## §6. Header consolidation approach

**Decision**: Move the existing `<PlaceSearch>` and `<FavoritesList>` JSX (currently rendered
below the graph/timeline views, `App.tsx` lines ~146-170) up into `<header className="app-header">`,
alongside the existing `<div className="header-controls">` block. Replace the standalone `<h1>Weather
History</h1>` with either nothing or a much smaller/inline label (per spec Assumptions — no
replacement title is required). No new components are created; `PlaceSearch`/`FavoritesList`
themselves are unchanged, only their mount location and the header's CSS layout change.

**Rationale**: Both components are already self-contained, prop-driven, and rendered
unconditionally today (not gated by `view` state) — relocating their JSX inside `<header>` is a
pure layout change with zero behavioral risk, consistent with FR-002/FR-003's "part of the header's
control area" wording and Assumptions' explicit note that this doesn't add new components.

**Alternatives considered**: *Build a new collapsible/dropdown header widget* — rejected: adds UI
complexity and a new interaction pattern the spec never asked for; FR-004 only requires controls
"visible/reachable... wrap or stack" at narrow widths, which the existing `flex-wrap` header layout
(`.app-header { flex-wrap: wrap }`, already in `src/index.css`) already provides for the controls
currently there — extending the same wrapping behavior to the relocated search/favorites keeps the
existing, already-tested responsive pattern.
