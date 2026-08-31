# Quickstart: Weather Observation History for Current Position and Favorite Places

Validates the feature end-to-end per the acceptance scenarios in [spec.md](./spec.md). Assumes the implementation described in [plan.md](./plan.md) (Vite + React + TypeScript, no backend, deployed to GitHub Pages, SMHI + Open-Meteo dual weather provider, 3 user-selectable themes).

## Prerequisites

- Node.js LTS installed.
- Dependencies installed: `npm install` from repo root.
- A browser that supports the Geolocation API (all target browsers do); location permission prompts will appear during manual testing.
- Network access to `opendata-download-metobs.smhi.se` (SMHI), `api.open-meteo.com`, and `geocoding-api.open-meteo.com` (see [research.md](./research.md) §1, §1b).

## Run the app

```bash
npm run dev
```

Open the printed local URL in a browser.

## Scenario 1 — Current location observation history (User Story 1, P1)

1. On first load, accept the browser's location permission prompt.
2. **Expect**: the app displays a **graph** of observed temperature and precipitation for "Current Location" covering the last 24 hours, plotted hourly (FR-001, FR-017).
3. Switch to the weekly view.
4. **Expect**: the same location now shows a **graph** of the last 7 days, as one daily high/low/average temperature + total precipitation point per day — not 168 hourly points (FR-002, FR-014, FR-018).
5. Use the "View details" control on the 24h graph, then again on the weekly graph.
6. **Expect**: each opens a details page with the underlying data in a table, matching what its graph is showing (FR-019, SC-006).
7. Reload the page and **deny** the location permission prompt this time.
8. **Expect**: the app shows a message that location is unavailable and offers an alternative (search or a saved favorite) — not a dead-end error (FR-011).

## Scenario 2 — Save and view favorite places (User Story 2, P2)

1. Use the place search to look up a city (e.g., "Stockholm").
2. Select a result and add it to favorites.
3. **Expect**: the place appears in the favorites list immediately, and its last-24-hours observation history is viewable (FR-004, FR-007).
4. Reload the page.
5. **Expect**: the saved favorite is still present (FR-006 — persisted via `localStorage`).
6. Attempt to add the same place again.
7. **Expect**: the app rejects the duplicate with a clear message (FR-012).
8. Add favorites until 10 are saved, then attempt an 11th.
9. **Expect**: the app blocks the addition and explains the limit (FR-009).
10. Remove a favorite.
11. **Expect**: it no longer appears after reload (FR-005).

## Scenario 3 — Switching locations (User Story 3, P3)

1. With current location available and at least one favorite saved, select the favorite.
2. **Expect**: the displayed observation data updates to the favorite's data within a few seconds (SC-003).
3. Switch back to current location.
4. **Expect**: data updates back accordingly.

## Scenario 4 — Units (FR-015)

1. Load the app with a browser locale that implies imperial units (e.g., `en-US`).
2. **Expect**: temperature/precipitation display in °F/inches by default.
3. Use the unit toggle to switch to metric.
4. **Expect**: the same data re-renders in °C/mm instantly (no new network request), and the choice persists across a reload.

## Scenario 5 — Unresolvable favorite (FR-016)

1. With a favorite saved, simulate the weather provider being unreachable for that favorite's coordinates (e.g., block the request in dev tools) and select it.
2. **Expect**: the favorite remains in the favorites list, and an inline error/unavailable message is shown for it instead of data — it is not silently removed.
3. Remove it manually.
4. **Expect**: it is gone from the list (confirms removal still works normally; only *automatic* removal is disallowed).

## Scenario 6 — SMHI vs. Open-Meteo provider selection (research.md §1, §1b)

1. Select or search a Swedish location (e.g., Stockholm, ~59.33, 18.06).
2. **Expect**: the observation data comes from SMHI (verify via network tab — a request to `opendata-download-metobs.smhi.se`), with hourly gaps correctly detected for any hour SMHI's station has no reading for (research.md §1's "no missing-hour markers" behavior).
3. Select or search a non-Swedish location (e.g., Paris, France).
4. **Expect**: the observation data comes from Open-Meteo instead (no SMHI request, or an SMHI request that's skipped because `isCovered` returned false).
5. For the Swedish location, block only requests to `opendata-download-metobs.smhi.se` (leave Open-Meteo reachable).
6. **Expect**: the view still shows data — silently falls back to Open-Meteo rather than showing an error (per [contracts/weather-service.md](./contracts/weather-service.md)).

## Scenario 7 — Nearby station comparison (User Story 4, P4)

1. Select or search a Swedish location with several nearby SMHI stations (e.g., central Stockholm).
2. **Expect**: both the 24h and weekly graphs show the location's own series plus up to 5 additional, visually distinguishable comparison series for the nearest stations (FR-020, SC-007).
3. Select a non-Swedish location (e.g., Paris).
4. **Expect**: only the selected location's own series is shown — no comparison series, no error (FR-021).
5. Select a Swedish location in a sparsely-instrumented area (fewer than 5 active stations within reach).
6. **Expect**: the graph shows however many comparison series are actually available (could be 0–4), not an error and not a request for more data.
7. Simulate one comparison station's data fetch failing (block that specific station's request in dev tools) while the others succeed.
8. **Expect**: the other comparison series and the selected location's own series render normally; the failed station is simply omitted (FR-022 — one series's problem doesn't affect the others).

## Scenario 8 — GitHub Pages build

1. Build for the Pages deployment: `npm run build`.
2. Serve the `dist/` output locally under a subpath matching the configured `base` (e.g. `npx vite preview` or any static file server rooted appropriately) to simulate `https://<user>.github.io/<repo>/`.
3. **Expect**: the app loads with no broken asset paths (check the browser console for 404s on JS/CSS) and behaves identically to `npm run dev`.
4. **Expect**: the GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and publishes on push to the default branch (verify in the Actions tab after pushing, or via `act`/manual inspection if testing locally without pushing).

## Scenario 9 — Themes (FR-023–FR-025, User Story 5)

1. Clear `localStorage` (or use a fresh browser profile) and load the app.
2. **Expect**: the app displays using the default "Midnight" theme (FR-025).
3. Open the theme picker and select "Ivory".
4. **Expect**: every visible screen (the current graph, favorites list, controls) immediately updates to the Ivory palette/typography — no reload, no flash of unstyled content (SC-008).
5. Navigate to "View details" and switch between the 24h/weekly windows while on Ivory.
6. **Expect**: the details table and both graphs remain styled consistently in Ivory (FR-024) — theme switching doesn't reset the selected location/window.
7. Select "Glass".
8. **Expect**: the app updates to the glassmorphism styling app-wide, same as step 4.
9. Reload the page.
10. **Expect**: the app still displays in "Glass" — the choice persisted (FR-025).

## Edge case checks

- Temporarily block network requests to the weather provider (e.g., via browser dev tools) and select a location.
- **Expect**: the app indicates data is unavailable rather than showing blank/zero values (spec Edge Cases; FR-010 for partial gaps within a series).

## Automated checks

- Unit tests: `npm test` — covers `favoritesStorage` (limit/duplicate/persistence logic), `smhiProvider`/`openMeteoProvider` (gap-preserving mapping, nearest-stations lookup), `weatherApi` (provider-selection, fallback-on-failure, nearby-station orchestration), `dailyAggregation` (rolling-bucket aggregation, per-field gap propagation), and `theme` (default value, persistence, `data-theme` application), per [contracts/](./contracts/).
- Component tests: `ObservationChart` renders the correct series/gaps/comparison series for a given `ObservationSeries`/`NearbyStationSeries[]`; `ObservationDetails` renders a table matching the same data.
- Optional end-to-end smoke test (Playwright) automating Scenarios 1–3 against a stubbed provider, if configured in the implementation phase.
