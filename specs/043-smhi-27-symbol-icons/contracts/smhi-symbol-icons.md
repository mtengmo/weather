# Contract: SMHI symbol-code icon lookup (US1, US2, US3)

## `SMHI_SYMBOL_ICONS` lookup table

**Contract**: `src/components/smhiSymbolIcons.ts` exports a `Record<number, { src: string; label:
string }>` with exactly one entry per integer 1 through 27, matching SMHI's own published
`symbol_code` meanings. Never partially populated; a build-time or unit-test check confirms all 27
keys exist.

## Shared icon-resolution helper (e.g. `ConditionIcon` component or `resolveConditionIcon` function)

**Contract**: Given a period's data (including the optional `smhiSymbolCode` from
`WeatherObservation`/aggregate types, plus the existing fields `deriveWeatherCondition` needs):

- If `smhiSymbolCode` is a number present as a key in `SMHI_SYMBOL_ICONS`, return that entry
  (`{src, label}`) — rendered as an `<img src={...} alt={label} />` (or `aria-label`, matching
  existing per-context conventions).
- Otherwise, call the existing `deriveWeatherCondition(...)`; if it returns a `WeatherCondition`,
  return `WEATHER_ICONS[condition]` (rendered as `<Icon aria-label={label} />`, exactly as today);
  if it returns `null` (not enough data), return `null` (exactly as today — no icon renders).

Never throws. Every call site that previously did its own `WEATHER_ICONS[condition]` lookup switches
to this helper instead, with no other change to its own rendering (sizing, color classes, etc.).

## Consumers (unchanged contracts, updated lookup source)

`WeatherIconOverview.tsx` (`ConditionRow`, the header/Today-card condition source),
`WeeklyForecastStrip.tsx`, `TodaySummaryCard.tsx`, `ObservationDetails.tsx`: each keeps its
existing size/CSS-class/aria conventions around whatever `{src|Icon, label}` the shared helper
returns — none of their own props or behavior contracts change.
