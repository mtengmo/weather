# Data Model: Reduce API Requests & Hide 0% Rain Chance

## `src/services/smhiProvider.ts`

### New `getForecastOnly` — mirrors `openMeteoProvider.getForecastOnly`/`metNoProvider.getForecastOnly`

```ts
/**
 * SMHI's forecast-only observations for a location — the same two internal steps
 * (fetchForecastTimeSeries + buildForecastHourlySeries) getObservations already uses for its own
 * forecast portion, without any of the six observation-parameter station fetches
 * (025-reduce-api-requests, research.md §2 — getMultiSourceForecast's SMHI branch previously
 * called the full getObservations solely to discard everything except this).
 */
export async function getForecastOnly(
  location: Pick<import("../models/types").Location, "latitude" | "longitude">,
  window: ObservationWindow
): Promise<{ observations: WeatherObservation[]; issuedAt: string | null }> {
  const forecastHoursNeeded = FORECAST_HOURS[window];
  if (forecastHoursNeeded === 0) return { observations: [], issuedAt: null };

  const { timeSeries, issuedAt } = await fetchForecastTimeSeries(location);
  const observations = buildForecastHourlySeries(forecastHoursNeeded, timeSeries);
  return { observations, issuedAt: observations.length > 0 ? issuedAt : null };
}
```

## `src/services/weatherApi.ts`

### `getMultiSourceForecast`'s SMHI branch — uses the new lightweight path

```ts
// Before:
(async () => {
  if (!(await isSmhiCovered(location))) return { observations: [], issuedAt: null };
  const series = await smhiProvider.getObservations(location, window);
  return {
    observations: series.observations.filter((o) => o.isForecast === true),
    issuedAt: series.forecastIssuedAt ?? null,
  };
})(),

// After:
(async () => {
  if (!(await isSmhiCovered(location))) return { observations: [], issuedAt: null };
  return smhiProvider.getForecastOnly(location, window);
})(),
```

(The `isSmhiCovered` gate is unchanged — kept exactly as today, per research.md §2's rationale.)

## `src/hooks/useObservationData.ts`

### `nearbyStations` fetch split into its own effect, gated on a new parameter

```ts
export function useObservationData(
  location: Location | null,
  window: ObservationWindow,
  nearbyStationCount: NearbyStationCount,
  includeNearbyStations: boolean // new — true once the Details/graph view has been opened
): UseObservationDataResult {
  // ...existing series/nearbyStations/multiSourceForecast/weeklySeries/lastUpdated state...

  useEffect(() => {
    // existing primary/weekly/multiSource Promise.all — UNCHANGED except nearbyStations removed
    // from this Promise.all entirely.
  }, [location?.latitude, location?.longitude, window]); // nearbyStationCount no longer a dependency here

  useEffect(() => {
    let cancelled = false;
    if (!includeNearbyStations || location === null) {
      setNearbyStations([]);
      return;
    }
    getNearbyStationSeries(location, window, nearbyStationCount).then((nearby) => {
      if (!cancelled) setNearbyStations(nearby);
    });
    return () => {
      cancelled = true;
    };
  }, [location?.latitude, location?.longitude, window, nearbyStationCount, includeNearbyStations]);

  // ...
}
```

(Splitting into two effects means flipping `includeNearbyStations` from false to true triggers
*only* the nearby-station fetch, not a full re-fetch of the primary/weekly/multi-source data that
was already fetched and is still valid for the same location/window — FR-003.)

## `src/App.tsx`

### Tracks whether Details/graph has ever been opened this session

```tsx
const [hasOpenedDetails, setHasOpenedDetails] = useState(false);

// Wherever view transitions to "graph" or "details" (existing setView calls), also:
useEffect(() => {
  if (view === "graph" || view === "details") setHasOpenedDetails(true);
}, [view]);

const { series, nearbyStations, multiSourceForecast, weeklySeries, lastUpdated } = useObservationData(
  selected,
  window,
  nearbyStationCount,
  hasOpenedDetails
);
```

(`hasOpenedDetails` never resets back to `false` once set — matching FR-001's "at least once in
the current session" wording; switching back to the Overview afterward keeps nearby-station data
fetched and available for a quick return to Details/graph, per Acceptance Scenario 3.)

## `src/components/WeatherIconOverview.tsx`

### Rain row — hides a genuine 0%

```tsx
// Before:
{point.chanceOfRain !== null && point.chanceOfRain !== undefined && (
  <span className="weather-timeline-bar-chance"> · {Math.round(point.chanceOfRain)}%</span>
)}

// After:
{point.chanceOfRain !== null && point.chanceOfRain !== undefined && point.chanceOfRain > 0 && (
  <span className="weather-timeline-bar-chance"> · {Math.round(point.chanceOfRain)}%</span>
)}
```

## Validation Rules

- `includeNearbyStations` only ever transitions `false → true`, never back — matches "at least
  once in the current session" (FR-001).
- No fabricated data: `getForecastOnly`'s degraded-empty case (`{ observations: [], issuedAt:
  null }`) matches the existing best-effort-degradation convention already used by
  `openMeteoProvider.getForecastOnly`/`metNoProvider.getForecastOnly`.
- A `chanceOfRain` of exactly `0` and a `chanceOfRain` of `null`/`undefined` remain visually
  identical (neither renders the `<span>`) — FR-007's "don't introduce a new distinct indicator
  for a genuine gap."
