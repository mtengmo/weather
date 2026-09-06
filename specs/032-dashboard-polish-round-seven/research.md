# Research: Dashboard Polish, Round Seven

## §1 (US1) — Radar tile source: RainViewer

**Decision**: RainViewer's public API (`https://api.rainviewer.com/public/weather-maps.json`,
confirmed reachable and key-free via a live request during specification) returns a `radar.past`
array of `{ time, path }` frames and a `host`. The latest entry's `path`, combined with the
documented tile template `{host}{path}/256/{z}/{x}/{y}/2/1_1.png` (RainViewer's own published
tile-URL scheme: size 256, color scheme 2, smoothing+snow-coloring on), is used as a Leaflet
`TileLayer` `url`, added to the existing `MapContainer` above the base OpenStreetMap `TileLayer`
with reduced opacity.

**Rationale**: A genuine, globally-covering, animatable-in-the-future radar composite — exactly
what was missing from SMHI's own raw per-station data (ruled out in `031`) and from that
feature's own forecast-circle approximation (what this story replaces, per the explicit "remove
the old maps... replace it" instruction).

**Alternatives considered**:
- Keep and extend the forecast-circle overlay — rejected: directly contradicts the user's own
  explicit feedback that it "doesn't work" as a stand-in for radar.
- Animate through multiple `past` frames — rejected for this round: a single latest-frame static
  layer already satisfies every functional requirement (FR-001/FR-002); animation adds real UI
  complexity (play/pause, frame timer) with no requirement asking for it. Noted as a natural
  future enhancement, not part of this spec.

## §2 (US1) — Fetch timing and failure isolation

**Decision**: Fetch RainViewer's metadata once per `MapView` mount (not re-fetched on pan/zoom),
independent of the existing pins effect — a fetch failure or empty `radar.past` array simply
renders no radar `TileLayer` at all, leaving the base map/pins/`Marker`s completely unaffected
(mirrors `031`'s own independent-effect, degrade-to-absent pattern, itself modeled on
`025-reduce-api-requests`).

**Rationale**: Directly satisfies FR-004 structurally (pins/`MapContainer` render is never gated
on this effect's state), consistent with every other "extra" data source added to this app this
session (UV risk, warnings, the now-removed precipitation circles).

## §3 (US2) — Preferring a place name over a station name

**Decision**: `useGeolocation.ts` currently tries the nearest station's name first, calling
`reverseGeocode` only as a fallback when the station has no usable name. Flip the preference:
fetch both `reverseGeocode(coords)` and `getNearestStations(coords, 1)` (already both called
today, just sequenced differently), and set the display name to the geocoded place name when
available, falling back to the station name, falling back to the existing "Unnamed station"
placeholder — each fetch's own failure handled independently so one doesn't block the other.

**Rationale**: `reverseGeocode` (Nominatim) already returns exactly the kind of name (city/town/
village/etc.) the user wants; the station name becomes what it should always have been — a
fallback for the rare case reverse geocoding fails, not the primary path. The `near ` prefix
`useGeolocation.ts` currently adds when using a geocoded name as a secondary fallback is dropped,
since the geocoded name is now the primary, not a qualifier on an already-shown station name.

## §4 (US3) — "Home" always means the Overview

**Decision**: `App.tsx` has three "Back" buttons (graph, details, map). The graph/details ones
already call `viewOverview()` (always the Overview). The Map's own `closeMap()` instead restores
`previousView` (whatever screen was open before the Map), which can be Details or the graph —
inconsistent with the other two. Rename every button's label to "Home" and change `closeMap` to
call `viewOverview()` too, dropping `previousView` entirely (no other consumer of that state).

**Rationale**: A minimal, surgical fix — matches the spec's own framing ("the same 'Home' control
already gives from every other screen") and removes state (`previousView`) that no longer has a
purpose once every "Home" path converges on the same destination.

## §5 (US4) — Local, per-warning dismissal

**Decision**: A new `useWarningDismissal()` hook, mirroring this app's existing preference-hook
shape (`useThemePreference`, `useUnitPreference`, etc.: read once from `localStorage` on mount,
expose a setter that updates both React state and storage). Persists an array of dismissed
warning `id`s (the same `id` `WeatherWarning` already carries, e.g. `"3122-9873"` — already unique
per warning-area per `028`'s own data model) under a new namespaced key. `App.tsx` filters
`warnings` through the dismissed-id set before passing them to `WarningBanner`; `WarningBanner`
gains a small dismiss control per listed warning, calling the hook's setter.

**Rationale**: `WeatherWarning.id` already uniquely identifies one specific warning occurrence
(not just its type) — dismissing that exact id can never accidentally hide a different, later
warning, satisfying FR-009 for free without inventing any new identity/versioning scheme. Reuses
the exact persistence pattern this app already has five-plus instances of.

## §6 (US5) — Intensity from symbol codes, not a guess

**Decision**: SMHI's own Wsymb2 symbol table (`smhiProvider.ts`'s `SMHI_SYMBOL_CONDITIONS`,
already consumed) already assigns *three* distinct codes per precipitation type — e.g. 8/9/10 =
light/moderate/heavy rain showers, 18/19/20 = light/moderate/heavy rain, 15/16/17 and 25/26/27 =
light/moderate/heavy snow (showers and non-showers respectively) — currently all collapsed into
one flat `"rainy"`/`"snowy"` value. MET Norway's own symbol codes (`metNoProvider.ts`'s
`classifyMetNoSymbol`) are similarly prefixed `light`/`heavy`/unprefixed(moderate) by its own
published naming convention (e.g. `lightrain`, `heavyrain`, `lightsnow`), already substring-
matched for other conditions in the same function.

`WeatherCondition` splits `rainy` → `light-rain` | `heavy-rain`, and `snowy` → `light-snow` |
`heavy-snow`. Both providers' own light/moderate/heavy codes fold into this app's two-tier
model: each source's own "light" code → `light-rain`/`light-snow`; both "moderate" and "heavy"
codes → `heavy-rain`/`heavy-snow` (moderate reads closer to "heavy" than to "light drizzle" in
everyday terms). `deriveWeatherCondition`'s existing threshold branch (used when no symbol code
is available — Open-Meteo, or any point without one) gains a new mm-based split using the same
"fixed constant applied uniformly across every period granularity" pattern this function already
uses for `WINDY_THRESHOLD_MS`/`CLOUDY_THRESHOLD_PERCENT` (research.md precedent, not a new
inconsistency).

**Rationale**: The two higher-quality sources (SMHI, MET Norway) already carry real,
forecaster-assigned intensity — using it is strictly more accurate than inventing an amount
threshold from scratch, and required no new data, just finishing an existing mapping. Sleet's own
symbol codes (12/13/14, 22/23/24) also carry three tiers, but the spec only asks for rain/snow
intensity (FR-011) — sleet stays single-tier, unchanged, avoiding unscoped churn.

**Alternatives considered**:
- A pure mm-threshold classification for every source, ignoring symbol codes entirely — rejected:
  throws away real, already-available forecaster classification for a cruder approximation, for
  no benefit (no less code — the threshold branch is still needed for Open-Meteo regardless).
- Three tiers (light/moderate/heavy) instead of two — rejected: not requested by the spec (US5
  only asks for light vs. heavy), and lucide-react has no natural third icon for "moderate" rain/
  snow distinct from both other tiers (research.md §7).

## §7 (US5) — Icon choices

**Decision**: `lucide-react` (already a dependency) offers `CloudDrizzle`, `CloudRain`,
`CloudSnow`, `Snowflake`, and `CloudHail` (checked against the installed package). Minimal-diff
mapping: `light-rain` → `CloudDrizzle` (a new icon slot); `heavy-rain` → `CloudRain` (today's
existing `rainy` icon, kept as-is so the more commonly-seen "it's raining" case looks unchanged);
`light-snow` → `Snowflake` (new); `heavy-snow` → `CloudSnow` (today's existing `snowy` icon, same
keep-as-is reasoning); `sleet` is reassigned from `CloudDrizzle` (now needed for `light-rain`) to
`CloudHail`, a closer visual match for icy/mixed precipitation anyway.

**Rationale**: Every existing consumer of `WEATHER_ICONS`/`.weather-condition-*` (the timeline's
`ConditionRow`, `WeeklyForecastStrip`, `TodaySummaryCard`) already works generically off whatever
`WeatherCondition` value it receives — no consumer needs its own code change, only the lookup
table gains entries. Two `isSnowy`-style string checks in `timelineData.ts`
(`daysToTimelineData`'s snow-row detection) need updating from `=== "snowy"` to
`=== "light-snow" || === "heavy-snow"`.

## §8 (US6) — Splitting the bar row without duplicating `BarRow`

**Decision**: `BarRow` (shared by the precipitation and snow rows) currently renders one
`.weather-timeline-row` containing a sticky title plus one `PeriodGrid` whose cells stack a bar
and its value text vertically. Split into two sibling `.weather-timeline-row` elements sharing
the same `periods`/column grid: the first renders bars only (no text); the second renders the mm
value + chance-of-rain text only (no bar), each column's text bottom-aligned under its own bar
column above. Both rows share the same sticky-title convention already established.

**Rationale**: `BarRow` is shared between precipitation and snow (`WeatherIconOverview.tsx`'s two
call sites) — splitting the shared component applies the improvement to both consistently, rather
than forking a precipitation-only variant that would visually mismatch the snow row's own layout
directly below/near it.

## §9 (US7) — A real degree scale for the temperature chart

**Decision**: `LineRow`'s `buildSegments` already computes a `min`/`max`/`range` and a `yFor(v)`
mapping (`90 - ((v - min) / range) * 80`) to place the polyline within the SVG's 10-90 vertical
band. Extract that same min/max (rounded outward to the nearest 5, e.g. `Math.floor(min/5)*5` /
`Math.ceil(max/5)*5`) to generate a fixed set of 5°-step tick values, each mapped through the same
`yFor` formula to a Y position — used both for a new sticky-left label column (mirroring the
row-title's own existing `position: sticky` pattern) and for a horizontal `<line>` per tick drawn
into the existing SVG, behind the polyline.

**Rationale**: Reuses the exact vertical-mapping math the chart already computes for its own
data — the gridlines and the polyline are guaranteed to agree, since they share one formula
rather than two independently-computed scales that could drift apart.
