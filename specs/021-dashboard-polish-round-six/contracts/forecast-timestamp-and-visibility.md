# Contract: Real SMHI Timestamp and Visible Cross-Source Blending (US1, US2)

## `src/services/smhiProvider.ts` (US1)

See `data-model.md` for the exact `SmhiForecastResponse.referenceTime` field rename and the
corresponding change in `fetchForecastTimeSeries`. No other function in this file changes —
`getObservations`'s own threading of `forecastIssuedAt` onto the returned `ObservationSeries`
(019/020) is already correct and needs no change; it was only ever fed the wrong field name.

**Test-relevant**: a mocked SMHI forecast response with `referenceTime: "2026-09-05T16:30:00Z"`
must result in `getObservations(...)`'s returned series having
`forecastIssuedAt === "2026-09-05T16:30:00Z"`.

## `src/services/format.ts` (US2)

See `data-model.md` for `dataSourceDisclosure`'s new `combined` parameter and the
`"SMHI + Open-Meteo forecast"` wording it adds when true.

## `src/components/Footer.tsx` (US2)

See `data-model.md` for the new `combinedForecast` prop and its threading into
`dataSourceDisclosure`.

## `src/App.tsx` (US2)

```tsx
<Footer series={series} lastUpdated={lastUpdated} combinedForecast={multiSourceForecast.length > 1} />
```

## No changes to

- `WeatherIconOverview.tsx`'s `mergeMultiSourceIntoTimelinePoints` call and the `(avg)` marker
  rendering (`LineRow`) — already correct since 020; this round only adds a second, persistent
  confirmation in the footer, not a change to the per-period marker itself.
- `MultiSourceForecastEntry`, `ObservationSeries.forecastIssuedAt` — shapes unchanged; only the
  value that fills `forecastIssuedAt` becomes correct.
