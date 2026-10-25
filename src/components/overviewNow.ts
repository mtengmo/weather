import type { DailyAggregate, ObservationSeries, WeatherObservation } from "../models/types";
import { capForecastReach } from "./timelineData";
import { deriveWeatherCondition, type WeatherCondition } from "../services/weatherCondition";
import { deriveFeelsLike } from "../services/feelsLike";
import { restOfDayAggregate, toDailyAggregates } from "../services/dailyAggregation";

/** "Today" = the first forecast-tagged entry in the always-on 7-day series (forward-looking
 *  window; 023-fix-today-summary). Forecast reach capped at 7 days (019, US7). Falls back to the
 *  most recent observed entry only when there is no forecast at all. */
export function deriveToday(weeklySeries: ObservationSeries | null) {
  const weeklyDays: DailyAggregate[] = capForecastReach(
    weeklySeries !== null && weeklySeries.status === "ready"
      ? toDailyAggregates(weeklySeries.observations, 7)
      : [],
    7
  );
  const firstForecastIndex = weeklyDays.findIndex((d) => d.isForecast === true);
  const todayIndex = firstForecastIndex === -1 ? weeklyDays.length - 1 : firstForecastIndex;
  const today = todayIndex >= 0 ? weeklyDays[todayIndex] : null;
  // High / Low / Rain / Wind on the Today card all cover the rest of today.
  const restOfDay = weeklySeries !== null ? restOfDayAggregate(weeklySeries.observations, new Date()) : null;
  return { weeklyDays, today, restOfDay };
}

/** The single nearest forward-looking reading (first forecast entry, or — only when there is no
 *  forecast at all — the latest observed one), and the "Now" values derived from it. */
export function deriveCurrentReading(weeklySeries: ObservationSeries | null): {
  nearestObservation: WeatherObservation | null;
  currentCondition: WeatherCondition | null;
  /** Same reading's sky-only condition (wind ignored), for windy artwork selection. */
  currentSkyCondition: WeatherCondition | null;
  currentTemperature: number | null;
  currentHumidity: number | null;
  currentFeelsLike: number | null;
} {
  const nearestObservation =
    weeklySeries?.observations.find((o) => o.isForecast === true) ??
    (weeklySeries !== null && weeklySeries.observations.length > 0
      ? weeklySeries.observations[weeklySeries.observations.length - 1]
      : null);
  const currentCondition =
    nearestObservation != null
      ? deriveWeatherCondition({
          temperature: nearestObservation.temperature,
          precipitation: nearestObservation.precipitation,
          windSpeed: nearestObservation.windSpeed,
          cloudCoverPercent: nearestObservation.cloudCoverPercent,
          timestamp: nearestObservation.timestamp,
          chanceOfRain: nearestObservation.chanceOfRain,
        })
      : null;
  const currentSkyCondition =
    nearestObservation != null
      ? deriveWeatherCondition({
          temperature: nearestObservation.temperature,
          precipitation: nearestObservation.precipitation,
          windSpeed: null,
          cloudCoverPercent: nearestObservation.cloudCoverPercent,
          timestamp: nearestObservation.timestamp,
          chanceOfRain: nearestObservation.chanceOfRain,
        })
      : null;
  const currentTemperature = nearestObservation?.temperature ?? null;
  const currentHumidity = nearestObservation?.relativeHumidity ?? null;
  const currentFeelsLike =
    nearestObservation != null
      ? deriveFeelsLike({
          temperature: nearestObservation.temperature,
          windSpeed: nearestObservation.windSpeed,
          relativeHumidity: nearestObservation.relativeHumidity ?? null,
        })
      : null;
  return { nearestObservation, currentCondition, currentSkyCondition, currentTemperature, currentHumidity, currentFeelsLike };
}
