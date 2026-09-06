# Research: MET Norway Forecast Source & Richer Conditions

## §1 — MET Norway API integration (US1 / FR-001, FR-002)

**Decision (confirmed via live API calls)**: Use MET Norway's `locationforecast/2.0/compact`
endpoint: `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}`. A
live fetch for Stockholm returns:

```json
{
  "properties": {
    "meta": { "updated_at": "2026-09-05T21:33:30Z", "units": { "...": "..." } },
    "timeseries": [
      {
        "time": "2026-09-05T21:00:00Z",
        "data": {
          "instant": { "details": { "air_temperature": 13.8, "wind_speed": 3.8, "wind_from_direction": 359.0, "relative_humidity": 82.5, "air_pressure_at_sea_level": 1005.2, "cloud_area_fraction": 99.9 } },
          "next_1_hours": { "summary": { "symbol_code": "cloudy" }, "details": { "precipitation_amount": 0.0 } },
          "next_6_hours": { "summary": { "symbol_code": "partlycloudy_night" }, "details": {} },
          "next_12_hours": { "summary": { "symbol_code": "fair_day" }, "details": {} }
        }
      }
    ]
  }
}
```

`properties.meta.updated_at` is the "time generated" value the user asked about — the direct
analog to SMHI's `createdTime` (021-dashboard-polish-round-six). `next_1_hours` carries the
finest-grained precipitation amount and symbol code and is present for roughly the first 2-3 days
of the series (matching this app's actual forecast windows of 24h/7d); it becomes sparse further
out, at which point `next_6_hours`/`next_12_hours` are the only summaries available — for hours
beyond `next_1_hours`'s reach, fall back to `next_6_hours`'s symbol code and treat precipitation
amount as unavailable (gap) rather than fabricating an hourly figure from a 6-hour bucket.

**User-Agent requirement (verified live)**: MET Norway's terms ask API consumers to identify
themselves via `User-Agent`. A bare `curl` default UA was rejected with `403 Forbidden`; both an
explicit identifying UA (`weather-history-app/1.0 ...`) and a plain browser UA string (Chrome's
own default) succeeded with `200 OK`. Since this is a backend-less SPA, `fetch()` cannot set a
custom `User-Agent` at all (browsers treat it as a forbidden header and always substitute their
own) — but the live test confirms this doesn't block ordinary browser traffic, only clients
sending no/generic non-browser UAs. No proxy or backend is needed to work around this.

**CORS**: `Access-Control-Allow-Origin: *` is present — no proxy needed for browser `fetch()`.

**Coordinate precision**: MET Norway's endpoint did not reproduce SMHI's 6-decimal 404 bug in a
live test with 14-decimal coordinates, but rounding to 6 decimals (reusing the helper already
added for SMHI's forecast URL, 021 follow-up) is applied anyway for consistency and better
upstream cache-hit behavior (MET Norway explicitly documents caching per-coordinate via the
`Expires` header, and un-rounded coordinates would defeat that cache across the app's own
repeated nearly-identical requests).

**Attribution**: MET Norway's data is licensed CC BY 4.0, which requires crediting "MET Norway"
when displaying their data (the same kind of requirement already informally satisfied for
SMHI/Open-Meteo by naming them in the footer). Per the clarification session, this is satisfied by
extending the footer's existing disclosure text to name MET Norway when it contributes (see §7).

**Coverage**: Unlike SMHI (gated by `isCovered()`, a nearest-station-within-50km check), MET
Norway's `locationforecast` service returns a forecast for any global lat/lon (it blends multiple
underlying models depending on region) — no coverage gate is needed; it's fetched unconditionally
alongside Open-Meteo, the same way Open-Meteo already is.

**Rationale**: Mirrors the existing `openMeteoProvider.ts` pattern (a source with no coverage
gate, fetched unconditionally, contributing to `getMultiSourceForecast`) rather than the SMHI
pattern (coverage-gated, station-based) — MET Norway has no station concept relevant here.

**Alternatives considered**: MET Norway's `complete` endpoint (returns the same data plus extra
symbol/probability fields already covered by `compact`'s `next_1_hours`/`next_6_hours` summaries)
— rejected as unnecessary payload weight for fields this feature doesn't use.

## §2 — Per-source chart lines already partially exist (US4 / FR-009, FR-010)

**Decision (confirmed via code review)**: `ObservationChart.tsx`'s 24-hour Temperature tab
*already* renders each contributing forecast source as its own dashed line (`sourceKey(i)`,
labeled via `SOURCE_LABELS`) alongside a bold "Combined average forecast" line, whenever
`multiSourceForecast.length > 1` — this has existed since 014-dashboard-usability-fixes and
already generalizes to any number of sources (`multiSourceForecast.map(...)`, `sourceKey` is
index-based). What's actually missing, matching the spec's US4/FR-009/FR-010:

1. This per-source overlay exists **only** on the Temperature tab's 24-hour chart — not on the
   7-day Temperature chart, and not on the Rain/Wind/Cloud tabs at all.
2. It's always-on (not a toggle) whenever 2+ sources have data — this already satisfies "users
   must be able to view each source as its own series" (FR-009) in the one place it exists; the
   gap is *breadth of coverage*, not the presence of a toggle.
3. The Overview's main timeline has no equivalent at all — only the `(avg)` suffix
   (020-dashboard-polish-round-five) hints that blending happened, with no indication of *how
   many* sources or *which ones* (FR-010's gap).

**Fix**: Extend the existing per-source-line + combined-average-line pattern (already
source-count-agnostic) to the 7-day Temperature chart and to the Rain/Wind/Cloud tabs' own
metrics wherever `multiSourceForecast` has comparable per-metric data (rain: `precipitation`;
wind: `windSpeed`). Extend the Overview's `(avg)` marker to also state the contributing count,
e.g. `12°C (avg of 3)`, sourced from `mergeMultiSourceIntoTimelinePoints`'s existing
`perSourceAverages.length` (already computed, just not currently exposed on the point).

**Rationale**: Reuses proven, working code (the existing per-source overlay) rather than building
a new toggle/mode from scratch — the spec's "users must be able to switch to a per-source view"
is satisfied because that view already exists; this round's real work is closing the tab/window
coverage gap plus adding the Overview-level indicator.

**Alternatives considered**: A dedicated visibility toggle to hide the per-source lines by default
(reducing visual clutter on the 24h Temperature tab, which can already show 8+ lines with nearby
stations included) — deferred; the existing overlay has shipped without complaint since 014, and
introducing an on/off toggle is a larger, separately-testable UI change not requested by the spec's
acceptance scenarios (which only ask that a per-source view exists and be reachable, not that the
always-on view be hidden by default).

## §3 — Weather-symbol-code classification (US3 / FR-006, FR-007)

**Decision**: Classify conditions using each source's own official weather-symbol code when
available, mapped into the app's own `WeatherCondition` enum, falling back to the existing
threshold-based `deriveWeatherCondition` logic when no symbol code is available for a period.

**SMHI's Wsymb2 table** (numeric 1-27, SMHI's own long-published, stable parameter documentation):

| Code | SMHI meaning | Mapped condition |
|------|-------------|-------------------|
| 1-2 | Clear / nearly clear sky | `clear-day` / `clear-night` (via timestamp) |
| 3-6 | Variable to overcast cloudiness | `cloudy` |
| 7 | Fog | `foggy` (**new**) |
| 8-10 | Rain showers (light/moderate/heavy) | `rainy` |
| 11 | Thunderstorm | `thunderstorm` (**new**) |
| 12-14 | Sleet showers (light/moderate/heavy) | `sleet` (**new**) |
| 15-17 | Snow showers (light/moderate/heavy) | `snowy` |
| 18-20 | Rain (light/moderate/heavy) | `rainy` |
| 21 | Thunder | `thunderstorm` (**new**) |
| 22-24 | Sleet (light/moderate/heavy) | `sleet` (**new**) |
| 25-27 | Snowfall (light/moderate/heavy) | `snowy` |

SMHI's forecast response already includes `symbol_code` in its `data` object (confirmed present in
the user's own pasted sample) — `smhiProvider.ts`'s `SmhiForecastData` interface simply never
parsed it.

**MET Norway's symbol codes** are lowercase strings (e.g. `clearsky_day`, `partlycloudy_night`,
`lightrain`, `heavyrainandthunder`, `sleetshowers_day`, `fog`) with ~30 base names and
`_day`/`_night`/`_polartwilight` suffixes on the ones where it matters. Rather than an exhaustive
lookup table, classify via substring matching against the base name (case-sensitive, since MET
Norway's codes are consistently lowercase): contains `"thunder"` → `thunderstorm`; contains
`"fog"` → `foggy`; contains `"sleet"` → `sleet`; contains `"snow"` → `snowy`; contains `"rain"` →
`rainy`; contains `"cloud"` or `"fair"` → `cloudy`; contains `"clearsky"` → `clear-day`/`clear-night`
(using the code's own `_day`/`_night` suffix when present, else falling back to the timestamp-based
rule already used elsewhere). This covers the full published symbol set without hardcoding ~100
variants, and degrades safely (falls through to the existing threshold logic) for any future code
that matches none of these substrings.

**Precedence**: A symbol-code-derived condition is used when available, *except* the existing
wind-speed threshold (`WINDY_THRESHOLD_MS`) still overrides it — symbol codes carry no wind
signal, so a clear-sky-but-very-windy period should still classify as `windy`, matching today's
behavior. Precedence becomes: no-data → symbol-code result (if the source-provided code maps to
`thunderstorm`/`foggy`/`sleet`/`snowy`/`rainy`) → windy threshold → symbol-code result (if
`cloudy`/`clear-*`) → existing full threshold fallback (only when no symbol code was available at
all for the period).

**Rationale**: Directly satisfies FR-006/FR-007 using data already fetched (SMHI) or now fetched
(MET Norway) rather than guessing thresholds for conditions the app can't currently detect at all
(there is no existing signal for "thunderstorm" or "fog" in temperature/precipitation/wind/cloud
alone).

**Alternatives considered**: Deriving thunderstorm from SMHI's `thunderstorm_probability` field
(also in the user's pasted sample) via a threshold — rejected in favor of the symbol code, since
SMHI's own symbol table already encodes this exact judgment (and MET Norway has no separate
thunder-probability field to be consistent with).

## §4 — New condition icons and colors (US3 / FR-008)

**Decision**: Add three entries to `WEATHER_ICONS` (`weatherIcons.tsx`) using `lucide-react`
icons already available in the installed version: `CloudLightning` (thunderstorm), `CloudFog`
(foggy), `CloudDrizzle` (sleet — distinguishing it from `CloudSnow`/`CloudRain`). Add matching
`--wx-thunderstorm`, `--wx-fog`, `--wx-sleet` CSS variables to all three themes (midnight, bright,
glass) in `index.css`, following the existing `--wx-*` palette pattern, and matching
`.weather-condition-{condition} svg` color rules.

**Rationale**: Reuses the exact existing per-condition color mechanism (010-timeline-visual-styling)
rather than inventing a new one — only the enum and its color-variable/icon mapping grow.

## §5 — 7-day strip's broken icon colors (US2 / FR-005)

**Decision (confirmed via code review)**: `ConditionRow` in `WeatherIconOverview.tsx` wraps its
icon in a `weather-condition-${condition}` class (applying the `.weather-condition-*` svg color
rules from `index.css`); `WeeklyForecastStrip.tsx` renders `<iconInfo.Icon>` directly with no
wrapping class at all, so its icons have always rendered in the inherited default text color,
never the intended per-condition color, since 018-dashboard-visual-redesign shipped the strip.

**Fix**: Wrap `WeeklyForecastStrip.tsx`'s icon in the same `weather-condition-${condition}` class.

**Rationale**: The color rules and CSS variables already exist and are already theme-aware; this
is a one-class-name fix, not a new styling system.

## §6 — Overview compact source-count indicator (US4 / FR-010)

**Decision**: Extend `TimelineRowPoint.combined` (currently `boolean`) to also carry the
contributing count, and extend the `(avg)` suffix text in `WeatherIconOverview.tsx`'s `LineRow` to
include it, e.g. `12°C (avg of 3)` when 3 sources contributed, `12°C (avg)` preserved as today's
wording when exactly 2 contributed (avoiding a noisy "(avg of 2)" for the common case).
`mergeMultiSourceIntoTimelinePoints` already computes `perSourceAverages.length` — this is simply
exposed on the point instead of being discarded after the `> 1` check.

**Rationale**: Smallest change that satisfies FR-010 ("compact, always-visible indicator of how
many/which sources") using a value already computed, not a new fetch or computation.

**Alternatives considered**: Naming which specific sources contributed inline (e.g. "12°C
(SMHI+MET Norway avg)") — rejected as too long for the timeline's compact per-period cells;
reserved for the Details/graph per-source lines (§2), which already label each line by name.

## §7 — Footer disclosure generalized to N sources (FR-004)

**Decision**: Widen `dataSourceDisclosure`'s `combined: boolean` parameter (021-dashboard-polish-
round-six) to accept the actual list of contributing forecast-source display names (e.g.
`["SMHI", "MET Norway"]`), joining them with `" + "` when there are 2 or more (e.g. "SMHI + MET
Norway forecast"), and preserving today's plain `"Forecast"` label when only 0 or 1 source
contributed (unchanged single-source behavior — FR-004 only requires naming sources "whenever
[MET Norway] genuinely contributes" to a blend, not renaming the already-established single-source
case).

**Rationale**: A minimal generalization of round six's hardcoded 2-name string to N names, reusing
the same threshold (`multiSourceForecast.length > 1`) already computed in `App.tsx`.
