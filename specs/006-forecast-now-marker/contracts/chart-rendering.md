# Contract: Chart rendering additions (internal — `chartData.ts` / `ObservationChart.tsx`)

Not an external API — this documents the new internal function boundary between data-shaping (`chartData.ts`) and rendering (`ObservationChart.tsx`), so `/speckit-tasks` can split work along it the way 005 did.

## `chartData.ts` — new export

A boundary-lookup function (exact name/signature is an implementation detail for `/speckit-tasks`) that, given the same `WeatherObservation[]` or `DailyAggregate[]` array a chart's data-row builder already consumes, returns:

- The X-axis category value (matching whatever the chart's `dataKey` for its X-axis already is — `timestamp` for hourly charts, `bucketEnd` for daily charts) of the last non-forecast item, when at least one `isForecast: true` item follows it.
- `null` when there is no forecast in the array at all (nothing to mark).

**Contract**: pure function, no side effects, no network access — operates only on data already fetched into the array it's given (research.md §1).

## `ObservationChart.tsx` — new rendering behavior

- Every `<ComposedChart>` branch that already renders a `...Forecast`-keyed `<Line>`/`<Bar>` (005) gains a `<ReferenceLine x={boundaryValue} ... />` sourced from the lookup above, rendered only when `boundaryValue !== null`.
- Every branch for a window that expects a forecast (`"last-24-hours"` | `"last-7-days"`) gains a check: if the loaded series has zero `isForecast` points, render the new "forecast unavailable for this location" message instead of (or alongside, per implementation choice in `/speckit-tasks`) the chart, using the same alert/banner pattern already used for the existing unavailable-data messages.
- The `"last-30-days"` branches are unaffected — no marker, no new message, matching 005's precedent that forecast is entirely out of scope for that window.
- Every forecast-series `name` (the string already passed to `<Line>`/`<Bar>`'s `name` prop for the `...Forecast` data key, e.g. `${location.displayName} (forecast)`, 005) gains a further distinguishing suffix when `series.forecastFromFallbackSource` is `true` (data-model.md), so the chart's legend — visible without hovering — communicates the source mismatch (FR-007). Exact wording is a `/speckit-tasks`-level implementation detail; research.md §5 favors reusing this existing label mechanism over a new banner element.

