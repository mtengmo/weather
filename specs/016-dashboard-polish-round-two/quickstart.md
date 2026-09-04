# Quickstart: Dashboard Polish Round Two

## Prerequisites

- `npm install` (after adding `vite-plugin-pwa`, `leaflet`, `react-leaflet`, `@types/leaflet`).
- A location with multi-source forecast coverage (e.g. Stockholm) for User Stories 1 and 2.
- At least one favorited location for User Story 10.

## Setup

```bash
npm run dev
```

For PWA installability (User Story 7), a production build is needed — dev mode doesn't register
the service worker the same way:

```bash
npm run build && npm run preview
```

## Validation Scenarios

### Scenario 1 — 3-day view shows all available days (User Story 1)

1. Open the 3-day Overview directly from a fresh load (don't visit 7-day first).
2. **Expected**: up to 15 sub-day columns (3 days), or fewer only if the location's forecast
   genuinely doesn't reach that far — never fewer than the forecast supports.
3. Switch 3-day → 7-day → 3-day → 24h → 3-day; confirm the column count is correct at every step.

### Scenario 2 — Multi-source forecast lines on the Overview (User Story 2)

1. Turn on "Combine forecast sources."
2. Open the Overview for a location with 2+ forecast sources.
3. **Expected**: forecast periods on the temperature row show each source's own reading
   (e.g. `18°C (S 17° · O 19°)`), with faint additional lines on the temperature chart area.
4. Turn the toggle off; confirm the row reverts to plain values.

### Scenario 3 — Day-boundary marker (User Story 3)

1. Open the 3-day view.
2. **Expected**: a subtle vertical marker with a soft shadow appears between each day's 5th and
   1st sub-day columns (i.e., 2 markers total for 3 days), visually distinct from the "Now" line.
3. Open the 7-day view; confirm no such marker appears there (every column is already one day).

### Scenario 4 — Button labels and Details placement (User Stories 4 & 5)

1. Open the Overview.
2. **Expected**: window buttons read "24 Hours" / "3 Days" / "7 Days"; a "Details" button sits in
   the header's top-right area (not down near the location heading).
3. Click "Details"; confirm it opens the classic graph view.

### Scenario 5 — Change location reachable everywhere (User Story 6)

1. Visit the graph, details, overview, and map screens in turn.
2. **Expected**: "Change location" is visible in the header on every one of them.

### Scenario 6 — Install the app (User Story 7)

1. Run a production build/preview (see Setup).
2. On a supporting mobile browser (or desktop Chrome), use "Install app" / "Add to Home Screen."
3. **Expected**: installs with the app's own name/icon; opens standalone (no browser chrome).
4. Turn off the network; reopen the installed app; confirm the app shell still loads (weather data
   itself may fail to load, which is expected and fine).

### Scenario 7 — Footer, version, privacy (User Story 8)

1. Scroll to the bottom of any screen.
2. **Expected**: a small footer shows a version string and a "Privacy" link.
3. Click "Privacy"; confirm a short, plain-language notice appears, mentioning local-only storage
   and anonymous analytics.
4. Rebuild the app (a new commit); confirm the footer's version string changes.

### Scenario 8 — Analytics (User Story 9)

1. Load the app with browser dev tools' Network tab open (and no ad/tracking blocker).
2. **Expected**: a request to `googletagmanager.com/gtag/js?id=G-GPT0MTFG6S` fires.

### Scenario 9 — Map screen (User Story 10)

1. Favorite at least one location; open the new map screen.
2. **Expected**: a pin appears for each favorite (and the most recently viewed location, if not
   already a favorite).
3. Click a pin's "View" button; confirm the app switches to that location's Overview.
4. With no favorites and nothing recently viewed, open the map screen; confirm a helpful empty-state
   message appears instead of a blank map.

## Automated Coverage

- `tests/integration/weatherIconOverview.test.tsx` — 3-day regression tests (US1), day-boundary
  marker (US3), relabeled buttons (US4), multi-source rendering (US2).
- `tests/integration/appHeader.test.tsx` — "Details" button placement (US5), "Change location"
  presence across all views (US6).
- `tests/unit/timelineData.test.ts` — `mergeMultiSourceIntoTimelinePoints` (US2).
- `tests/unit/appVersion.test.ts` — version string fallback behavior (US8).
- `tests/integration/footer.test.tsx` — version display, privacy notice open/close (US8), gtag
  script presence (US9, smoke-checked via `document.head` inspection).
- `tests/integration/mapView.test.tsx` — pin rendering from favorites/cache, pin selection, empty
  state (US10).

Run `npm test` for the full suite. PWA installability (Scenario 6) and the live gtag network
request (Scenario 8) are best verified manually/via Playwright against a production build, since
neither is meaningfully testable under jsdom.
