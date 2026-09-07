# Quickstart: Validate Header Controls Cleanup and Chart Bug Fixes

## Automated validation

```bash
npm test
```

Covers: header no longer shows "Display"; a single Dark/Light button toggles theme; a Settings control holds units + high/low; "glass" is unselectable and a stored "glass" preference falls back to Dark; high/low and nearby-station defaults are off/0 for new preferences but preserved for existing ones; temperature degree-scale ticks/labels for the reported (and adjacent) ranges; temperature-line gradient stop generation (`temperatureColorScale.test.ts`).

## Manual validation

1. `npm run dev`, open the dashboard.
2. **Header (US1/US2)**: confirm there's a single theme button (no "Display" dropdown) that flips the whole app's look in one click, labeled Dark/Light; confirm a separate Settings control opens a panel with only units and high/low — no theme option inside it.
3. **Nearby stations (US5)**: open Details in a fresh browser profile (or clear `localStorage`) — confirm "Nearby stations" starts at 0 and no comparison lines show until changed.
4. **Temperature scale (US3)**: on the Overview, view periods with all-positive, all-negative, and zero-crossing temperature ranges; confirm every step between the lowest/highest shown value is labeled and no gridline visually touches the Weather-icons row above or the Precipitation row below. If you still see a bug here on a real device, hard-refresh (or uninstall/reinstall the PWA) first — this app doesn't yet force-reload on a new deploy.
5. **3-day zoom (US4)**: open the 3-day view, change the browser's zoom level (e.g. Ctrl/Cmd +/− a few steps) — confirm the timeline's columns resize to fill the available width with no large empty region on the right, and that panning still works when content doesn't fit. Repeat on 7-day and 24h to confirm no regression there.
6. **Temperature coloring (US6)**: on both the Overview's temperature row and the Details/graph view's temperature chart, confirm the line changes color across cold/mild/hot portions per the band table in spec.md, in both the Dark and Light look.
