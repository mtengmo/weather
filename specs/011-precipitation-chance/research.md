# Research: Chance of Rain Alongside Precipitation Amount

## §1. Which providers expose a precipitation-probability field

**Decision**: Read Open-Meteo's `precipitation_probability` hourly variable when present; do not
add any equivalent field for SMHI.

**Rationale**: Open-Meteo's `/v1/forecast` hourly endpoint (already used by `openMeteoProvider.ts`
for observed/forecast fallback and as the sole source when SMHI has no nearby station) exposes an
`precipitation_probability` array alongside `precipitation`, `temperature_2m`, etc. — a plain
integer percent (0-100), no unit conversion needed. SMHI's point-forecast API
(`opendata-download-metfcst.smhi.se/api/category/snow1g/version/1`), already integrated in
`smhiProvider.ts`'s `SmhiForecastData` interface, was confirmed live during 008's research (§2)
to expose `air_temperature`, `wind_speed`, `wind_from_direction`, `wind_speed_of_gust`,
`precipitation_amount_mean`, and `cloud_area_fraction` — no probability-shaped field. SMHI's own
`snow1g`/`pmp3g`-family point forecasts are a single deterministic model run per parameter, not an
ensemble/probabilistic product, so there is no equivalent value to surface even under a different
field name.

**Alternatives considered**:
- *Add a second SMHI product/endpoint that does expose probability* — rejected: SMHI Open Data
  does not publish a probability-of-precipitation product for point forecasts at the time of this
  research; would require a new external dependency for a single field, contradicting the
  established "no new providers" principle reused from 005-010.
- *Derive a synthetic probability from SMHI's own data (e.g. `pmax`/`pmin` spread)* — rejected: SMHI's
  point-forecast API doesn't return `pmax`/`pmin` percentile fields (only `precipitation_amount_mean`),
  and any locally-derived "probability" would be a fabricated estimate presented as if it were the
  provider's own figure — conflicts with this app's existing gap-vs-fabrication convention
  (established across 005/008/009's specs: never fabricate a data point that looks like a real
  provider value).

## §2. Whether Open-Meteo returns probability for past/observed hours

**Decision**: Ignore whatever the API returns for past hours; gate display purely on this app's own
`isForecast` flag, not on whether the raw field happens to be non-null.

**Rationale**: Open-Meteo's forecast endpoint can return non-null `precipitation_probability`
values for `past_days` hours too (it's a rerun of the same forecast model over recent history, not
a measurement), which would violate spec FR-004 ("observed columns MUST NOT display a
chance-of-rain percentage, since a measured amount is not a probability") if displayed naively.
This app already has an established, tested `isForecast` flag on every `WeatherObservation`
(005-add-weather-forecast) that authoritatively marks which points are actually forecast — gating
on that flag (rather than on field presence) guarantees FR-004 regardless of what the raw API
response contains.

**Alternatives considered**:
- *Trust the API's own null/non-null pattern for past hours* — rejected: not guaranteed stable
  across Open-Meteo API versions/model reruns, and the app already has a more reliable signal.

## §3. Daily aggregation approach (resolved by Clarifications, 2026-09-02)

**Decision**: `toDailyAggregates` computes `chanceOfRainMax` as the maximum `chanceOfRain` value
among a bucket's observations that are both forecast (`isForecast === true`) and non-null,
mirroring the existing `windGustHigh`/`windHigh` "bucket maximum" pattern already established in
`dailyAggregation.ts` (008).

**Rationale**: User-selected during `/speckit-clarify` — matches this app's existing convention for
daily "peak" figures and better answers the practical "should I expect rain today" question than an
average would (a short, intense afternoon shower matters more to a user's plans than the day's mean
probability, which would dilute it toward a low, easy-to-miss number).

**Alternatives considered**: Average (rejected per clarification — dilutes short high-risk windows);
omit from the 7-day view entirely (rejected per clarification — narrows the feature's value for a
view where a day-ahead "will it rain" signal is arguably even more useful than hour-by-hour).

## §4. Rendering approach for the secondary value

**Decision**: Extend the existing `BarRow` component (`WeatherIconOverview.tsx`) to render an
optional secondary line beneath each bar's value label, sourced from a new optional
`chanceOfRain` field on `TimelineRowPoint` — rather than introducing a new row kind or a
parallel row.

**Rationale**: `BarRow` is currently generic (used for precipitation, snow, and gust rows) and
already iterates `row.points` per column; adding one more optional, nullable field to
`TimelineRowPoint` (following the same pattern already used for the wind row's optional
`direction` field, 008) is the smallest change that satisfies FR-005's "visually secondary,
smaller" requirement without duplicating the bar-column layout logic in a new component.

**Alternatives considered**:
- *A dedicated "chance of rain" row* — rejected: spec explicitly asks for the percentage
  "under the mm" within the same row, not as its own row: this would also double the vertical
  space the request was trying to enrich, not add to.
- *Tooltip/hover-only display* — rejected: this repo's established chart/timeline UX principle
  (spec 008 FR-005 precedent) is that values must be readable directly without hovering; a
  hover-only percentage would regress that principle and isn't testable via the existing
  jsdom-based integration tests.
