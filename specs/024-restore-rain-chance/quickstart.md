# Quickstart: Restore Rain Chance & Remove Overview Blend Count

## Prerequisites

```sh
npm ci
npm run dev
```

Select a real SMHI-covered location (e.g. Stockholm or Uppsala).

## US1 — Rain-probability percentage restored

1. Open the Rain row for a forecast period where rain is expected. **Expect**: a percentage
   appears next to the mm value (e.g. "2.0 mm · 60%"), sourced from SMHI's own forecast when SMHI
   is providing it.
2. Compare bar baselines across periods with and without a percentage. **Expect**: all bars still
   align at the same height (the round-six fix is unaffected).

## US2 — Overview "(avg)" annotation removed

1. Find a forecast period whose value blends 2+ sources (footer will confirm this). **Expect**:
   the Overview shows only the plain value — no "(avg)" or "(avg of N)" text.
2. Check the footer. **Expect**: it still names the contributing sources, unchanged.

## Automated checks

```sh
npm test
npm run lint
npm run build
```
