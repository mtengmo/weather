# Quickstart: Dashboard Polish Round Four

## Prerequisites

```sh
npm ci
npm run dev
```

Select a real SMHI-covered location (e.g. Stockholm/Uppsala) so both SMHI and Open-Meteo forecast
paths are exercised.

## US1 — Location name in the header

1. Select a location. **Expect**: its name is visible in the header, without opening any menu.
2. Switch between 24 Hours / 3 Days / 7 Days / Details / Map. **Expect**: the name stays visible
   on every screen.

## US2 — Map back navigation

1. Click "Map." **Expect**: a "Back" control appears in place of the "Map" button.
2. Click "Back." **Expect**: you land back on the screen you were on before opening the map.

## US3 — Dropdown legibility

1. Switch to the "glass" theme (Display menu → theme picker).
2. Open the Display menu, then the Forecast-sources menu. **Expect**: both are clearly legible —
   no page content showing through the panel background.
3. Repeat in the other two themes as a regression check. **Expect**: unaffected (already fine).

## US4 — Rain bar

1. Find (or simulate via a location/date with) a period with clearly varying forecast rain
   amounts across several columns.
2. **Expect**: every bar's bottom sits on the same baseline, and a column with more forecast rain
   renders a visibly taller bar than one with less, matching the observed columns' behavior.

## US5 — Wind direction on 3-day/7-day

1. Switch to "3 Days," then "7 Days." **Expect**: the Wind row shows a direction arrow next to the
   speed for every period that has wind data, the same as the 24-hour view.

## US6 — High/low labels

1. View the Today card. **Expect**: "High"/"Low" (or equivalent short labels) next to the two
   temperature values.
2. View the 7-day timeline's Temperature row with High/Low visible (Display menu). **Expect**:
   the parenthetical is labeled, not two bare numbers.

## US7 — 7-day cap and dates

1. Open "7 Days" for a location with a forecast reaching well beyond a week. **Expect**: exactly
   7 day columns, each labeled with weekday + calendar date (e.g. "Fri 5").
2. Check the persistent weekly forecast strip (visible on all three tabs). **Expect**: also
   exactly 7 day-cards, consistent with the timeline above it.

## US8 — Forecast source behavior

1. With "Forecast sources: Automatic," confirm the shown forecast is SMHI's own (visually or via
   the footer's source disclosure) whenever the location is SMHI-covered.
2. Switch to "Forecast sources: Combined." **Expect**: each forecast temperature shows one value
   marked "(avg)," not two side-by-side per-source values.
3. Check the footer. **Expect**: a freshness time is shown for the forecast in use (SMHI's own
   "updated HH:MM" when available, otherwise the app's last-fetch time).

## Automated checks

```sh
npm test
npm run lint
npm run build
```
