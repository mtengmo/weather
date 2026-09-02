# Quickstart: Timeline Polish and Header Consolidation

## Prerequisites

- `npm install` already run in the repo root.
- For the location-cache scenario: a browser profile where `localStorage` is available (default).
- For the timezone scenario: a mobile device/emulator with its system timezone set to
  `Europe/Stockholm` (or any non-UTC zone) and a locale that would otherwise render 12-hour time
  (e.g. `en-US`) — the fix should make this irrelevant, but this is how the original bug was seen.

## Setup

```bash
npm run dev
```

## Validation Scenarios

### Scenario 1 — Compact, consolidated header (User Story 1)

1. Load the app on a narrow (mobile-width) viewport.
2. **Expected**: no standalone "Weather History" title row; the search input and favorites list
   are visible within the header's control strip, not further down the page, without scrolling.
3. Resize to a wide (laptop) viewport; confirm the header controls (including search/favorites)
   remain usable, wrapping rather than clipping.

### Scenario 2 — Leaner timeline rows (User Story 2)

1. Open the Overview for a location with full wind/gust data.
2. **Expected**: no Cloud cover row, no Feels like row anywhere in the timeline. The Wind row shows
   `12 (18) m/s`-style values — both whole numbers, gust in parentheses — falling back to a plain
   `12 m/s` when a column has no gust data for that hour.

### Scenario 3 — Correct hour labels regardless of device locale (User Story 3)

1. On the timezone-configured mobile device/emulator, open the 24-hour timeline.
2. **Expected**: hour labels are in 24-hour format (e.g. `15`, not `3 PM`) and match the same
   data's labels when viewed on a laptop.

### Scenario 4 — Horizontal scroll works with a plain mouse wheel (User Story 3)

1. On a laptop-width viewport where the timeline visibly overflows its container, hover over the
   timeline and scroll using a plain vertical mouse wheel (not a trackpad swipe).
2. **Expected**: the timeline pans left/right in response, in addition to trackpad swipe and
   scrollbar-drag (both already working since 008).

### Scenario 5 — "Now" column shows an estimate instead of a gap (User Story 3)

1. Find or construct a series where the exact boundary hour has no directly measured/forecast
   reading but its immediate neighbors do.
2. **Expected**: that column shows a value (visually marked as an estimate) in every core row,
   instead of a blank `—` gap. Confirm via `tests/unit/timelineData.test.ts`'s interpolation cases
   if a live series with this exact condition isn't readily reproducible.

### Scenario 6 — Location is remembered across reloads (User Story 4)

1. Select a specific favorite (not the default current-position flow).
2. Reload the page.
3. **Expected**: the same favorite is shown again immediately, without needing to re-select it.
4. Clear `localStorage` (or use a private window) and reload again; confirm the app falls back to
   today's default behavior (current-position geolocation / first favorite) unchanged.
5. If reachable, remove a favorite that was the cached location, reload, and confirm graceful
   fallback rather than a broken/blank state.

## Automated Coverage

- `tests/unit/locationCache.test.ts` — get/set round-trip; graceful `null`/no-op on
  unavailable/corrupt `localStorage`.
- `tests/unit/timelineData.test.ts` — cloud/feelsLike/gust rows absent from `TimelineData`; wind
  row carries `gust`; hour label is locale-independent; boundary-column interpolation applies only
  under the exact conditions in research.md §3, and never in the daily builder.
- `tests/integration/weatherIconOverview.test.tsx` — no cloud/feelsLike rows render; wind row
  renders combined `speed (gust)` text; an interpolated "now" column renders with its distinct
  marker.
- A new or extended App-level integration test — header contains search/favorites; a cached
  location is restored on a fresh render without re-invoking the default geolocation flow.

Run `npm test` for the full suite. Manual visual verification (Scenarios 1, 3, 4) benefits from the
Playwright setup already proven working in this repo's prior polish phases (008/010/011).
