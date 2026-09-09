# Research: Humidity Level Indicator

## 1. SMHI forecast humidity

**Decision**: Add `relative_humidity?: number` to `SmhiForecastData` (percent) and map it to `WeatherObservation.relativeHumidity` in both `forecastObservationForHour` (used for forecast-window periods) and wherever else that function's result is consumed (`buildForecastHourlySeries`, `fillTrailingObservationGap` — both already call `forecastObservationForHour`, so one change covers both).

**Rationale**: Confirmed live against SMHI's actual forecast JSON — `relative_humidity` is already present per time-step, at the same nesting level as `air_temperature`/`wind_speed` (e.g. `56` for a live Stockholm-area point), so this is a same-shape addition to an interface already treated as a flat pass-through, not a new fetch.

## 2. SMHI observed (station) humidity

**Decision**: Add `HUMIDITY_PARAM = 6` (SMHI's "Relativ Luftfuktighet," confirmed live via `GET .../parameter/6.json` → "Relativ Luftfuktighet... momentanvärde, 1 gång/tim") and fetch it the same way `CLOUD_PARAM`/`WIND_PARAM` already are — via `fetchParameterValues` (nearest active station for that parameter, not necessarily the same station as temperature) — in `getObservations`, then thread the resulting `SmhiValue[]` into `buildHourlySeries` the same way `cloudValues` already is, populating each `WeatherObservation.relativeHumidity`.

**Rationale**: Matches the existing per-parameter-nearest-station pattern exactly; no new fetch strategy needed.

## 3. Where "current" humidity comes from

**Decision**: Reuse `WeatherIconOverview.tsx`'s existing `nearestObservation` (already computed — the first forecast point, or else the latest observed one) and read `nearestObservation?.relativeHumidity ?? null` as `currentHumidity`, passed to `TodaySummaryCard` alongside `currentCondition`/`currentTemperature`.

**Rationale**: `nearestObservation.relativeHumidity` is *already read* today, one line above, to feed `deriveFeelsLike` — this feature only needs to also surface that same already-available value directly, not compute anything new. Matches spec's Edge Case decision (current reading preferred over a day average).

## 4. Level classification

**Decision**: A pure function `humidityLevel(percent: number): "Dry" | "Normal" | "High"` — `< 30` → Dry, `30-70` → Normal (inclusive both ends per spec's boundary rule — "falls into the higher of the two adjoining bands" — so exactly 30 → Normal, exactly 70 → High), `> 70` → High. Lives alongside `TodaySummaryCard` (small, single-purpose, only consumer) rather than in a shared service file.

**Rationale**: Spec's own Assumptions document these exact thresholds as standard, non-specialist bands. No existing classification helper to extend.

## 5. Rendering

**Decision**: One more line in `TodaySummaryCard`'s existing `.today-summary-detail` row group (alongside Sunrise/Sunset/Moon), reading "Humidity: Normal" — not a new section, not the informational-warning block added by 048 (different concern).

**Rationale**: Matches the card's existing "everyday-readable line" convention; no new visual block needed for one more short fact.
