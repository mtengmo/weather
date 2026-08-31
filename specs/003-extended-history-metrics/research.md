# Phase 0 Research: Extended History Window, Additional Weather Metrics, and Display Controls

## 1. 30-day observation window (FR-001, FR-002)

**Decision**: Add `"last-30-days"` as a third `ObservationWindow` value. It reuses the existing daily-aggregation shape (one point per day: high/low/average temperature, total precipitation) already used for `"last-7-days"`, just for 30 rolling 24h buckets instead of 7. No new SMHI period is needed: `latest-months` (already used for the 7-day window, research.md §1 of `001-weather-history-locations`) covers a trailing ~4 months, comfortably including 30 days. Open-Meteo's `past_days` parameter is raised to `31` for this window (one more than the 30 days needed, mirroring the existing "n+1" pattern already used for the 7-day window's `past_days: 8`).

**Rationale**: Reuses every existing mechanism (rolling-bucket aggregation, gap handling, "up to N stations" comparison, details table) — the only real change is a bucket-count parameter, not a new code path. Both providers already support windows this long without new endpoints or auth.

**Implementation note**: `services/dailyAggregation.ts`'s `toDailyAggregates` hardcodes `BUCKET_COUNT = 7`; it becomes a parameter (`toDailyAggregates(observations, bucketCount)`), called with `7` or `30` depending on the active window. `WINDOW_HOURS`/`SMHI_PERIOD` maps in both providers gain a `"last-30-days"` entry.

**Alternatives considered**: A separate "monthly" aggregation path — rejected, no functional difference from parameterizing the existing bucket count.

## 2. Sourcing wind speed and cloud coverage (FR-003, FR-004, FR-006a)

**Decision**: Extend `WeatherObservation` with two new optional fields, `windSpeed` (m/s) and `cloudCoverPercent` (0-100), fetched in parallel with temperature/precipitation from both providers:

- **SMHI**: parameter `4` ("Vindhastighet", hourly 10-min mean, already in m/s — no conversion) for wind; parameter `16` ("Total molnmängd", hourly instantaneous) for cloud cover. Each parameter is queried against its own nearest active station (same per-parameter nearest-station pattern already used for temperature (`1`) and precipitation (`7`) in `smhiProvider.getObservations` — not every station reports every parameter).

  **Correction (2026-08-31, post-implementation verification)**: this research originally assumed parameter 16 reports oktas (0-8, the traditional meteorological cloud-cover scale) and specified an `okta * 12.5` conversion. Live-testing against the real SMHI API during implementation showed each parameter's metadata response includes its actual `unit` field, and parameter 16's is `"procent"` — SMHI already reports this parameter in percent (0-100), not oktas. The `okta * 12.5` conversion was removed; `cloudCoverPercent` now takes the raw SMHI value unchanged, same as it always did for Open-Meteo's already-percent `cloud_cover`. Lesson: prefer fetching one live parameter response (which includes `unit`) over general web search when a data source's own API can confirm units directly.
- **Open-Meteo**: hourly variables `wind_speed_10m` and `cloud_cover`, added to the existing `hourly` query param list; `wind_speed_unit=ms` is added to the request so wind arrives already in m/s (Open-Meteo defaults to km/h otherwise) — `cloud_cover` is already a 0-100 percentage, no conversion needed.

Confirmed via SMHI's parameter list (`opendata-download-metobs.smhi.se/api/version/1.0.json`) and Open-Meteo's docs (`open-meteo.com/en/docs`), 2026-08-31.

**Rationale**: Keeps both providers normalized to the same `WeatherObservation` shape (m/s, 0-100%) so nothing downstream needs to know which provider answered, consistent with the existing temperature/precipitation normalization (`001-weather-history-locations` research.md §1).

**Alternatives considered**: Leaving cloud cover in oktas (SMHI's native unit) — rejected, would make Open-Meteo and SMHI values incomparable and contradicts the spec's Key Entities ("cloud coverage percentage").

## 3. Metric tabs and chart type per metric (FR-003, User Story 2/3)

**Decision**: Four tabs, mapped to chart type as follows:

| Tab | Chart type | Data shown |
|---|---|---|
| Temperature (default) | Line (temperature) + Bar (precipitation) | Unchanged from today — the existing combined view |
| Rain | Bar | Precipitation only, standalone (extends the existing precipitation bar to its own tab) |
| Wind | Line | Wind speed |
| Cloud coverage | Line | Cloud coverage percentage |

**Rationale**: Precipitation is naturally additive (a daily *total* makes sense as a bar) — the only metric that was already bar-based. Wind speed and cloud coverage are continuous, non-additive readings (an *average*, like temperature, not a *sum*), so they follow temperature's existing line-chart + average-based daily-aggregation pattern rather than introducing a new "bar-with-average" concept. This means **FR-006's "bar chart gets comparison-station bars too" (User Story 3) applies to the Rain tab** — the only bar-based metric — extending its existing single (primary-only) bar to one bar per shown station, grouped side-by-side by Recharts' default multi-`<Bar>` behavior (no `stackId`).

**Alternatives considered**: Rendering cloud coverage as a bar (reads like "amount of sky covered") — rejected in favor of consistency with temperature/wind's line treatment, since cloud coverage is a point-in-time percentage, not something that sums meaningfully across a day; an *average* cloud-cover line for the 7-/30-day windows is more informative than a meaningless "total coverage" bar.

## 4. Daily aggregation for wind and cloud coverage (FR-001, User Story 2)

**Decision**: Extend `DailyAggregate` with two new optional fields, `windAverage` and `cloudAverage` (both `number | null`), computed the same way as `average` for temperature (mean of non-null hourly readings in the bucket, `null` if the bucket has none — preserving the existing gap-propagation rule, `001-weather-history-locations` FR-010/FR-022).

**Rationale**: Reuses the exact existing gap/averaging logic in `toDailyAggregates`, just for two more fields, rather than introducing a parallel aggregation function.

## 5. Nearby-station count control (FR-007, FR-007a, FR-008, FR-009, FR-010, User Story 4)

**Decision**: 
- Lower the hardcoded `NEARBY_STATION_COUNT = 5` in `services/weatherApi.ts` to a caller-supplied parameter, `getNearbyStationSeries(location, window, count)`, with `count` ranging 0-4.
- Add a new persisted preference, `NearbyStationCountPreference` (0-4, default 4), following the exact same shape as the existing `theme`/`unit` preferences: a small service (`services/nearbyStationCount.ts`) with `get`/`set` functions backed by a dedicated `localStorage` key, plus a `useNearbyStationCountPreference()` hook.
- `count === 0` short-circuits `getNearbyStationSeries` to return `[]` immediately (no station-list fetch at all — cheaper than fetching then discarding).
- The "up to N, show fewer if unavailable" behavior (already in `smhiProvider.getNearestStations`/`weatherApi.getNearbyStationSeries`) is unchanged, just parameterized by the user's chosen count instead of the fixed `5`.

**Rationale**: Mirrors the existing preference pattern exactly (localStorage + hook + UI control), so there's no new architectural concept — just one more small preference alongside theme and unit. Short-circuiting at 0 avoids a wasted network round-trip.

**Impact on existing behavior**: The previous fixed maximum of 5 (`001-weather-history-locations` FR-020) is superseded by FR-007's 0-4 range, per the resolved clarification.

## 6. Decimal rounding (FR-011, User Story 5)

**Decision**: Add a single shared formatting helper, `services/format.ts`, exporting `formatValue(value: number | null, decimals = 1): string` (returns `"—"` for `null`, otherwise `value.toFixed(decimals)`). Two call sites change:

- `ObservationDetails.tsx`'s `formatTemperature`/`formatPrecipitation` are consolidated to use `formatValue(..., 1)` — this also **fixes an existing inconsistency**: `formatPrecipitation` currently uses `toFixed(2)`, not `toFixed(1)`, so today's precipitation column already violates the "one decimal place" rule this feature establishes as a formal requirement.
- `ObservationChart.tsx`'s `<Tooltip>` gets a `formatter` prop (`(value) => formatValue(Number(value), 1)`) so hover tooltips — which currently show Recharts' raw unformatted numbers (e.g., `17.7541666666666`) — are rounded the same way.

**Rationale**: One helper, two call sites, no duplicated rounding logic — satisfies FR-011's "applied uniformly across all metrics and windows" by construction (every numeric display routes through the same function).

## 7. Fixed metric default instead of locale detection (FR-012, FR-013, User Story 6)

**Decision**: In `services/units.ts`, `getUnitPreference()`'s fallback (when no `localStorage` value is stored) changes from `getDefaultUnitSystem(navigator.language)` to a hardcoded `"metric"`. The `getDefaultUnitSystem`/`IMPERIAL_LOCALE_REGIONS` locale-detection code is removed as now-unused (no other caller). The manual toggle and persisted-preference mechanism (`setUnitPreference`, `UnitToggle`) are unchanged — FR-013 is satisfied by construction since nothing about *storing/reading* a manual choice changes, only the fallback when nothing is stored.

A new conversion function, `convertWindSpeed(ms: number | null, to: UnitSystem): number | null`, is added alongside the existing `convertTemperature`/`convertPrecipitation`, converting to mph for `"imperial"` (`ms * 2.23694`) — needed so the existing metric/imperial toggle applies consistently to the new wind metric (not explicitly required by the spec, but a direct consequence of wind now being a displayed metric under the existing unit-toggle system).

**Rationale**: Smallest possible change — one fallback value replaced, dead code removed, one new conversion function added following the exact shape of the two that already exist.

**Alternatives considered**: Keeping locale detection as a secondary fallback behind the new metric default — rejected, the resolved clarification (Q3, Option A) explicitly said to replace locale detection entirely.
