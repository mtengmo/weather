# Contract: Hide 0% Rain Chance (US3)

## `src/components/WeatherIconOverview.tsx`

See `data-model.md` for the exact JSX condition change (adds `&& point.chanceOfRain > 0`).

**Test-relevant**: a period with `chanceOfRain: 0` must render no `.weather-timeline-bar-chance`
element at all; a period with `chanceOfRain: 1` (or higher) must continue to render it, unchanged.

## No changes to

- The Rain row's bar-baseline layout (021-dashboard-polish-round-six) — the chance-of-rain
  `<span>` still only ever appears inline within the value text when present at all; hiding it for
  `0` doesn't reintroduce the earlier baseline-misalignment defect, since a hidden `<span>` is
  identical (for layout purposes) to the existing "absent" case already handled correctly.
