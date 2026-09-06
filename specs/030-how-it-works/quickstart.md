# Quickstart: "How This Works" Documentation Page

## Automated validation

```bash
TZ=UTC npx vitest run
```

Expect a new integration test asserting: the footer's new button opens the panel; the panel's
text content mentions the 24h/3-day/7-day views, observed-vs-forecast, the data sources, UV risk,
and warnings; closing the panel removes it from the DOM without changing the currently selected
location/view (assert the underlying screen's own content, e.g. the location name, is still
present and unchanged after close).

## Manual / live validation

1. `npm run dev`.
2. From the Overview, open "How this works" from the footer; confirm it reads clearly and
   mentions every feature listed in FR-002.
3. Close it; confirm you're back on the exact same screen (same location, same tab/view) with no
   visible reload.
4. Repeat from the Details/graph view and the Map view — confirm the control is reachable and
   behaves the same from both.
5. Check on a narrow (mobile-width) viewport — confirm the panel is fully readable and closable
   with no horizontal scrolling.
