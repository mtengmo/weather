# Contract: Lazy Nearby-Station Fetching & SMHI Forecast-Only Path (US1, US2)

## `src/hooks/useObservationData.ts` (US1)

See `data-model.md` for the two-effect split. **Test-relevant**: with
`includeNearbyStations: false`, `getNearbyStationSeries` must never be called, and
`nearbyStations` must be `[]`. With `includeNearbyStations: true`, it must be called with the
current `location`/`window`/`nearbyStationCount`. Flipping `includeNearbyStations` from `false` to
`true` must not cause `getObservations`/`getMultiSourceForecast` to be called again for data
already fetched under the same `location`/`window`.

## `src/App.tsx` (US1)

See `data-model.md` for `hasOpenedDetails`. **Test-relevant**: opening the Details or graph view
for the first time must result in `nearbyStations` becoming populated (previously empty);
returning to the Overview afterward must not clear it or trigger a re-fetch.

## `src/services/smhiProvider.ts`, `src/services/weatherApi.ts` (US2)

See `data-model.md` for `getForecastOnly` and the `getMultiSourceForecast` call-site swap.
**Test-relevant**: mocking `smhiProvider.getForecastOnly` (not `getObservations`) must be
sufficient to control `getMultiSourceForecast`'s SMHI branch; `smhiProvider.getObservations`
(the full 6-parameter pipeline) must NOT be called by `getMultiSourceForecast` at all.

## No changes to

- `openMeteoProvider.getForecastOnly`, `metNoProvider.getForecastOnly` — already the correct
  shape; `smhiProvider.getForecastOnly` is added to match them, not to change them.
- `smhiProvider.getObservations`'s own behavior or callers other than `getMultiSourceForecast` —
  the primary series and weekly series fetches are unchanged.
- `ObservationChart.tsx`/`ObservationDetails.tsx`'s own rendering of `nearbyStations` — they
  already handle an empty array gracefully (e.g., while the primary series itself is still
  loading), so no rendering-code change is needed for the lazy-fetch behavior.
