# Quickstart: 27 Distinct Icons for SMHI's Weather Symbol Codes

## Prerequisites

- `npm install` (if not already done)

## Automated validation

```bash
npm test
```

Expect (per `research.md` §6):
- A unit test confirms `SMHI_SYMBOL_ICONS` has exactly 27 entries (1-27), each with a non-empty
  `src`/`label`.
- A unit test confirms the icon-resolution helper picks the SMHI-code entry when
  `smhiSymbolCode` is present, and falls back to `deriveWeatherCondition`/`WEATHER_ICONS`
  otherwise (unchanged from today).
- Existing integration tests for icon rendering (`weatherIconOverview.test.tsx`, etc.) continue to
  pass unmodified for periods without a `symbol_code`; new cases confirm two SMHI codes that
  previously collapsed to the same icon (e.g. 9 vs. 10) now render visibly different `src`/`alt`.

## Manual validation

1. `npm run dev`, open the dashboard for a Swedish location (SMHI-covered) with a live forecast.
2. Compare a "moderate" and a "heavy" period of the same precipitation type (e.g. two rain-showers
   hours).
   - **Expected**: Distinct icons, matching `docs/logos/smhi_symbols_ver2_icons/09-moderate-rain-
     showers.png` vs. `10-heavy-rain-showers.png`.
3. Compare a "showers" period against a "continuous" period of the same intensity (e.g. code 18
   "light rain" vs. code 8 "light rain showers").
   - **Expected**: Distinct icons, matching the reference set.
4. Switch to a location/source without SMHI's own forecast (or an observed/historical period).
   - **Expected**: Icon still renders, using today's existing logic — unchanged from before this
     feature.

## Notes

- No new npm dependency — icons are static image assets, rendered via a plain `<img>` (or inline
  `background-image`), same bundling approach as other static assets already in `src/`.
- The 27 initial icon files live at `docs/logos/smhi_symbols_ver2_icons/` (source) and will be
  copied into the app's own asset directory during implementation; replacing any one file later
  requires no code change (`research.md` §3, spec User Story 3).
