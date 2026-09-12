# Quickstart: Fix the Same Brief-Rain Bug on the 7-Day Forecast Graph

## Automated validation

```sh
npm test -- weatherIconOverview
```

Covers: the existing daily-brief-strip (066/067) Uppsala-shaped tests continue to pass unmodified
(regression guard for the extraction), plus new 7-day-view equivalents.

## Manual validation

1. `npm run dev`, open the app for a location, switch the overview to its 7-day tab.
2. Using the debug panel or a mocked response, construct a day with rain confined to a couple of
   morning hours and dry the rest of the daytime span.
3. Confirm that day's column in the 7-day view now shows a dry icon/condition — matching the
   persistent daily brief strip shown for the same day elsewhere on the same screen.
4. Repeat with rain spanning most of the daytime hours, and separately with a brief but heavy
   event — confirm both still show rain in the 7-day view.
5. Switch to the 3-day tab and confirm its sub-day columns render exactly as before (unaffected).

## Full regression

```sh
npm run lint
npx tsc -b
npm test
npm run build
```
