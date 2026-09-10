# Tasks: Debug Section With Raw Source Responses

## Phase 1: Setup
- [X] T001 Confirm baseline `npm test`/`npm run lint`/`npm run build` pass.

## Phase 2: Implementation

### Provider-level raw capture (no return-shape changes)
- [X] T002 In `src/services/smhiProvider.ts`, add `let lastRawForecastResponse: SmhiForecastResponse | null = null;` near the top; inside `fetchForecastTimeSeries`, set it to the parsed `data` right after `const data = (await response.json()) as SmhiForecastResponse;` (and to `null` in the catch/non-ok branches); export `function getLastRawForecastResponse(): SmhiForecastResponse | null { return lastRawForecastResponse; }`.
- [X] T003 In `src/services/openMeteoProvider.ts`, same pattern: module-level `lastRawForecastResponse: OpenMeteoHourlyResponse | null`, set inside `fetchHourlyPoints` right after parsing `data`, exported getter `getLastRawForecastResponse()`.
- [X] T004 In `src/services/metNoProvider.ts`, same pattern: module-level `lastRawForecastResponse: MetNoResponse | null`, set inside `fetchTimeSeries` right after parsing `data`, exported getter `getLastRawForecastResponse()`.

### Wiring into the multi-source entry
- [X] T005 In `src/services/weatherApi.ts`, add `rawResponse?: unknown;` to `MultiSourceForecastEntry`.
- [X] T006 In `getMultiSourceForecast`, after the existing `Promise.allSettled` resolves, call each provider's `getLastRawForecastResponse()` (`smhiProvider`, `openMeteoProvider`, `metNoProvider`) and attach the result as `rawResponse` on the entry pushed for that source (only for entries that already get pushed today — no change to the push condition itself).

### Debug panel UI
- [X] T007 Create `src/components/DebugPanel.tsx`: accepts `multiSourceForecast: MultiSourceForecastEntry[]`; renders a `<section className="debug-panel" aria-label="Debug: raw source responses">` with a heading, then one block per of `["smhi", "open-meteo", "met-no"]` — each labeled by source name, showing `<pre>{JSON.stringify(entry.rawResponse, null, 2)}</pre>` when a matching entry exists, or a "No data" line when it doesn't.
- [X] T008 In `src/App.tsx`, import `DebugPanel` and render `<DebugPanel multiSourceForecast={multiSourceForecast} />` immediately before `<Footer>`.
- [X] T009 [P] In `src/index.css`, add minimal styling for `.debug-panel` (e.g. muted background, monospace `<pre>`, scrollable if long, collapsed-by-default `<details>` wrapper so it doesn't dominate the page — a `<details>`/`<summary>` pair is the simplest way to keep it out of the way while still "in the page" per the request).

### Tests
- [X] T010 [P] In `tests/unit/weatherApi.test.ts`, add a test: after `getMultiSourceForecast` resolves, each returned entry has a `rawResponse` matching what that provider's mocked raw fetch would have parsed (mock each provider's `getLastRawForecastResponse` alongside its existing `getForecastOnly` mock).
- [X] T011 [P] In `tests/integration/appHeader.test.tsx` (or a new focused test file), add a test: the debug section renders with a heading per source, and expanding it shows no additional call to any mocked fetch function beyond what the page's normal load already triggers.

## Phase 3: Polish
- [X] T012 [P] Run `npm run lint`.
- [X] T013 [P] Run `npx tsc -b`.
- [X] T014 Run `npm test` (full suite).
- [X] T015 Run `npm run build`.
- [X] T016 Bump `package.json` version (patch).
- [X] T017 Commit and push (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`).
