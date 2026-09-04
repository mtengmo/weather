# Research: Dashboard Polish Round Two

## §1 — "3-day view only shows one day" investigation (User Story 1)

**Decision**: No code fix — treat as a regression-guard through additional test coverage, not a
root-cause change to `toSubDayBuckets`/`build3DayTimelineData`.

**Rationale**: Live testing during planning (dev server + Playwright) exercised every path a user
would realistically take:
- Direct 24h → 3-day click (skipping 7-day) for both an SMHI location (Stockholm) and an
  Open-Meteo-only location (Paris) — both correctly showed 15 columns (3 full days).
- Repeated toggling — 3-day → 7-day → 3-day → 24h → 3-day, five switches in a row — consistently
  returned 15 (3-day) / 14 (7-day, 7 observed + 7 forecast) / 48 (24h) periods, matching expected
  counts every time.

No path produced "only one day." The most plausible explanation, consistent with 015's own High/Low
false alarm, is that the report predates the 015 deploy (`83d5023`) fully propagating, or was
observed for a specific location whose forecast genuinely doesn't reach beyond "today" at that
moment (correct behavior per FR-001's own "never fewer days than the forecast supports" wording —
not a defect, just a location with limited forecast horizon).

**Alternatives considered**: Rewriting `toSubDayBuckets`'s `forwardBucketCount`/`availableDayCount`
math defensively "just in case" — rejected; changing already-verified-correct logic without a
reproducible failure risks introducing a new defect for no benefit. The action taken instead is
locking in the current (correct) behavior with more integration test coverage (multiple locations,
multiple switch sequences) so any future regression is caught immediately.

## §2 — Multi-source forecast lines on the Overview (User Story 2)

**Decision**: Reuse the exact same `multiSourceForecast: MultiSourceForecastEntry[]` data
`App.tsx` already computes (via `useObservationData`'s `combineForecastSources` flag, from 014) —
no new fetch, no new service function. `WeatherIconOverview` gains `combineForecastSources` and
`multiSourceForecast` props, passed straight through from `App.tsx` exactly like `highLowVisible`
already is.

Rendering approach: `TimelineRowPoint` gains an optional `sources?: { label: string; value: number
| null }[]` field, populated only for forecast periods when the toggle is on and 2+ sources have
data for that period's time range. `LineRow`'s temperature row gains one additional faint SVG
polyline per source (reusing the same `seriesColor` palette `ObservationChart.tsx` already uses,
offset past index 0 so it never collides with the primary line's own color), and the text label for
an affected period switches from the plain value to a compact per-source breakdown, e.g.
`18°C (S 17° · O 19°)`, using each source's own short label.

**Rationale**: Mirrors 014's own established pattern (merge onto existing rows/points by matching
key, don't hand the renderer a second dataset) — the same lesson learned the hard way when
`ObservationChart.tsx`'s Recharts axis broke from a mismatched second `data` array (014,
`chartData.ts`'s `mergeMultiSourceForecastIntoRows`). The Overview's SVG-polyline rendering has no
such shared-axis pitfall (each `LineRow` already draws its own hand-rolled `<svg>`), so no
equivalent bug class applies here.

**Alternatives considered**: A completely separate multi-source row underneath the main temperature
row — rejected as visually heavier than necessary; overlaying faint lines on the same row keeps the
comparison compact and consistent with how the classic graph already does it.

## §3 — Day-boundary marker (User Story 3)

**Decision**: A new absolutely-positioned vertical marker element, styled distinctly from the
existing `.weather-timeline-now` line (different color/opacity, no "Now" label), rendered only on
the 3-day view at each point where consecutive periods' underlying calendar day changes (i.e.,
before each "Morning" period except the very first). Not rendered on the 7-day view, per the spec's
own allowance ("or is reasonably omitted there, since every column is already its own day") — every
7-day column is already unambiguously one full day via its weekday label, so a marker there would
be visual noise without adding information.

**Rationale**: The 3-day view's whole raison d'être (015) is finer-grained sub-day columns, which is
exactly the situation where "which day am I looking at" stops being obvious from the column count
alone — the marker earns its keep precisely where the resolution split makes it necessary.

**Alternatives considered**: A marker on every column boundary regardless of day — rejected,
defeats the purpose of a *day* boundary marker by not being visually distinct from ordinary column
dividers.

## §4 — Window button labels and the "Details" button (User Stories 4 & 5)

**Decision**: Rename `OVERVIEW_WINDOWS` labels from "Last 24 hours" / "Last 3 days" / "Last 7 days"
to "24 Hours" / "3 Days" / "7 Days" — shorter, and each directly names its own time span without
the "Last" prefix implying a fixed historical look-back (misleading now that these windows also
extend into forecast territory). Rename the Overview's "Back to graph" button to "Details," and move
it out of `WeatherIconOverview`'s own local header row into `App.tsx`'s persistent top header,
shown only while `view === "overview"` (mirroring the existing conditional pattern already used for
`NearbyStationCountControl`), positioned at the header's right edge.

**Rationale**: Directly matches the user's own suggested wording. Moving "Details" into the
persistent header consolidates every navigation/view-switching control into one place, which also
directly serves User Story 6 (Change location reachable everywhere) — both stories point at the
same underlying change: centralize header controls rather than splitting them between the global
header and each view's own local header row.

**Alternatives considered**: Keeping "Details" in the Overview's own header but just relabeling it —
rejected; doesn't address "moved up to the right," which explicitly asks for repositioning, not just
renaming.

## §5 — Header consistency (User Story 6)

**Decision**: No structural change beyond what User Story 5 already does. `App.tsx`'s top
`<header className="app-header">` (containing `ThemePicker`, `UnitToggle`, toggles, and
`LocationPanel`) is already rendered unconditionally, above every view's own content — confirmed by
reading `App.tsx`'s JSX structure, where the header sits outside every `{selected && view === ...}`
conditional block. Once the new `MapView` (User Story 10) is added as one more `view` state value
rendered the same way the existing views are, "Change location" is automatically present there too,
with no additional code needed.

**Rationale**: The requirement is already met by the app's existing layout convention; the only
reason it might not have felt that way is the Overview's own separate local header row (with its own
"Back to graph" button) visually competing for the same "header" mental model — which User Story 5
resolves directly.

**Alternatives considered**: Duplicating a location-switch control into each view's own local
header — rejected as redundant and a source of drift (two places that could show a different
selected location if one were ever missed in an update).

## §6 — 3-day/7-day fetch reuse recap

No new research needed — 015 already established that "3 days" and "7 days" both fetch via the
shared `last-7-days` `ObservationWindow`, with the Overview's own local `displayMode` state deciding
which builder runs. This feature's changes (day markers, multi-source lines, button labels) all sit
on top of that existing mechanism unchanged.

## §7 — PWA installability (User Story 7)

**Decision**: Use `vite-plugin-pwa` (the standard Vite-ecosystem PWA plugin) to generate a web app
manifest and a `sw.js` service worker at build time. The service worker caches only the built app
shell (HTML/CSS/JS/icons) via a precache strategy — explicitly excludes `smhi.se` and
`open-meteo.com` API responses from any caching strategy, so a reopened offline app always shows its
shell (installable, launches standalone) but never stale forecast data passed off as current.

**Rationale**: `vite-plugin-pwa` is purpose-built for exactly this Vite+GitHub-Pages-static-site
setup, requires no backend, and is the de facto standard choice (widely used, actively maintained).
"PWA" (Progressive Web App) is confirmed as the correct, standard term for "an installable web app"
per the user's own question.

**Alternatives considered**: Hand-writing a manifest.json + service worker from scratch — rejected;
`vite-plugin-pwa` already handles the cache-busting/precache-manifest generation correctly for a
Vite build, which is easy to get subtly wrong by hand (stale caches after a deploy being the classic
failure mode). Caching API responses for offline weather viewing — rejected per the Constraints
section: showing hours- or days-old forecast data as if current would be actively misleading for a
weather app specifically.

## §8 — Version footer and privacy notice (User Story 8)

**Decision**: Inject a version string at build time via Vite's `define` — `package.json`'s own
`version` field plus a short git commit hash (`git rev-parse --short HEAD`, computed once in
`vite.config.ts` at build start), e.g. `0.1.0 (a41fea7)`. A tiny new `src/services/appVersion.ts`
exposes this as a typed constant. `Footer.tsx` renders it in small text alongside a "Privacy" link
that opens `PrivacyNotice.tsx` (a simple panel, styled like `LocationPanel`'s own dropdown — no new
routing needed). Privacy notice content is a short, plain-language paragraph covering: no backend,
what's stored in the browser (favorites, cached location, theme/unit/preference toggles — all
`localStorage`, never sent anywhere), and that anonymous Google Analytics usage tracking is active
(User Story 9).

**Rationale**: The git-hash approach satisfies "bump version with every build" automatically — no
manual version-editing step to forget, and every build (even between formal `package.json` version
bumps) gets a distinct, verifiable identifier. Reusing the dropdown-panel pattern from
`LocationPanel` avoids introducing a new UI paradigm for a single, rarely-opened piece of content.

**Alternatives considered**: A separate `/privacy` route — rejected; this is a single-page app with
no router today, and one more piece of always-static content doesn't justify introducing one.
Auto-incrementing a build counter — rejected in favor of the git hash, which is already unique,
already available in CI, and traceable directly back to the exact commit deployed (useful for
support/debugging, the stated motivation in the spec).

## §9 — Google Analytics (User Story 9)

**Decision**: Add the exact `gtag.js` snippet the user provided (measurement ID `G-GPT0MTFG6S`)
directly into `index.html`'s `<head>`, unmodified — no wrapper library, no consent-gating logic
beyond what's already implied by "anonymous usage analytics," since no personal data collection
beyond standard Google Analytics page-view/interaction tracking is in scope.

**Rationale**: The user supplied the exact snippet already — this is a direct implementation
instruction, not something requiring design. Placing it in `index.html` (rather than injecting via
JS at runtime) ensures it loads on every page view, consistent with how gtag.js is meant to be used.

**Alternatives considered**: A React-side analytics wrapper/hook — rejected as unnecessary
complexity for a single static tag with no per-route tracking needs (this is a single-page app with
no router, so there's no "route change" event to wire up beyond the one initial page load).

## §10 — Map screen (User Story 10)

**Decision**: `react-leaflet` (React bindings for Leaflet) with OpenStreetMap raster tiles. New
`MapView.tsx` reads the existing `favorites` (from `useFavorites`) and the existing cached-location
mechanism (`locationCache.ts`) to plot one pin per favorite plus, if present, the most recently
viewed non-favorite location. Selecting a pin calls the same `selectLocation` function `App.tsx`
already uses for every other location-selection path (search, favorites list, current location) —
no new selection logic. No weather data is fetched for the map screen itself; a pin's popup shows
only the location's name (from data already in hand), not any weather value, consistent with the
spec's explicit FR-016 deferral.

**Rationale**: Leaflet + OpenStreetMap is the standard no-API-key, no-billing, client-only mapping
stack — directly answers the user's own "is that possible without backend?" question (yes, tile
requests go straight from the browser to OpenStreetMap's public tile servers, no app backend
involved at all). Reusing `selectLocation` and the existing favorites/cache data means the map adds
a new *view* of data the app already has, not a new data model.

**Alternatives considered**: Google Maps — rejected, requires an API key and (at scale) billing,
which conflicts with this app's zero-backend, zero-cost-to-operate posture. Mapbox — same concern
(API key required). A "nearby" discovery experience using a places/geocoding API to find locations
near the user's current position — explicitly deferred per the Clarifications section; would need
either a paid places API or building out reverse-geocoding-adjacent search UX broader than this
iteration's scope. Rendering live weather glyphs directly on the map (icons/temperatures per pin) —
explicitly deferred (FR-016); would require fetching weather for every pin up front (potentially
many parallel requests) and solving the "observation vs. forecast, which one, at what time" question
the user themselves flagged as unresolved.
