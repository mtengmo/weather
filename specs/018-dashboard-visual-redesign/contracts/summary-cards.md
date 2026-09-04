# Contract: Today Summary Card and 7-Day Forecast Strip (User Stories 4 & 5)

## `src/hooks/useObservationData.ts`

```ts
export function useObservationData(
  location: Location | null,
  window: ObservationWindow,
  nearbyStationCount: NearbyStationCount,
  combineForecastSources = false
): UseObservationDataResult {
  const [series, setSeries] = useState<ObservationSeries | null>(null);
  const [nearbyStations, setNearbyStations] = useState<NearbyStationSeries[]>([]);
  const [multiSourceForecast, setMultiSourceForecast] = useState<MultiSourceForecastEntry[]>([]);
  const [weeklySeries, setWeeklySeries] = useState<ObservationSeries | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSeries(null);
    setNearbyStations([]);
    setMultiSourceForecast([]);
    if (window !== "last-7-days") setWeeklySeries(null);

    if (location === null) return;

    Promise.all([
      getObservations(location, window),
      getNearbyStationSeries(location, window, nearbyStationCount),
      combineForecastSources ? getMultiSourceForecast(location, window) : Promise.resolve([]),
      // Only a genuinely new fetch when `window` isn't already "last-7-days" — the Today card
      // and 7-day strip need weekly data regardless of which tab is active
      // (018-dashboard-visual-redesign, research.md §4).
      window === "last-7-days" ? Promise.resolve(null) : getObservations(location, "last-7-days"),
    ]).then(([primary, nearby, multiSource, weekly]) => {
      if (cancelled) return;
      setSeries(primary);
      setNearbyStations(nearby);
      setMultiSourceForecast(multiSource);
      setWeeklySeries(window === "last-7-days" ? primary : weekly);
      setLastUpdated(new Date().toISOString());
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, window, nearbyStationCount, combineForecastSources]);

  return { series, nearbyStations, multiSourceForecast, weeklySeries, lastUpdated };
}
```

## `src/components/TodaySummaryCard.tsx` (new)

```tsx
import { deriveWeatherCondition } from "../services/weatherCondition";
import { WEATHER_ICONS } from "./weatherIcons";
import { convertTemperature, convertPrecipitation, convertWindSpeed } from "../services/units";
import { directionToCompass, formatValue } from "../services/format";
import { getSunTimes } from "../services/sunMoon";
import type { DailyAggregate, Location, UnitSystem } from "../models/types";

interface TodaySummaryCardProps {
  today: DailyAggregate | null;
  unit: UnitSystem;
  location: Pick<Location, "latitude" | "longitude">;
}

export default function TodaySummaryCard({ today, unit, location }: TodaySummaryCardProps) {
  if (today === null) return null;

  const condition = deriveWeatherCondition({
    temperature: today.average,
    precipitation: today.totalPrecipitation,
    windSpeed: today.windAverage,
    cloudCoverPercent: today.cloudAverage,
  });
  const iconInfo = condition !== null ? WEATHER_ICONS[condition] : null;
  const { sunrise, sunset } = getSunTimes(location, new Date());
  const timeFormat: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

  return (
    <section className="today-summary-card" aria-label="Today">
      <div className="today-summary-icon">
        {iconInfo ? <iconInfo.Icon aria-hidden="true" size={40} /> : null}
      </div>
      <div className="today-summary-highlow">
        {formatValue(convertTemperature(today.high, unit), 0)}° /{" "}
        {formatValue(convertTemperature(today.low, unit), 0)}°
      </div>
      <p className="today-summary-description">{iconInfo ? `${iconInfo.label}.` : "—"}</p>
      <div className="today-summary-detail">
        <span>Rain {formatValue(convertPrecipitation(today.totalPrecipitation, unit), 1)}{unit === "imperial" ? " in" : " mm"}</span>
        <span>
          Wind {formatValue(convertWindSpeed(today.windAverage, unit), 0)}{unit === "imperial" ? " mph" : " m/s"}
          {today.windDirection != null && ` ${directionToCompass(today.windDirection)}`}
        </span>
      </div>
      <div className="today-summary-detail">
        <span>Sunrise {sunrise ? new Date(sunrise).toLocaleTimeString([], timeFormat) : "—"}</span>
        <span>Sunset {sunset ? new Date(sunset).toLocaleTimeString([], timeFormat) : "—"}</span>
      </div>
    </section>
  );
}
```

("Today" derivation — see below — is computed once in `WeatherIconOverview` and passed down, not
recomputed inside this component, so it's trivially testable in isolation with a fixed `today`.)

## `src/components/WeeklyForecastStrip.tsx` (new)

```tsx
import { deriveWeatherCondition } from "../services/weatherCondition";
import { WEATHER_ICONS } from "./weatherIcons";
import { convertTemperature } from "../services/units";
import { formatValue } from "../services/format";
import type { DailyAggregate, UnitSystem } from "../models/types";

interface WeeklyForecastStripProps {
  days: DailyAggregate[];
  unit: UnitSystem;
}

export default function WeeklyForecastStrip({ days, unit }: WeeklyForecastStripProps) {
  if (days.length === 0) return null;

  return (
    <section className="weekly-forecast-strip" aria-label="7 day forecast">
      {days.map((day) => {
        const condition = deriveWeatherCondition({
          temperature: day.average,
          precipitation: day.totalPrecipitation,
          windSpeed: day.windAverage,
          cloudCoverPercent: day.cloudAverage,
        });
        const iconInfo = condition !== null ? WEATHER_ICONS[condition] : null;
        return (
          <div className="weekly-forecast-day" key={day.bucketEnd}>
            <span className="weekly-forecast-weekday">
              {new Date(day.bucketEnd).toLocaleDateString([], { weekday: "short" })}
            </span>
            {iconInfo ? <iconInfo.Icon aria-hidden="true" size={24} /> : <span aria-hidden="true">—</span>}
            <span className="weekly-forecast-highlow">
              {formatValue(convertTemperature(day.high, unit), 0)}° / {formatValue(convertTemperature(day.low, unit), 0)}°
            </span>
          </div>
        );
      })}
    </section>
  );
}
```

## `src/components/WeatherIconOverview.tsx`

```tsx
const weeklyDays: DailyAggregate[] =
  weeklySeries !== null && weeklySeries.status === "ready"
    ? toDailyAggregates(weeklySeries.observations, 7)
    : [];

// "Today" = the last non-forecast entry, or the final entry when there's no forecast at all —
// the same boundary rule `boundaryIndex` already applies elsewhere in this file.
const todayIndex = (() => {
  const firstForecastIndex = weeklyDays.findIndex((d) => d.isForecast === true);
  if (firstForecastIndex === -1) return weeklyDays.length - 1;
  return firstForecastIndex > 0 ? firstForecastIndex - 1 : -1;
})();
const today = todayIndex >= 0 ? weeklyDays[todayIndex] : null;
```

```tsx
<TodaySummaryCard today={today} unit={unit} location={location} />
<WeeklyForecastStrip days={weeklyDays} unit={unit} />
```

Both mounted once, outside the `displayMode`-dependent timeline block, so they render regardless
of which of the three tabs is active (spec User Stories 4/5, "shown on all three tabs").

## No changes to

- `toDailyAggregates` itself — reused exactly as the 7-day timeline already uses it.
- `deriveWeatherCondition`, `WEATHER_ICONS`, `getSunTimes` — reused unchanged.
