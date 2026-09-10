# Research: Debug Section With Raw Source Responses

## 1. Where each source's full raw response is already available

**Decision**: Each provider's internal fetch function already parses the full raw JSON before reducing it to just the fields it needs — that full parsed object is simply discarded today rather than being propagated. Thread it through instead of re-fetching:
- `smhiProvider.ts`'s `fetchForecastTimeSeries` parses the full `SmhiForecastResponse` (`data`) before returning only `{ timeSeries, issuedAt }`.
- `openMeteoProvider.ts`'s `fetchHourlyPoints` parses the full `OpenMeteoHourlyResponse` (`data`) before returning only a mapped `WeatherObservation[]`.
- `metNoProvider.ts`'s `fetchTimeSeries` parses the full `MetNoResponse` (`data`) before returning only `{ timeseries, issuedAt }`.

**Rationale**: Confirms FR-002 (no extra network request) is achievable — the raw response already exists in memory at the exact moment each provider's normal fetch runs; it just needs to survive one more step up the call chain instead of being dropped.

## 2. Carrying it up to the UI without changing any existing function's return shape

**Decision**: Each provider keeps a module-level "last raw forecast response" value, set as a side effect at the exact point its forecast-fetch function already parses the response (`fetchForecastTimeSeries`/`fetchHourlyPoints`/`fetchTimeSeries`), exposed via a new exported getter (`getLastRawForecastResponse(): unknown`). `getForecastOnly`'s own return shape is untouched in all three providers. `weatherApi.ts`'s `getMultiSourceForecast` calls each provider's getter immediately after its own `Promise.allSettled` resolves (same request cycle — nothing re-fetches), and adds the result as `rawResponse` on the `MultiSourceForecastEntry` it already builds for that source.

**Rationale**: `openMeteoProvider.getForecastOnly` alone is mocked as a plain array (`mockResolvedValue([])` / `mockResolvedValue([forecastPoint()])`) in a dozen-plus existing test cases across `openMeteoProvider.test.ts` and `weatherApi.test.ts`; changing its return shape to an object would force updating every one of them for a feature that doesn't need to touch that contract at all. A module-level "last response" getter is a small, precedented pattern already used in this codebase (`smhiProvider.ts`'s own `stationListCache`) and completely decouples this feature from every existing caller/mock of `getForecastOnly`.

**Alternatives considered**:
- *Change `getForecastOnly` to return `{ observations, raw }` everywhere*: rejected — the test-ripple cost above, for a debug-only feature.
- *A separate `rawResponses` array on `getMultiSourceForecast`'s return, always exactly 3 entries*: rejected — would still require changing `getMultiSourceForecast`'s return shape, touching its own callers/tests, when the getter approach needs neither.

## 3. Where the debug section lives

**Decision**: A new `DebugPanel` component, rendered in `App.tsx` right before `<Footer>` (bottom of the page, per the request), receiving the same `multiSourceForecast` array already destructured from `useObservationData` in `App.tsx` — no new prop threading beyond one new component invocation.

**Rationale**: `multiSourceForecast` is already available in `App.tsx`'s scope (used today only to pass to `WeatherIconOverview`); rendering a second consumer of the same already-fetched data is exactly the "reuse, don't refetch" requirement.

## 4. Rendering three sources, one of which may be absent

**Decision**: Iterate a fixed, ordered list of the three known sources (`smhi`, `open-meteo`, `met-no`); for each, look up a matching entry in `multiSourceForecast` by `.source` and render its `rawResponse` as formatted JSON (`<pre>{JSON.stringify(entry.rawResponse, null, 2)}</pre>`), or an explicit "No data" line when no matching entry exists.

**Rationale**: Directly satisfies FR-004 (labeled by source) and FR-005 (missing source shown as such, not omitted).
