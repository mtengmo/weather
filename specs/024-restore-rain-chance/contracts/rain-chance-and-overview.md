# Contract: Rain-Chance Restoration & Overview Annotation Removal (US1, US2)

## `src/services/smhiProvider.ts` (US1)

See `data-model.md` for the exact `probability_of_precipitation` field addition and
`buildForecastHourlySeries` change.

**Test-relevant**: a mocked SMHI forecast entry with `probability_of_precipitation: 70` must
result in that observation's `chanceOfRain` equaling `70`. An entry with the field absent must
result in `chanceOfRain: null` — never fabricated.

## `src/components/WeatherIconOverview.tsx` (US2)

See `data-model.md` for the exact JSX removing the `(avg...)` branch.

**Test-relevant**: a point with `combined: true` (any `combinedSourceCount`) must render only its
plain value (or its high/low annotation, if `highLowVisible` and high/low are present) — never
any `(avg`-prefixed text.

## No changes to

- `mergeMultiSourceIntoTimelinePoints`, `TimelineRowPoint.combined`/`combinedSourceCount` — still
  computed exactly as before; only the Overview's own text rendering stops reading them for this
  purpose.
- `ObservationChart.tsx`'s per-source lines and "Combined average forecast" legend entry
  (022-met-forecast-source, US4) — a different view, unaffected by this change.
- The Rain row's inline layout (`.weather-timeline-bar-chance` nested inside
  `.weather-timeline-bar-value`, from 021-dashboard-polish-round-six) — untouched; this feature
  only restores the *value* flowing into that already-correct layout.
