# Quickstart: Reduce Loading Requests

## Prerequisites

Existing Node/npm project setup (`npm install` already run).

## 1. Verify the hook's cache/decoupling behavior in isolation

```sh
npx vitest run tests/unit/useObservationData.test.ts
```

Expected outcome: all cases pass, including:
- The pre-existing "window-only refetch preserves previous data" test (adjusted to switch to
  `"last-30-days"`, the one window this feature never pre-caches, so it still genuinely exercises a
  pending fetch).
- A new test: switching from `"last-24-hours"` to `"last-7-days"` and back issues no additional
  `getObservations`/`getMultiSourceForecast` calls beyond the initial load.
- A new test: `series`, `multiSourceForecast`, and `weeklySeries` each update as soon as their own
  fetch resolves, without waiting on the others (e.g. a slow `getMultiSourceForecast` doesn't delay
  `series` appearing).

## 2. Verify end-to-end through the real app

```sh
npx vitest run tests/integration/weatherIconOverview.test.tsx
```

Expected outcome includes a new scenario: loading a location on the 24-hour Overview, switching to
the 7-day view, then back to 24-hour, issues no duplicate `getObservations`/`getMultiSourceForecast`
calls for either window beyond the initial load — and a regression scenario confirming a visit that
never opens Details issues zero nearby-station requests.

## 3. Manual check in the browser

```sh
npm run dev
```

Open the app, pick a location, open the browser's Network tab, and:
- Confirm the initial load fires each provider request once.
- Switch between the 24h/3-day/7-day tabs a few times — confirm no new `smhi`/`open-meteo`/`met.no`
  requests fire after the first visit to each of the 24h and 7d windows (3-day reuses 7-day's
  request already, unchanged).
- Wait 15+ minutes (or use devtools to fast-forward the tab's visibility) and confirm the periodic
  auto-refresh still fires fresh requests as before — this feature must not suppress that.

## 4. Full verification before commit

```sh
npm run lint
npx tsc -b
npm test
npm run build
```

All four must be clean, matching this project's existing pre-commit convention.
