# Phase 0 Research: Timeline Weather Dashboard Redesign

## 1. Rendering architecture: one shared grid, not stacked chart instances

**Decision**: Render the entire timeline as a single CSS Grid (`grid-template-columns: repeat(<periodCount>, 1fr)`), where every row (condition icons, temperature, precipitation, wind, cloud cover, and any enrichment rows) is a grid row sharing that same column structure. For the two "line" rows (temperature, cloud cover), draw the connected line as one `<svg>` overlaid across the row's full width, with point coordinates computed as percentages of the row's width/height (`x = (columnIndex + 0.5) / periodCount * 100%`) — the same coordinate math every other row's cells already use implicitly via the grid — rather than each row managing its own independent axis.

**Rationale**: FR-002/FR-003 require every row to align to *exactly* the same time positions and share one "now" line. Recharts' `<ComposedChart>` instances are each independently responsive/margined; stacking several of them (one per row) cannot guarantee pixel-identical column positions between rows — a `<ResponsiveContainer>`'s internal padding/axis-label width can differ by a pixel or two between instances even with identical props, which would visibly misalign the "now" line and any vertical scan-down reading (the whole point of User Story 1). A single shared grid removes that risk entirely by construction — every row's Nth cell is *the same* grid column. As a secondary, welcome side effect: 007's `WeatherIconOverview.tsx` (already CSS Grid, no Recharts) is the only component in this app whose integration tests make real DOM assertions rather than smoke tests (005/006's chart tests can't render inside jsdom's zero-size `<ResponsiveContainer>`) — this redesign keeps that testability rather than trading it away by introducing per-row Recharts instances.

**Alternatives considered**:
- *One row per Recharts `<ComposedChart>`, stacked*: Rejected for the alignment-guarantee and testability reasons above.
- *One single wide Recharts chart with multiple Y-axes, one "axis" per metric*: Considered — Recharts does support multiple Y-axes on one chart. Rejected because condition icons and directional wind arrows aren't line/bar data Recharts renders natively (they'd need custom shape renderers per point anyway), and mixing icon rows with chart rows in one Recharts instance is significantly more complex than a grid + light SVG overlay for the two rows that actually need a connected line.
- *A `<canvas>`-based custom renderer*: Rejected — loses accessible, testable DOM nodes per cell (FR-005's "readable directly on the row" and this app's existing accessibility patterns depend on real elements, not pixels).

## 2. Wind direction and wind gusts — available from both providers already in use

**Decision**: Parse two more fields, already present in responses this app already fetches, from each provider:

- **SMHI forecast** (`snow1g`, 006): `wind_from_direction` (degrees) and `wind_speed_of_gust` (m/s) — confirmed present in a live response captured during this feature's planning, alongside the fields 005/006 already parse (`air_temperature`, `wind_speed`, etc.).
- **SMHI observations** (`metobs`): confirmed via SMHI's own parameter catalog (`https://opendata-download-metobs.smhi.se/api/version/1.0.json`) that parameter **21 ("Byvind" / gust wind, m/s, max once per hour)** exists as a fetchable station parameter, the same pattern already used for parameters 1/4/7/16 (temperature/wind/precipitation/cloud). Wind direction is available the same way (a standard SMHI station parameter).
- **Open-Meteo**: confirmed via a live request during planning that `wind_direction_10m` and `wind_gusts_10m` are valid `hourly` variables on the exact `/v1/forecast` endpoint this app already calls (same response, just more requested variables) — no new endpoint.

**Rationale**: Both wind-enrichment fields (direction, gusts) are already-available data on APIs this app already integrates with — this is additive parsing, not new integration work, keeping User Story 3's wind-gust row and the mockup's directional wind arrows well within reach without new scope risk.

## 3. Feels-like temperature: one shared formula, not a provider-native field

**Decision**: Compute feels-like locally from temperature + wind speed (+ humidity where available) using one standard formula (wind chill below ~10°C, a simplified heat index above ~27°C, plain air temperature in between — the same convention most weather services use), applied identically regardless of which provider sourced the underlying point.

**Rationale**: Open-Meteo does provide a native `apparent_temperature` hourly variable (confirmed live during planning) — but SMHI's forecast/observation APIs do not expose an equivalent field. Relying on Open-Meteo's native value for Open-Meteo-sourced points while computing a different formula for SMHI-sourced points would mean the same row uses two different definitions of "feels like" depending on which provider happened to serve a given hour — a subtle correctness/consistency problem worse than just computing it uniformly ourselves from data both providers already give us (temperature, wind speed, and — where available — humidity). This mirrors 007's `deriveWeatherCondition`, which already applies one rule set regardless of provider rather than trusting provider-specific "condition" fields.

**Alternatives considered**:
- *Use Open-Meteo's native `apparent_temperature`, omit the row entirely for SMHI-sourced data*: Rejected — SMHI serves the large majority of this app's covered locations, so the row would be missing most of the time it matters, defeating the point.

## 4. Sunrise/sunset and moon phase: computed locally, no new dependency

**Decision**: Compute both algorithmically from latitude/longitude/date, entirely client-side:

- **Sunrise/sunset**: the NOAA Solar Calculator's published equations (themselves based on Jean Meeus' *Astronomical Algorithms*) — derive the day's fractional year, the equation of time, and the sun's declination, then solve for the hour angle at which the sun sits 0.833° below the horizon (the standard sunrise/sunset definition accounting for atmospheric refraction and the sun's apparent radius). Documented as accurate to within about a minute for locations between ±72° latitude — comfortably covers this app's SMHI-anchored Nordic focus and Open-Meteo's global fallback.
- **Moon phase**: the standard synodic-month day-counting approximation — days elapsed since a known reference new moon, modulo the 29.53059-day average synodic month, mapped to one of the 8 conventional phase names (new, waxing crescent, first quarter, waxing gibbous, full, waning gibbous, last quarter, waning crescent). Documented accuracy is approximately ±1 day, sufficient to name a phase (not to time it to the hour).

**Rationale**: Both are well-established, public-domain, easily-verified formulas (research confirms multiple independent public implementations agree on the same equations) that only need latitude/longitude/date as input — values this app already has for every selected location. Computing them avoids adding a new external API/dependency purely for a "nice to have" summary, keeps the feature working offline-of-any-new-service (no new coverage gaps, no new rate limits), and is consistent with this app's existing preference for plain computation over new integrations wherever reasonable (mirrors 007's locally-computed day/night rule).

**Alternatives considered**:
- *A dedicated sunrise/sunset or astronomy API*: Rejected — unnecessary network dependency (and a new failure mode: "sun times unavailable") for a calculation this well-suited to local computation.
- *Open-Meteo's native `daily.sunrise`/`daily.sunset` fields*: Considered (confirmed available live) but rejected for the same reason as feels-like (§3) — only available when Open-Meteo happens to be the active provider, whereas local computation works identically for every location regardless of which weather provider serves it.

## 5. Snow row: derived, not fetched

**Decision**: Reuse 007's existing snow classification rule (`precipitation > 0 && temperature <= 0`) to decide whether a period's precipitation counts as snow, then display that period's precipitation amount as an approximate snow figure (documented as a water-equivalent approximation, not a measured snow depth) rather than fetching or tracking a separate snow-depth data point.

**Rationale**: Neither SMHI's observation station network nor its forecast response include a true snow-depth measurement/forecast; Open-Meteo does expose a native `snowfall` (cm) hourly variable, but using it would reintroduce the exact same provider-inconsistency problem as §3's feels-like decision. Reusing the already-established, already-tested snow/rain threshold (007) keeps one consistent rule app-wide and adds no new data-fetching.

## 6. Horizontal scroll for narrow screens (FR-008)

**Decision**: Wrap the timeline grid in a container with `overflow-x: auto`, matching the existing pattern this app already uses for its details table (`.observation-table-wrap`, 001) — the grid's intrinsic width (driven by a sensible per-column minimum) determines when scrolling kicks in, rather than columns shrinking below legibility.

**Rationale**: Directly reuses an existing, already-working pattern in this codebase rather than inventing a new responsive strategy — consistent with how 007 reused the app's existing `.forecast-row`/`.gap-point` conventions rather than creating new ones.
