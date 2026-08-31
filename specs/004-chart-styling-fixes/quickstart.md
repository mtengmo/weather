# Quickstart: Nearby-Station Name Fix and Temperature/Wind Chart Styling

Validates all four user stories end-to-end, on top of the already-running app from `001`-`003`.

## Prerequisites

- Dependencies installed: `npm install`
- No new environment variables or API keys.

## Run

```bash
npm run dev
```

Open the printed local URL. Pick or search for a location with SMHI coverage (e.g., a Swedish city) to exercise the nearby-station scenarios.

## Validation scenarios

1. **Station name fallback (User Story 1, FR-001/FR-002)**
   - Select a location with nearby SMHI stations. If any station in the legend/table/tooltip shows "Unnamed station" instead of a blank space, the fallback is working. (If none of the current stations near your test location happen to have a blank name in SMHI's data, this can also be verified via the unit test in `smhiProvider.test.ts` that mocks a station with an empty `name`.)
   - Confirm every other station still shows its real name, unchanged.

2. **Red high / blue low (User Story 2, FR-003/FR-004)**
   - View the temperature graph's "Last 7 days" or "Last 30 days" window.
   - Confirm the "high" line is red and the "low" line is blue, both visually distinct from the "average" line and from any nearby-station lines.

3. **High/low toggle (User Story 3, FR-005-FR-008)**
   - Confirm high/low lines are shown by default (no prior preference).
   - Open the new toggle control; turn it off. Confirm the temperature graph's 7-day/30-day view now shows only the average line (for the primary location and every nearby station).
   - Confirm the 24-hour view and "View details" table are unaffected by the toggle.
   - Turn the toggle back on; confirm high/low reappear.
   - Switch location/window/metric tab; confirm the toggle's chosen state is remembered.

4. **Wind high/low/average (User Story 4, FR-009/FR-010)**
   - Switch to the "Wind" tab, "Last 7 days" or "Last 30 days" window.
   - Confirm it now shows high, low, and average wind-speed lines (red/blue/default respectively), matching the temperature graph's presentation.
   - Toggle high/low visibility off; confirm only the wind average line remains (mirroring scenario 3).

## Automated checks

```bash
npm run test    # unit + component tests, including new dailyAggregation/chartData/smhiProvider/highLowVisibility tests
npm run lint
npm run build    # confirms the app still builds cleanly for GitHub Pages deployment
```
