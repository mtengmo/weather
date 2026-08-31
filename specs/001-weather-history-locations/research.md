# Phase 0 Research: Weather Observation History for Current Position and Favorite Places

## 1. Historical weather observation data source

**Decision (revised)**: Use SMHI's open-data **Meteorological Observations API** (`opendata-download-metobs.smhi.se`) as the **primary** source for locations within its station coverage (Sweden and immediately adjacent waters), with the [Open-Meteo](https://open-meteo.com/) forecast API's `past_days` parameter as an **automatic fallback** for any location outside that coverage (per the 2026-08-30 tech-stack clarification: "SMHI + fallback provider"). Both providers are normalized to the same `WeatherObservation` shape (Celsius, millimeters, hourly `timestamp`), so nothing downstream of `services/weatherApi.ts` needs to know which provider answered a given request.

**Rationale**:
- SMHI's metobs API returns genuine station-recorded observations (not reanalysis/blended forecast data), which is a more literal match for "observed weather" than Open-Meteo's `past_days` blend — worth using where it's available.
- Free, no API key/signup required — still fits a client-only app with no backend to hold secrets.
- Open-Meteo remains the fallback because SMHI has no meaningful coverage outside Sweden, and the spec's favorites feature allows saving *any* place worldwide (FR-004) — dropping global coverage was explicitly rejected when this was raised with the user.

**SMHI API details** (confirmed via `opendata-download-metobs.smhi.se`, 2026-08-30):
- **Parameters**: `1` = hourly air temperature ("Lufttemperatur", instantaneous, once/hour); `7` = hourly precipitation sum ("Nederbördsmängd").
- **Station list**: `GET /api/version/1.0/parameter/{param}.json` returns all stations for that parameter with `key` (station id), `name`, `latitude`, `longitude`, `active`.
- **Data**: `GET /api/version/1.0/parameter/{param}/station/{stationId}/period/{period}/data.json`. Relevant `period` values: `latest-day` (trailing ~24h) and `latest-months` (trailing ~4 months — used for the 7-day window). Each `value` entry is `{ date: <epoch ms>, value: "<string number>", quality: "<code>" }`.
- **No missing-hour markers**: unlike Open-Meteo's explicit `null`, SMHI simply omits a timestamp when no reading exists. The client must build the full expected hourly timestamp range for the window and treat any timestamp with no matching SMHI entry as a gap (`null`), preserving FR-010 semantics.

**Alternatives considered**:
- **SMHI only, no fallback**: rejected by the user — would silently break favorites/current-location outside Sweden, contradicting FR-004's "any place."
- **NOAA/NWS API** (as a second fallback candidate): US-only coverage, doesn't help outside the US either; Open-Meteo's global coverage is a strictly better fallback.
- **OpenWeatherMap History API**: Requires a paid plan for historical data beyond a very limited window; adds an API-key management burden for a client-only app.
- **WeatherAPI.com**: Free tier exists but has stricter rate limits and requires an API key exposed client-side; Open-Meteo needing zero key is simpler for a spec-driven MVP.

## 1b. Determining whether a location is in SMHI's coverage

**Decision**: Fetch and cache the SMHI station list for parameter `1` once per session (client-side, in memory). For a requested `(latitude, longitude)`, compute the haversine distance to the nearest **active** station. If the nearest station is within **50 km**, treat the location as SMHI-covered and use SMHI (querying the nearest station for both parameter `1` and parameter `7` independently, since not every station reports both); otherwise use Open-Meteo directly. If an SMHI request fails or returns no usable data for an in-coverage location, fall back to Open-Meteo for that request rather than surfacing an error (the user asked for "SMHI + fallback," not "SMHI or nothing").

**Rationale**: A fixed distance threshold is simple, requires no server-side geocoding, and matches the actual physical meaning of "observed at a nearby station" — SMHI's own station density in populated parts of Sweden is well under 50 km, so this threshold rarely excludes genuinely-covered locations while still steering non-Swedish coordinates to Open-Meteo. Caching the station list avoids re-fetching ~300 stations on every location switch (relevant to SC-003's 3-second switch target).

**Alternatives considered**: A hard Sweden bounding-box check — rejected as a first pass because it's less accurate right at the border and doesn't naturally extend to "nearest station has data" fallback-on-failure; nearest-station distance is a superset check that also gives us the station id we need to query, so there's no extra cost to doing it this way instead.

## 2. Resolving current position

**Decision**: Use the browser's native `navigator.geolocation.getCurrentPosition` API to obtain latitude/longitude for "current position."

**Rationale**: Built into all target browsers, no dependency, and directly satisfies FR-003. Permission-denied/unavailable cases map directly to FR-011 (inform user, offer alternative path).

**Alternatives considered**: IP-based geolocation (less accurate, unnecessary extra network call) — rejected since browser geolocation is standard for this use case and gives better accuracy for "current position" weather.

## 3. Resolving favorite place search to coordinates

**Decision**: Use the Open-Meteo Geocoding API (`geocoding-api.open-meteo.com`) to resolve a user-entered place name to coordinates and a canonical display name.

**Rationale**: Same provider family as the weather data (consistent terms, no extra key), returns disambiguation candidates when a search term is ambiguous, and provides a stable place identifier/display name to store in favorites (supporting FR-012 duplicate prevention by comparing resolved coordinates).

**Alternatives considered**: Browser-only text entry of raw coordinates — rejected as poor UX; users think in place names, not lat/lon.

## 4. Persisting favorite places

**Decision**: Store favorites as a JSON array in `localStorage` under a single app-namespaced key.

**Rationale**: Satisfies FR-006 (persist across sessions) without requiring a backend, accounts, or sync; matches the "no server component" constraint and the assumption that favorites are local to the browser/device. Data volume is trivial (≤10 small records), well within `localStorage` limits.

**Alternatives considered**: IndexedDB — unnecessary complexity for ≤10 simple records; a backend database — rejected, no accounts/auth in scope and adds infrastructure the spec doesn't require.

## 5. Handling missing/gapped observation data (FR-010)

**Decision**: When the provider returns `null`/missing values for an hourly slot within the requested window, render that slot as an explicit "no data" gap (e.g., a break in a chart line or a dashed/empty cell) rather than defaulting to zero or interpolating.

**Rationale**: Directly satisfies FR-010 and SC-005; treating missing data as zero would misrepresent conditions (e.g., a missing precipitation reading is not the same as "no rain").

**Alternatives considered**: Linear interpolation across gaps — rejected as it fabricates data the provider never reported, contradicting the "don't show a misleading value" requirement.

## 6. Testing approach

**Decision**: Vitest + React Testing Library for unit/component tests (favorites storage, weather-data formatting/gap-handling, view switching); an optional Playwright smoke test drives the quickstart flow end-to-end against a mocked/stubbed API.

**Rationale**: Standard, low-friction pairing for a Vite + React project; keeps the weather-provider and storage logic unit-testable in isolation from rendering (per the services/ vs components/ split in Project Structure).

**Alternatives considered**: Jest — largely superseded by Vitest in Vite projects (native ESM/Vite config reuse, faster); Cypress — heavier than needed for a single optional smoke test, Playwright is lighter to wire into CI for this scope.

## 7. Unit system (metric/imperial) default and conversion

**Decision**: Derive the default unit system from the browser's locale (`Intl.NumberFormat().resolvedOptions().locale` / `navigator.language`) — US, Liberia, Myanmar locales default to imperial (°F, inches), all others default to metric (°C, mm) — with a manual toggle stored alongside the unit preference (e.g., in `localStorage`) that overrides the locale default for the session/device. The weather provider (Open-Meteo) is requested in metric units by default; imperial display is a client-side conversion (`services/units.ts`), so only one data shape is ever fetched.

**Rationale**: Directly satisfies FR-015 (locale default + manual switch). Converting client-side avoids re-fetching from the provider on unit toggle (instant switch, satisfies responsiveness expectations similar to SC-003) and keeps `weatherApi.ts` simple (always metric).

**Alternatives considered**: Re-fetch from the provider in the selected unit system on every toggle — rejected as unnecessary network round-trips for a pure display conversion; server-side/account-based unit preference — rejected, no accounts in scope.

## 8. Handling an unresolvable favorite place (FR-016)

**Decision**: A `FavoritePlace`'s coordinates are resolved once at add-time (via the geocoding service) and stored — they are not re-resolved on every view. "Cannot be resolved" therefore applies to the weather-observation fetch for that place's stored coordinates (e.g., provider outage or the coordinates no longer returning data), which is already modeled by `ObservationSeries.status === "unavailable"` (see [data-model.md](./data-model.md)). The favorite itself is never removed automatically; only an explicit user action (FR-005) removes it.

**Rationale**: Reuses the existing `ObservationSeries` status model (no new entity needed) and matches the clarification answer: keep the favorite, show an inline unavailable/error state when selected, never auto-delete.

**Alternatives considered**: Periodic background re-validation that prunes unresolvable favorites — rejected, contradicts the explicit "never auto-delete" clarification and adds complexity (background jobs) not needed for a client-only app.

## 9. Deployment target: GitHub Pages

**Decision**: Deploy the built static site (`vite build` output) to GitHub Pages via a GitHub Actions workflow that builds on push to the default branch and publishes `dist/` to the `gh-pages` environment (using `actions/deploy-pages` or the `gh-pages` branch convention). Vite's `base` config is set to the repository name path (e.g. `/weather/`) so built asset URLs resolve correctly under `https://<user>.github.io/<repo>/`.

**Rationale**: The app was already frontend-only with no backend (confirmed by the 2026-08-30 tech-stack question) — GitHub Pages is free static hosting that needs nothing beyond a build step, matching the "no backend/server component" constraint already in this plan. Both SMHI and Open-Meteo APIs are called directly from the browser over HTTPS and both send permissive CORS headers for browser use, so no proxy/server is needed even with the dual-provider setup from §1/§1b.

**Alternatives considered**: Netlify/Vercel — equally viable static hosts, but GitHub Pages was the user's explicit choice and needs no third-party account beyond GitHub, which the repo already uses.

**Impact on existing plan**: No architectural change — this only affects `vite.config.ts` (`base` path) and adds a CI workflow file; it does not change `src/` structure, and `react-router-dom` (listed as a dependency in the original Technical Context) remains unused by the current single-view implementation, so no client-side routing/base-path interaction to worry about on Pages.

## 10. Charting library for the graph views (FR-017, FR-018)

**Decision**: Use [Recharts](https://recharts.org/) (`recharts`, MIT) for both the 24h line chart and the 7-day daily-aggregate chart (rendered as a combo of a high/low band or two lines plus a bar series for total precipitation).

**Rationale**:
- Composable React components (`<LineChart>`, `<Line>`, `<Bar>`, `<ComposedChart>`) map directly onto "one chart, N comparison series" (FR-020) without hand-rolled SVG/canvas work — keeps `ObservationChart.tsx` declarative and testable.
- Handles multiple series with distinct colors/legends out of the box, satisfying FR-020's "visually distinguishable" requirement and SC-007.
- A `null` data point in a `<Line>`'s data array renders as a break in that line by default (`connectNulls={false}`), which is exactly the gap behavior FR-010/FR-022 require — no custom gap-rendering logic needed per series.
- Reasonably small for a client-only bundle (~staying well under the kind of size that would meaningfully hurt a GitHub Pages load); acceptable for this app's scope.

**Alternatives considered**:
- **Chart.js / react-chartjs-2**: also viable, canvas-based (harder to unit-test rendered output than Recharts' DOM/SVG output), and per-series null-gap behavior needs an explicit `spanGaps: false` — doable but Recharts' React-native API fits this codebase's existing component style better.
- **visx**: lower-level (more control, more code to write per chart) — more power than this feature needs.
- **Hand-rolled SVG**: no dependency at all, but reinventing axis/legend/tooltip/gap logic for two chart types plus up to 6 series is a worse time/risk tradeoff than a small, well-tested library.

## 11. Details page navigation (FR-019)

**Decision**: The "details" view is a client-side UI state toggle (`view: "graph" | "details"` in `App.tsx`), not a distinct URL route — no router library is (re-)introduced.

**Rationale**: Keeps the earlier decision to drop the unused `react-router-dom` dependency (research.md §9) intact, and sidesteps GitHub Pages' well-known SPA-deep-link problem (a hard refresh on a client-routed sub-path 404s on Pages unless a 404.html rewrite trick is added). A view-state toggle needs no such workaround and satisfies FR-019/SC-006 ("a single interaction from the graph") just as well, since the details page always corresponds to whatever location+window is currently selected.

**Alternatives considered**: Reintroducing `react-router-dom` with a `/details` route — rejected as unnecessary complexity (plus the Pages deep-link caveat) for a view that's always contextual to the current selection, never bookmarked/shared as its own URL per the spec.

## 12. Weekly daily-aggregation bucketing (FR-014, FR-018)

**Decision**: Aggregate the 7-day window's underlying hourly points into 7 **rolling 24-hour buckets** ending at the current hour (not user-local calendar-day buckets). Bucket *i* (0 = most recent) covers `(now - (i+1)*24h, now - i*24h]`. Each bucket's point is `{ high: max(temperature), low: min(temperature), average: mean(temperature), totalPrecipitation: sum(precipitation) }`, computed only over the non-`null` hourly values in that bucket; if a bucket has zero non-`null` hourly values, the whole daily point is `null` (a gap, per FR-022 and the new Edge Case).

**Rationale**: Consistent with the spec's existing Assumption that "last week" is relative to current time, not fixed calendar boundaries — calendar-day bucketing would silently reintroduce a fixed-boundary interpretation the spec already rejected, and would behave inconsistently across the user's timezone vs. UTC. Rolling 24h buckets need no timezone handling at all.

**Alternatives considered**: User-local calendar-day buckets — more "natural" for a human reading "Monday's high," but rejected as contradicting the existing rolling-window assumption and adding timezone-detection complexity with no spec requirement driving it.

## 13. Nearby observation-station comparison series (FR-020, FR-021, User Story 4)

**Decision**: Only implemented for the SMHI provider (Open-Meteo has no discrete station concept — per the spec's own Assumptions, the comparison is simply omitted outside SMHI coverage, satisfying FR-021 with zero extra code path). Reuse the station list already fetched for coverage-checking (research.md §1b): for the selected location, take the 5 nearest **active** stations (excluding the primary station already used for the location's own series, if it coincides) by haversine distance, and fetch each one's temperature+precipitation series the same way as the primary station (`smhiProvider.getObservations`), in parallel via `Promise.all`. Each nearby station's series is independently gap-checked (FR-022) — one station's missing hour(s) don't affect another's.

**Rationale**: Matches the clarified scope exactly (SMHI-only, hide elsewhere, up to 5, hidden when fewer exist) with no new station-discovery logic — it's the same nearest-station computation as §1b, just taking the top 5 instead of the top 1. Parallel fetching (up to 6 stations × 2 parameters × 1 period request = up to 12 small JSON requests) keeps this within the SC-003 3-second switch budget on a typical connection; the station list itself is already cached in memory per §1b.

**Alternatives considered**: Simulating "nearby" via offset Open-Meteo grid points everywhere — explicitly rejected by the user during clarification (round 2) as not meaningfully different data from the same source repeated nearby.

## 14. Theme system: Midnight / Ivory / Glass (FR-023–FR-025, User Story 5)

**Decision**: Implement themes as plain CSS custom-property sets, scoped by a `data-theme` attribute set on `document.documentElement`. Each theme (`midnight` | `ivory` | `glass`) defines the same fixed set of tokens (`--bg`, `--surface`, `--text`, `--text-muted`, `--accent`, `--border`, plus glass-specific `--surface-blur`/`--surface-alpha` used only by the Glass theme) under a `[data-theme="…"]` selector in `index.css`; components consume tokens via `var(--token)`, never hardcoded colors, except the chart series palette (see §15). No CSS-in-JS or theming library is introduced — this mirrors the project's existing "no unnecessary dependencies" posture (research.md §9's rejection of extra hosting tooling, §11's rejection of a router) and keeps theme-switching a pure attribute toggle with zero re-render cost beyond CSS recalculation.

**Rationale**: CSS custom properties are natively supported by all target browsers (research.md Technical Context), require no build-time tooling, and switching themes is just setting one attribute — satisfying SC-008's "within 1 second, no reload" trivially (it's synchronous). This is the same mechanism already used for the artifact/design-system convention of light/dark theming via `data-theme`, so it's a well-trodden pattern rather than a novel choice for this app.

**Alternatives considered**:
- **CSS-in-JS (styled-components / Emotion)**: adds a runtime dependency and bundle weight for a feature that's fundamentally "swap some color/font values" — rejected as disproportionate.
- **Separate stylesheet per theme, swapped via `<link>` tag**: causes a flash-of-unstyled-content on switch and is harder to keep in sync (three full stylesheets vs. one token table) — rejected in favor of the single-stylesheet, attribute-scoped approach.
- **Tailwind's dark-mode-style class toggling**: would require adopting Tailwind project-wide just for this; out of scope for a small app that doesn't otherwise use a utility-CSS framework.

## 15. Chart series colors across themes

**Decision**: Keep the existing fixed `SERIES_COLORS` palette (`services/../components/seriesColors.ts`, research.md-adjacent to §10) as-is, chosen to remain legible against all three themes' backgrounds (verified contrast against Midnight's dark background, Ivory's light background, and Glass's translucent panels) rather than defining a separate palette per theme.

**Rationale**: FR-024 requires the *theme* (background/typography/chrome) to apply consistently — it does not require each data-series color to be re-picked per theme, and the spec's Assumptions explicitly scope theming to "visual presentation... they do not change functional behavior... or data shown." A single palette that works everywhere is simpler and avoids the risk of a per-theme palette accidentally changing which series maps to which color (which would undermine SC-007's "distinguishable on first viewing" if colors shifted between theme switches while a chart is open).

**Alternatives considered**: A distinct series palette per theme — rejected as unnecessary complexity for a requirement that's about chrome/surface styling, not data-visualization color theory; revisit only if a specific theme is found to have a real contrast problem with the current palette.

## Outstanding NEEDS CLARIFICATION

None. All Technical Context unknowns are resolved above.
