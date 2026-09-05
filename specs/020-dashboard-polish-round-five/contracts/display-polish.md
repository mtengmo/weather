# Contract: Weekly Strip Cap, Forecast Freshness, Details Icons (US5, US6, US7)

## `src/components/WeatherIconOverview.tsx` — `weeklyDays` re-anchored (US5)

See `data-model.md`'s `windowAroundToday` helper. Only the call site feeding
`<WeeklyForecastStrip days={weeklyDays} .../>` changes — `buildDailyTimelineData` (the main
7-day timeline) keeps its existing `capForecastReach` call from 019 unchanged.

## `src/services/format.ts` — `dataSourceDisclosure` reworded (US6)

See `data-model.md` for the exact new body. Signature (`series`, `lastUpdated`) is unchanged from
019 — only the returned string's wording changes, dropping the per-mode forecast-source naming.

## `src/components/Footer.tsx`

No change — its `dataSourceDisclosure(series, lastUpdated)` call site is unaffected by the
wording change inside that function.

## `src/components/ObservationDetails.tsx` — Condition column (US7)

See `data-model.md` for the exact `<th>`/`<td>` additions and the `deriveWeatherCondition`/
`WEATHER_ICONS` pairing. New imports: `deriveWeatherCondition` from `../services/weatherCondition`,
`WEATHER_ICONS` from `./weatherIcons`.

## No changes to

- `WeeklyForecastStrip.tsx`, `TodaySummaryCard.tsx` themselves — only the `weeklyDays` array
  passed into the strip changes shape (fewer/differently-selected entries); the components'
  own rendering logic is untouched.
- `ObservationChart.tsx` — no icon added there per research.md §7's explicit scoping to "the
  details pages."
