# Quickstart: Timeline Visual Styling from Mockup

## Prerequisites

- `npm install` already run in the repo root.
- A location with 24-hour data including a mix of conditions if possible (any real location
  works — the app's SMHI/Open-Meteo providers supply condition data regardless).

## Setup

```bash
npm run dev
```

Open the printed local URL, allow geolocation (or search/select a location), then open the
timeline **Overview** view.

## Validation Scenarios

### Scenario 1 — Condition icons are colorful and distinct (User Story 1)

1. On the 24-hour view, scan the condition row across several hours with different conditions
   (clear day, clear night, cloudy, rainy, if present).
2. **Expected**: each condition's icon renders in its own distinct color (warm gold for sun, pale
   slate for moon, cool grey for cloud, blue for rain) — not all the same single tone as before.
   Matches spec Acceptance Scenario 1-3.

### Scenario 2 — Rows are colored and the temperature line has a gradient fill (User Story 2)

1. On the same view, look at the Temperature, Wind, and Precipitation rows.
2. **Expected**: each row's line/bars use its own distinct color; the temperature row's line has a
   soft gradient fill beneath it fading toward the row's baseline. No two rows share the same
   color, and none match the app's plain default accent used elsewhere (e.g. button borders).
3. Confirm a forecast segment of the temperature line is still visually distinguished (dashed)
   from the observed segment, just in the new color rather than reverting to grey.

### Scenario 3 — The "now" column stands out (User Story 3)

1. With a series that has both observed and forecast data, locate the column immediately after the
   vertical "now" marker line.
2. **Expected**: that column's values across every row are shown in a distinct accent color
   (matching the "now" line's own color), making it identifiable within about 2 seconds without
   hunting for the dashed line. Matches SC-003.

### Scenario 4 — Legible across all three themes (FR-008, Edge Cases)

1. Switch between Midnight, Bright, and Glass using the existing theme picker.
2. **Expected**: in every theme, all restyled icons/rows/now-column remain clearly readable against
   that theme's background — nothing blends in or becomes hard to distinguish, particularly on
   Bright's light background where the mockup's original dark-background tones need adjusting.

### Scenario 5 — No structural regressions (FR-009)

1. Confirm the same rows render as before this feature (no new rows, no removed rows, no reordering)
   and the same data/values are shown — only colors/icon fill changed.
2. Switch between the 24-hour and 7-day windows; confirm both still render correctly with the new
   styling applied consistently to both.

## Automated Coverage

- `tests/integration/weatherIconOverview.test.tsx` — asserts the presence of
  `weather-condition-${condition}`, `weather-timeline-row-${row.key}`, and
  `weather-timeline-now-column` classes (structural proxies for the visual change — see
  research.md §3 for why jsdom can't assert real computed colors).

Run `npm test` for the full suite, or `npx vitest run tests/integration/weatherIconOverview.test.tsx`
during development. Manual visual verification (Scenarios 1-4 above) requires a running dev server
and, ideally, the Playwright setup already proven working in this repo's prior polish phases
(008/011) to capture screenshots across all three themes.
