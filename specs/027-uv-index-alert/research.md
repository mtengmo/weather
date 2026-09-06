# Research: UV Index Risk Indicator

## §1 — Data source and unit conversion

**Decision**: Use SMHI's STRÅNG analysed-irradiance product, category `strang1g`, parameter
`116`, via a point query (`geotype/point/lon/{lon}/lat/{lat}/parameter/116/data.json?from=YYYYMMDD`) —
the exact endpoint the user supplied. A live sample request (`lon=16/lat=58`, `from=20260905`)
returned an array of `{ date_time, value }` hourly entries; the value peaked at 76.7 around local
solar noon and was 0 overnight — consistent with parameter 116 being erythemally-weighted UV
irradiance in mW/m², not the UV Index itself.

**Conversion**: The standard formula (used by WHO/meteorological services worldwide) is
`UV Index = irradiance_mW_per_m2 / 25`. Applied to the sample peak: `76.7 / 25 ≈ 3.07` — a
plausible moderate UV Index for Sweden in early September, which cross-checks the conversion.

**Rationale**: Reuses the exact endpoint/parameter the user already pointed at, and the
resulting UV Index values fall in a sane, externally-verifiable range — no separate UV-specific
API or client library needed, consistent with every other provider in `src/services/`, which is
a thin `fetch` wrapper over a public JSON endpoint.

**Alternatives considered**:
- A third-party UV Index API (e.g. OpenUV) — rejected: adds a new external dependency/API key
for a value SMHI already publishes for the app's existing coverage area, and the app has no
other paid/keyed API today.
- Deriving UV risk from `cloudCoverPercent` + a clear-sky model — rejected: STRÅNG's own
analysis already accounts for real cloud cover (its values are visibly near-zero during an
overcast stretch and it's the authoritative product for this exact purpose); reinventing that
modeling client-side would be both more complex and less accurate.

## §2 — Only analysed data exists, never forecast

**Decision**: STRÅNG (`metanalys` = "meteorological analysis") only publishes analysed values
for periods that have already occurred — confirmed by the sample request itself (`from` one day
in the past returned real hourly values with no gap up to the most recent complete hour, and
nothing for hours still in the future). The UV risk flag is therefore only ever set for
observed/already-elapsed periods, mirroring `027-uv-index-alert`'s own spec Assumptions.

**Rationale**: No workaround is attempted (e.g. inferring a "likely" UV Index for future hours
from a clear-sky model) — the spec explicitly scopes this to real analysed data only, avoiding
exactly the kind of fabricated-data risk this codebase's existing conventions
(`toDailyAggregates`'s "never fabricate a day beyond forecast reach," `capForecastReach`'s own
doc comments) already treat as a hard rule.

## §3 — Fetch window and merging into `TimelinePeriod`

**Decision**: `smhiProvider.getUvIndex(location, window)` requests `from=<UTC date N days
before now>` (`N` = the same `WINDOW_HOURS`-derived day count `buildHourlySeries` already uses
per `ObservationWindow`), parses the flat `{date_time, value}` array into an `hourKey -> UV
Index` map using the exact same `Math.floor(date / 3600_000)` bucketing convention
`byHour`/`buildHourlySeries` already use, and returns just the set of "risky" hour keys (UV
Index ≥ 6) — not the raw readings — since the raw number is never displayed (spec Assumptions:
"No numeric display").

`timelineData.ts`'s three builders (`buildHourlyTimelineData`, and `daysToTimelineData` for both
daily and sub-day buckets) each already map an hour/period to a `TimelinePeriod`; each is
extended to look up whether any hour within that period's span is a risky hour, setting a new
`uvRisk: boolean` field. For the hourly view this is a single-hour lookup; for the 3-day/7-day
views (each period spans many hours) this becomes an `.some(...)` over the period's own hour
range — the "peak reading" rule from the spec's Assumptions, expressed as "was *any* hour in
this period risky," which is equivalent since the flag is already boolean (no raw value to
average).

**Rationale**: Reuses the existing hour-bucketing convention exactly (no new time-alignment
logic to get subtly wrong), and keeps the data crossing the service boundary reduced to the one
bit of information the UI actually needs — smaller payload through `useObservationData`'s state,
and no risk of a raw UV number leaking into the UI by accident later.

**Alternatives considered**:
- Passing the raw per-hour UV Index numbers all the way to `WeatherIconOverview` and computing
"risky" at render time — rejected: spreads the threshold decision (FR-003) across two layers
for no benefit, and keeps a numeric value alive in state that the spec deliberately says should
never be displayed.

## §4 — Fetch orchestration: independent, non-blocking

**Decision**: `useObservationData` gets a third independent `useEffect`, fetching UV risk data
for the current `location`/`window` the same way `025-reduce-api-requests` already split
nearby-station fetching into its own effect — a fetch failure or a non-Swedish location simply
resolves to `[]` (no risky hours) and never touches `series`/`weeklySeries` state.

**Rationale**: Matches this codebase's own established pattern (independent effects per
data source, `Promise.allSettled`-style graceful degradation already used in
`getMultiSourceForecast`) rather than inventing a new orchestration style; guarantees FR-006
("failure to load UV data must not delay the rest of the overview") structurally, not just by
convention.

**Alternatives considered**:
- Folding the UV fetch into the existing primary `Promise.all` in the first effect — rejected:
would make the primary series wait on a fourth SMHI-only fetch even for non-Swedish locations
(coverage-checked separately, an extra round trip), and a slow/failed UV fetch would delay
`setSeries`, directly violating FR-006.

## §5 — Coverage gating

**Decision**: Reuse `smhiProvider.isCovered` (the existing 50 km-of-active-station check already
gating nearby-station comparisons and the primary SMHI/Open-Meteo fallback decision) to decide
whether to attempt the UV fetch at all.

**Rationale**: STRÅNG's own grid actually extends slightly beyond `isCovered`'s station-based
radius, but reusing the exact same gate every other SMHI-only feature in this app already uses
keeps the UV indicator's coverage boundary predictable and consistent with the rest of the UI
(a location either has "the SMHI features" or it doesn't) rather than introducing a second,
subtly different definition of "in Sweden."

**Alternatives considered**:
- A separate point-in-Sweden-bounding-box check — rejected: adds a second coverage definition to
maintain, for a difference in behavior (a sliver of edge locations) not worth the inconsistency.
