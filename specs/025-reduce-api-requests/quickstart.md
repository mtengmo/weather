# Quickstart: Reduce API Requests & Hide 0% Rain Chance

## Prerequisites

```sh
npm ci
npm run build
npm run preview
```

Use the production preview (not `npm run dev`) for request-count verification, so React
StrictMode's dev-only effect double-invocation doesn't skew the count.

## US1 — Nearby-station data deferred until Details/graph is opened

1. Open DevTools → Network, clear it, then load the app fresh (Overview). **Expect**: no request
   to any SMHI station other than the primary location's own nearest station.
2. Click "Details" (or open the graph view). **Expect**: a burst of nearby-station requests fires
   at that point, and the Details/graph view's existing loading state is shown briefly.
3. Return to the Overview, then back to Details. **Expect**: no new nearby-station requests fire
   the second time (same location/window).

## US2 — No duplicate identical requests

1. Clear Network, load the app fresh. **Expect**: no single URL (same parameter, station, and
   period) appears more than once in the list.
2. Specifically check for `smhiProvider.getObservations`-shaped bursts (6 parameters × 1 station)
   appearing exactly once for the primary location, not twice.

## US3 — 0% rain chance hidden

1. Find (or mock) a forecast period with a genuine 0% chance of rain. **Expect**: no percentage
   shown next to the mm value.
2. Find a period with a non-zero chance. **Expect**: it still shows its percentage as before.

## Automated checks

```sh
npm test
npm run lint
npm run build
```
