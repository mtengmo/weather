# Quickstart: Declutter Timeline Header and Move Moon Phase to the Today Card

## Prerequisites

- `npm install` (if not already done)

## Automated validation

```bash
npm test
```

Expect (per `research.md` §4):
- `tests/integration/weatherIconOverview.test.tsx` confirms no "Data: SMHI"-style note and no
  Sunrise/Sunset text render directly above the Overview timeline.
- The Today card's own tests confirm a `Moon <phase>` span now renders alongside its existing
  Sunrise/Sunset figures.

## Manual validation

1. `npm run dev`, open the dashboard Overview for any location.
   - **Expected**: No "Data: SMHI" (or "Data: Open-Meteo") note and no Sunrise/Sunset line appear
     directly above the timeline.
2. Look at the Today card (above the timeline).
   - **Expected**: It shows its existing Sunrise/Sunset figures plus a new Moon phase (e.g. "Moon
     waning crescent").
3. Open the Details/graph view for the same location.
   - **Expected**: Its own "Data: SMHI"-style note is still shown, unaffected by this change.
4. Check the app's footer.
   - **Expected**: Its data-source/freshness disclosure is unchanged.

## Notes

- No new dependencies, environment variables, or build steps.
