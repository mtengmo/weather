# Quickstart: Validate Combined Weather Icon Overview

Manual + automated validation, mapped to spec.md's user stories and success criteria.

## Prerequisites

- `npm install` (will pull in the new `lucide-react` dependency once added — see tasks.md)
- Network access to the app's existing weather data sources (SMHI, Open-Meteo) — no new external calls are introduced by this feature itself

## Run it

```sh
npm run dev
```

## Validation scenarios

### 1. 24h icon overview (User Story 1 / SC-001, SC-003, SC-004)

1. Select a location with a full 24 hours of observed (and, ideally, some forecast) data.
2. Navigate to the new overview view (FR-009).
3. Confirm each displayed hour shows one recognizable icon (sun, moon, cloud, rain, wind, or snow) without needing to read any numbers to understand the general condition (SC-001).
4. Confirm at least one nighttime hour (if present in the visible range) shows the moon icon rather than the sun icon when clear (Acceptance Scenario 2).
5. If any hour has forecast data, confirm it's visually distinguished from observed hours (Acceptance Scenario 4, SC-004).
6. If any hour has a data gap (temperature and precipitation both missing), confirm it shows the distinct "no data" indicator, not a guessed icon (Acceptance Scenario 5, SC-003).
7. Pick an hour with more than one condition technically true (e.g., raining and windy) and confirm exactly one icon is shown, consistent with the priority order (Acceptance Scenario 3).

### 2. 7-day icon overview (User Story 2)

1. Switch the overview view to the 7-day period.
2. Confirm each of the 7 days shows one icon and its key daily values (e.g., high/low temperature).
3. Confirm any forecast day is visually distinguished the same way as the 24h view.

### 3. Responsive layout (User Story 3 / SC-002)

1. With the overview view open in a large browser window, confirm it visibly occupies substantially more space than the existing chart views do (SC-002).
2. Resize the browser window smaller and confirm the icon grid reflows (fewer columns, more rows) and stays legible rather than overflowing or shrinking illegibly.

### 4. Navigation and consistency (FR-009, FR-010)

1. Confirm there's a clear way to reach the new overview view from the existing graph view, and back.
2. Toggle the unit system (metric/imperial) and confirm the overview's displayed values update accordingly.
3. Switch themes and confirm the overview view's styling (background, text, icon coloring) follows the active theme like the rest of the app.

### 5. Automated checks

```sh
npm run lint
npm test
npm run build
```

New tests: `tests/unit/weatherCondition.test.ts` (condition-derivation priority order, thresholds, day/night, no-data rule — see contracts/weather-condition.md) and `tests/integration/weatherIconOverview.test.tsx` (view renders, navigation, forecast/no-data distinction), following this repo's established conventions (`vi.stubGlobal`/`vi.mock` for data, RTL for rendering — see 005/006's equivalent tests).
