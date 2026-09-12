# Quickstart: Daytime-Weighted Daily Forecast & Manual Language Setting

## Prerequisites

```sh
npm install
```

No new dependencies are introduced by this feature.

## US1 — Daytime-weighted daily forecast

**Automated validation**: `tests/unit/dailyAggregation.test.ts` covers the new daytime-filtered
aggregation fields directly; `tests/integration/weatherIconOverview.test.tsx` (where
`WeeklyForecastStrip` is already exercised) covers the end-to-end condition/icon selection.

```sh
npm test -- dailyAggregation weatherIconOverview
```

**Manual validation**:

1. `npm run dev`, open the app, and let a location's forecast load so the 7-day strip is visible
   (part of the Overview).
2. Using the browser devtools debug panel (`DebugPanel.tsx`, already in this app) or a mocked
   response, find or construct a forecast day where precipitation is only reported before 6 AM or
   after 8 PM local time, with none in between.
3. Confirm that day's card in the weekly strip shows a dry condition/icon, not rain.
4. Repeat with precipitation reported at, say, 2 PM — confirm that day still shows rain.

## US2 — Manual language setting

**Automated validation**: `tests/unit/language.test.ts` covers the new preference
service/persistence; `tests/integration/languageSetting.test.tsx` covers picking a language in
the Settings menu and confirming rendered text changes with no reload.

```sh
npm test -- language
```

**Manual validation**:

1. `npm run dev`, open the app with a browser set to English.
2. Open Settings, find the new language control, and switch it to "Svenska" — confirm all visible
   text (header buttons, Today card, Settings menu itself) switches to Swedish immediately.
3. Reload the page — confirm it stays in Swedish (the choice persisted).
4. Switch back to "Automatic" — confirm it reverts to English (matching the browser's actual
   language), same as the app's pre-existing auto-detect behavior.

## Full regression

```sh
npm run lint
npx tsc -b
npm test
npm run build
```
