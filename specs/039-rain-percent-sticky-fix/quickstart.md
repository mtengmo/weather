# Quickstart: Restore Rain Percentage and Remove Sticky Row-Title Column

## Prerequisites

- `npm install` (if not already done)
- `npm run dev` to run the app locally, or `npm test` for the automated checks

## Automated validation

```bash
npm test
```

Expect (per `research.md` §4):
- The updated `tests/integration/weatherIconOverview.test.tsx` sticky-title assertion confirms `.weather-timeline-row-title` no longer carries `position: sticky`.
- A rain-row test confirms the `mm · %` display renders when `chanceOfRain > 0`, including for a period whose rain/snow icon is suppressed by the low-confidence guard (independence of FR-001/FR-002).

## Manual validation (desktop + mobile widths)

1. `npm run dev`, open the dashboard (Overview) for a location whose forecast periods include a known chance-of-rain value (check via the Rain metric's underlying data, or pick a period you know has rain forecast with a probability figure — Open-Meteo-backed periods are the reliable case since SMHI doesn't supply this field, per `research.md` §1).
   - **Expected**: The Rain row shows `<mm> · <percent>%` for those periods.
2. Find (or construct via test data) a period with a small rain amount and a chance-of-rain under 20%.
   - **Expected**: That period's weather icon does NOT show rain/snow (unchanged low-confidence guard, FR-002), but its Rain row cell still shows the `mm · %` text (FR-001).
3. Resize the browser to a mobile width (e.g. 375px) and scroll the Rain (or any) row horizontally.
   - **Expected**: The row's title ("Rain", "Wind", "Temp", "Weather") scrolls away with the data instead of staying fixed at the left edge over the chart (FR-004).
4. Repeat step 3 at a desktop width.
   - **Expected**: The row still shows its title and data correctly, with no layout regression (FR-006).
5. With a screen reader (or by inspecting the accessibility tree), navigate the timeline.
   - **Expected**: Each row's title is still announced and associated with its data (FR-005).

## Notes

- No new dependencies, environment variables, or build steps are introduced by this feature.
