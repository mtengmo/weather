# Quickstart: Validate Coarser Temperature Timeline Scale

## Prerequisites

- Dependencies installed (`npm install`)

## Automated validation

```bash
npm run test -- weatherIconOverview
```

Confirms (see `tests/integration/weatherIconOverview.test.tsx`):
- No tick/label is generated at an intermediate 5-degree value (only multiples of 10).
- A `0` tick/label is always present, including for all-positive and all-negative temperature ranges.
- Wind/rain/cloud rows are unaffected (no ticks generated for them, as before).

## Manual validation

1. `npm run dev`
2. Open the dashboard and locate the temperature row of the weather timeline overview.
3. Check three cases (use different date ranges or seasons if the app allows switching, or temporarily adjust test/mock data to force each range):
   - **All-positive range** (e.g., 15–25°C): confirm a `0°` gridline/label is still shown below the visible temperature line, and remaining labels are only at 10° steps (0, 10, 20, ...).
   - **All-negative range** (e.g., -20 to -5°C): confirm a `0°` gridline/label is still shown above the line, with labels only at 10° steps.
   - **Range crossing zero** (e.g., -5 to 15°C): confirm labels appear only at 10° steps and none at 5° intermediate values.
4. Confirm the temperature line, its shaded gradient fill, and the existing high/low value indicators look unchanged from before this change.
5. Confirm the wind, rain, and cloud rows are visually unchanged (no gridlines/labels appear on them, same as before).

## Expected outcome

Fewer, coarser reference lines/labels on the temperature row (10° step instead of 5°), always anchored on and including `0°`, with no regression to the temperature line itself or to other rows.
