# Data Model: Overview Default, Location Panel, and Graph Readability

## Changed: `ObservationSeries` (`src/models/types.ts`)

One new field, following the pattern of the existing `forecastFromFallbackSource`:

```ts
export interface ObservationSeries {
  // ...existing fields unchanged...
  /** Which provider supplied this series' observed data (013-overview-default-and-layout). */
  primarySource: "smhi" | "open-meteo";
}
```

Not optional — every code path that constructs an `ObservationSeries` in `weatherApi.ts` sets it
explicitly (data-model.md's Field Population Rules below), so callers never need an `?? default`.

## New: Observed Temperature Extremes (`src/components/chartData.ts`)

```ts
export interface ObservedExtreme {
  value: number; // Celsius, unit-converted at display time like every other chart value
  timestamp: string; // ISO 8601, from the source WeatherObservation
}

export interface ObservedExtremes {
  high: ObservedExtreme;
  low: ObservedExtreme;
}

export function findObservedExtremes(observations: WeatherObservation[]): ObservedExtremes | null;
```

Returns `null` when no observation has both `isForecast !== true` and a non-null `temperature`
(FR-020). When multiple observations tie for the highest (or lowest) value, the first one
encountered (oldest timestamp, since `observations` is already ordered oldest→newest throughout
this codebase) is returned (spec Edge Cases).

## New: Location Panel open/closed state (`src/App.tsx`, component-local)

No new persisted type — a plain `const [locationPanelOpen, setLocationPanelOpen] = useState(false)`
in `App.tsx`, passed to the new `LocationPanel` component. Not persisted across reloads (closing on
every fresh load is the expected default, matching how every other transient UI toggle in this app
already behaves).

## Field Population Rules

| Field | Source | Gating |
|---|---|---|
| `ObservationSeries.primarySource` | `weatherApi.ts`'s `getObservations` | `"smhi"` for both the SMHI-success and SMHI-success-with-forecast-fallback paths; `"open-meteo"` for the not-covered/SMHI-failed path (research.md §4) |
| `ObservedExtremes` | `findObservedExtremes(series.observations)` | Computed at render time in `ObservationChart.tsx`, not stored on `ObservationSeries` — it's a pure derived view, recomputed whenever `series` changes, matching how `chartData.ts`'s existing row-builders are also called fresh per render |
| `App.tsx`'s initial `view` state | `useState<View>("overview")` | Was `useState<View>("graph")` — the only line changed for FR-001 |

## Validation Rules

- `primarySource` is always one of exactly two literal values — no "unknown"/"mixed" state, since
  `weatherApi.ts` always knows definitively which provider supplied the observed data by the time
  it returns (research.md §4).
- `findObservedExtremes` never fabricates a value: an empty/all-null/all-forecast observation list
  returns `null`, never a zeroed or placeholder `ObservedExtremes`.
