import { deriveWeatherCondition } from "../services/weatherCondition";
import { resolveConditionIconFromCondition } from "./smhiSymbolIcons";
import { convertTemperature } from "../services/units";
import { formatValue } from "../services/format";
import type { DailyAggregate, UnitSystem } from "../models/types";

interface WeeklyForecastStripProps {
  days: DailyAggregate[];
  unit: UnitSystem;
}

/**
 * Persistent 7-day forecast strip — one card per day `toDailyAggregates` returned, never
 * fabricated beyond that (018-dashboard-visual-redesign, US5).
 */
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
          chanceOfRain: day.chanceOfRainMax,
        });
        const iconInfo = resolveConditionIconFromCondition(undefined, condition, false, day.average);
        return (
          <div
            className={[
              "weekly-forecast-day",
              condition !== null ? `weather-condition-${condition}` : null,
            ]
              .filter(Boolean)
              .join(" ")}
            key={day.bucketEnd}
          >
            <span className="weekly-forecast-weekday">
              {new Date(day.bucketEnd).toLocaleDateString([], { weekday: "short" })}
            </span>
            {iconInfo ? (
              iconInfo.kind === "smhi-symbol" ? (
                <img src={iconInfo.src} alt="" aria-hidden="true" width={28} height={28} />
              ) : (
                <iconInfo.Icon aria-hidden="true" size={28} />
              )
            ) : (
              <span aria-hidden="true">—</span>
            )}
            <span className="weekly-forecast-highlow">
              {formatValue(convertTemperature(day.high, unit), 0)}° /{" "}
              {formatValue(convertTemperature(day.low, unit), 0)}°
            </span>
          </div>
        );
      })}
    </section>
  );
}
