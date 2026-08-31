# Quickstart: Vibrant "Award-Worthy" Theme and Elevated Graph Styling

Validates that the restyled "Bright" theme and elevated graph styling work end-to-end, on top of the already-running app from `001-weather-history-locations`.

## Prerequisites

- Dependencies installed: `npm install`
- No new environment variables, API keys, or backend services (this feature is CSS/component-only; reuses the existing SMHI/Open-Meteo integration from `001-weather-history-locations`).

## Run

```bash
npm run dev
```

Open the printed local URL in a browser.

## Validation scenarios

1. **New palette replaces "Ivory" (User Story 1, FR-001, FR-003a)**
   - Open the theme picker.
   - Confirm the three entries read "Midnight," **"Bright"** (not "Ivory"), and "Glass" — [data-model.md](./data-model.md).
   - Select "Bright." Confirm the background becomes near-white and accent/link/active-control colors switch to the vibrant coral/lime pairing across every screen (graph, details page, favorites, all controls) — no page reload.
   - Reload the page (or, to simulate a pre-existing user, run `localStorage.setItem('weather-app:theme-preference:v1','ivory')` in the browser console before reloading). Confirm the app loads directly into the new "Bright" palette, not an error or a different theme (FR-003a — see [research.md](./research.md) §2).

2. **Elevated graph styling (User Story 2, FR-004, FR-007)**
   - With "Bright" active, view the 24-hour graph for a location with data. Confirm the precipitation bar shows a gradient fill (not a flat translucent block) and the grid lines/axis text/tooltip visually match the bright theme (not default dark-on-white Recharts styling) — [research.md](./research.md) §4, §5.
   - Switch to "Midnight" and then "Glass." Confirm the same gradient-fill/tooltip/grid refinements are present under both (FR-007 — the polish is theme-independent, not exclusive to "Bright").
   - Switch to the 7-day graph and repeat: gradient fill on the precipitation bar, themed grid/axis/tooltip.

3. **Series legibility preserved (FR-005, FR-006, SC-004)**
   - View a location with nearby comparison stations under "Bright" (SMHI-covered location, e.g. a Swedish city — see `001-weather-history-locations`'s quickstart for how to trigger this). Confirm each of the up-to-5 comparison series remains visually distinguishable from the primary series and from each other (distinct hue + dash pattern, unchanged from `001-weather-history-locations`), and that no line/bar/text is illegible against the new bright background.
   - Spot-check text contrast: headings, body text, and muted text (`--text-muted`) should all read clearly against both `--bg` and `--surface` under "Bright."

4. **No functional regression (spec Assumptions)**
   - Confirm favorites add/remove, current-location detection, unit toggle, "View details," and the SMHI/Open-Meteo data shown are all unchanged in behavior — this feature is visual-only.

## Automated checks

```bash
npm run test    # unit + component tests, including any new theme.test.ts / seriesColors contrast assertions
npm run lint
npm run build    # confirms the app still builds cleanly for GitHub Pages deployment
```
