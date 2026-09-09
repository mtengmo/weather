# Tasks: Sticky Observed/Forecast Timeline Label, No Per-Column Repeat

## Phase 1: Setup
- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.

## Phase 2: Implementation
- [X] T002 In `src/components/WeatherIconOverview.tsx`, remove the `{period.isForecast && <span className="weather-timeline-cell-forecast">Forecast</span>}` line (each cell's `aria-label` already discloses "(forecast)" — nothing accessibility-relevant is lost).
- [X] T003 In `src/index.css`, remove the now-unused `.weather-timeline-cell-forecast` rule.
- [X] T004 In `src/index.css`, add `position: sticky; top: 0; z-index: 2; background: var(--surface);` to `.weather-timeline-sections` so it stays visible while scrolling and doesn't let underlying rows show through.
- [X] T005 [P] In `tests/integration/weatherIconOverview.test.tsx`, add/update a test: a forecast column's icon cell no longer contains the text "Forecast", while the Observed/Forecast band (`.weather-timeline-section-forecast`) is still present and still says "Forecast".

## Phase 3: Polish
- [X] T006 [P] Run `npm run lint`.
- [X] T007 [P] Run `npx tsc -b`.
- [X] T008 Run `npm test` (full suite).
- [X] T009 Run `npm run build`.
- [X] T010 Bump `package.json` version (patch).
- [X] T011 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).
