# Research: Restore Rain Chance & Remove Overview Blend Count

## §1 — SMHI's own rain-probability field (US1 / FR-001)

**Decision (confirmed via live API call and code review)**: SMHI's forecast response already
includes `probability_of_precipitation` (percent, 0-100) per timestep — confirmed live:

```
"probability_of_precipitation":0
```

`smhiProvider.ts`'s `SmhiForecastData` interface never parsed this field; `chanceOfRain` on
`WeatherObservation` has only ever been populated by `openMeteoProvider.ts`'s
`precipitation_probability`. Whenever the app's primary series comes from SMHI's own forecast
(the common case for Swedish locations, and — per 021-dashboard-polish-round-six's
coordinate-rounding fix — now a *more* common case, since that fix stopped SMHI's forecast from
spuriously 404ing for geolocation-sourced coordinates), the primary series's forecast points have
no `chanceOfRain` at all, so the Rain row's percentage silently never renders for them. It only
ever appeared when the Open-Meteo fallback path fired (SMHI's own forecast came back empty),
which happened more often before the coordinate-rounding fix.

**Fix**: Add `probability_of_precipitation?: number` to `SmhiForecastData` and set
`chanceOfRain: data?.probability_of_precipitation ?? null` in `buildForecastHourlySeries`,
mirroring the existing `symbol_code` parsing pattern added in 022-met-forecast-source.

**Rationale**: A one-field parsing fix restores the entire existing display feature (the inline,
baseline-safe layout from 021-dashboard-polish-round-six) without touching any rendering code —
the gap was purely in data population, not display logic.

**Alternatives considered**: Backfilling `chanceOfRain` from Open-Meteo's multi-source forecast
entry even when SMHI is primary — rejected as unnecessary complexity now that SMHI's own field
supplies the same information directly from the same source already being used.

## §2 — Removing the Overview's "(avg)" annotation (US2 / FR-003)

**Decision (confirmed via code review)**: `WeatherIconOverview.tsx`'s `LineRow` renders
`` `${value} (avg${count > 2 ? ` of ${count}` : ""})` `` whenever `point.combined` is true
(020-dashboard-polish-round-five, extended in 022-met-forecast-source to include the count). The
user has asked to remove this annotation entirely from the Overview — the footer's own source
disclosure (021/022) already communicates blending.

**Fix**: Render just `formatRowValue(row, point.value)` when `point.combined` is true, dropping
the `(avg...)` suffix — falling through to the existing high/low or plain-value branches exactly
as before this text was ever added.

**Rationale**: Smallest change that satisfies FR-003 — `point.combined`/`point.combinedSourceCount`
themselves remain untouched (still computed, still available for any future use, e.g. the
Details/graph per-source lines which are unaffected by this change), only the Overview's own text
rendering changes.

**Alternatives considered**: Removing `combined`/`combinedSourceCount` from the data model
entirely — rejected; `showCombinedForecast` and the Details/graph per-source-line feature
(022-met-forecast-source, US4) are unrelated consumers of adjacent data and must keep working
unchanged.
