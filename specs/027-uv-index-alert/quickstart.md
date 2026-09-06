# Quickstart: UV Index Risk Indicator

## Prerequisites

- `npm install` already run.
- A summer/midday time window helps (UV Index ≥ 6 is realistically only reached roughly
May–August around midday in Sweden) — if testing outside that window, temporarily lower the
threshold constant locally to confirm the badge *can* render, then revert before committing.

## Automated validation

```bash
TZ=UTC npx vitest run
```

Expect new/updated tests covering:
- `smhiProvider.getUvIndex` — irradiance-to-UV-Index conversion and the ≥6 threshold, including
a fixture with a realistic STRÅNG-shaped response (peak mid-day value, zero overnight).
- `timelineData.ts` builders — a period whose hour(s) fall in a risky set gets `uvRisk: true`;
every other period (including any forecast period, regardless of its own UV data) gets `false`.
- `WeatherIconOverview.tsx`'s `ConditionRow` — badge renders only when `uvRisk` is true, and the
existing `aria-label` gains the UV mention in that case only.

## Manual / live validation (Playwright, per this session's established practice)

1. `npm run dev`.
2. Pick a Swedish, currently-sunny, midday location (e.g. search "Stockholm" or reuse the
"Uppsala Aut" station used throughout this session's other live checks).
3. On the 24-hour overview, confirm: any already-elapsed midday hour shows the small UV badge
on its weather icon; every forecast (dashed, future) hour shows no badge, even if sunny; a
non-Swedish location (e.g. search "Paris") shows no badge anywhere and no console errors.
4. Confirm the 3-day and 7-day views show the same badge on any day whose peak analysed hour was
risky, with no other visual change to those views.
5. Take a screenshot; confirm no layout shift versus a pre-feature screenshot of the same
location/time (same icon size/position — only the small badge is new).
