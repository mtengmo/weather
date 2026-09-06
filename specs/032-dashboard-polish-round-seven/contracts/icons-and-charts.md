# Contract: Icon intensity (US5) and chart changes (US6/US7)

## Precipitation-intensity classification

**Contract**: `deriveWeatherCondition` returns `light-rain`/`heavy-rain` or `light-snow`/
`heavy-snow` wherever it previously returned `rainy`/`snowy` — never the old flat values. When
`symbolCondition` is supplied and is one of the new four values, it takes the same precedence
`rainy`/`snowy` symbol conditions did before (already-classified by the source, per each
provider's own light/moderate/heavy code). When no symbol condition is available, the existing
temperature/precipitation-amount branch decides light vs. heavy via a fixed mm threshold, applied
the same way `WINDY_THRESHOLD_MS` already is. Thunderstorm/foggy/sleet classification is
unaffected.

## `WEATHER_ICONS` / `.weather-condition-*`

**Contract**: `WEATHER_ICONS` has an entry for every `WeatherCondition` value including the four
new ones (no `rainy`/`snowy` keys remain) — a `Record<WeatherCondition, WeatherIconInfo>` so
TypeScript itself enforces completeness. `src/index.css` has a `.weather-condition-{condition}
svg` color rule for each of the four new values (reusing the existing `--wx-rain`/`--wx-snow`
tokens — no new theme variables).

## `BarRow`'s two-row output

**Contract**: For a given `TimelineRow` (precipitation or snow), `BarRow` renders two adjacent
`.weather-timeline-row` elements sharing the same period-column count: the first contains only
bar elements (one per period, no text node inside); the second contains only text elements (mm
value + chance-of-rain, when present) — column `i` of the second row is positioned directly
beneath column `i` of the first. A period with no value renders the existing gap indicator in
both rows at that column, not just one.

## `LineRow`'s degree scale

**Contract**: When `row.key === "temperature"`, `LineRow` renders a sticky-left column of tick
labels at each 5°-step value spanning the row's own current min/max (rounded outward to the
nearest 5), plus one horizontal gridline per tick drawn behind the existing polyline/area — using
the same Y-mapping function already applied to the data points, so a tick's label always lines up
with its own gridline and both agree with where the polyline crosses that value. No other row
kind (`wind`, `precipitation`, `snow`) is affected by this contract.
