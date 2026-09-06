# Contract: MET Norway as a Third Forecast Source (US1)

## `src/services/metNoProvider.ts` (new)

See `data-model.md` for the full interface shapes and `getForecastOnly` implementation sketch.

**Test-relevant**: a mocked MET Norway response with `properties.meta.updated_at:
"2026-09-06T08:00:00Z"` must result in the returned `{ issuedAt }` equaling that value verbatim.
A response with `next_1_hours.summary.symbol_code: "heavyrainandthunder"` must classify that
observation's `symbolCondition` as `"thunderstorm"` (matches `"thunder"` before any other
substring). A response with no `properties.meta.updated_at` at all must return `issuedAt: null`
(never fabricated). A fetch that throws or returns a non-ok response must degrade to
`{ observations: [], issuedAt: null }`, matching `smhiProvider.ts`/`openMeteoProvider.ts`'s
existing best-effort-degradation contract — never propagating an error that would fail the whole
multi-source fetch.

## `src/services/weatherApi.ts`

`MultiSourceForecastEntry.source` gains `"met-no"`. `getMultiSourceForecast` fetches SMHI,
Open-Meteo, and MET Norway concurrently via `Promise.allSettled` (unchanged pattern, one more
branch) and only includes an entry for a source that returned 1+ forecast observations — a source
returning zero observations (coverage gap, request failure, or a window with no forecast at all)
is silently excluded, exactly as SMHI/Open-Meteo already are.

## No changes to

- `smhiProvider.getObservations`'s own primary-series fetch path (`weatherApi.getObservations`) —
  MET Norway is a `getMultiSourceForecast`-only addition; it does not become a primary/fallback
  observation source the way SMHI/Open-Meteo already are, since this feature is scoped to
  forecast blending, not primary-series sourcing (spec's User Story 1 talks only about forecast
  blending).
- `isCovered()` / the 50km station-based coverage gate — unrelated to MET Norway, which has no
  coverage gate of its own (research.md §1).
