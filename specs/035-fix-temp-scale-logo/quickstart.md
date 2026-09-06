# Quickstart: Fix Temperature Scale Layout and Add Header Logo

## Prerequisites

- Dependencies installed (`npm install`)

## Validation scenarios

1. **Label rename**
   - Run `npm run dev`, open the app, look at the temperature row title.
   - Expected: reads "Temp (°C)", not "Temperature (°C)".

2. **Scale position**
   - On the same row, look at the row title area.
   - Expected: the degree-scale tick numbers (e.g. "20°", "15°") render inside the same sticky
     title box, to the left of the "Temp (°C)" text — not overlapping it, not in a separate
     column after it.

3. **No overlapping labels — narrow range**
   - Pick/search a location and time window where the day's temperature range is narrow (a few
     degrees) — e.g. via a mocked observation series in a test, or a real mild day.
   - Expected: every visible tick label is clearly separated from its neighbors, with no visual
     overlap, while the chart's gridlines still show every 5° step.

4. **No overlapping labels — wide range**
   - Check a view with a wide temperature range (e.g. a 7-day view spanning a cold night to a warm
     afternoon).
   - Expected: labels remain legible and evenly spaced; the fix doesn't regress the normal case.

5. **Header logo**
   - With the app loaded, look at the top-left of the header.
   - Expected: the Tengmo Väder logo image is visible, consistently, across Overview, graph/
     details, and map views, at both desktop and narrow (e.g. 375px) viewport widths, without
     pushing the search box or other header controls out of reach.

6. **Tests and build**
   - Run `npm run test` — all tests pass, including updated assertions for "Temp (°C)" and the
     header logo.
   - Run `npm run build` — succeeds with no type errors.
