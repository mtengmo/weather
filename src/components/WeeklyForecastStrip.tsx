import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  if (days.length === 0) return null;

  return (
    <section className="weekly-forecast-strip" aria-label={t("weeklyForecastStrip.ariaLabel")}>
      {days.map((day) => {
        // Driven by the day's daytime hours (6 AM-8 PM local) rather than the whole rolling 24h
        // bucket, so an overnight-only shower doesn't make an otherwise-dry day show as rain
        // (066-daily-forecast-language-setting) — falls back to the whole-bucket fields when a
        // bucket has no daytime observations at all (e.g. sparse forecast data), so a day never
        // ends up with no computable condition.
        const hasDaytimeData =
          day.daytimeAverage != null ||
          day.daytimeTotalPrecipitation != null ||
          day.daytimeWindAverage != null ||
          day.daytimeCloudAverage != null ||
          day.daytimeChanceOfRainMax != null;
        const condition = deriveWeatherCondition({
          temperature: (hasDaytimeData ? day.daytimeAverage : day.average) ?? null,
          precipitation: (hasDaytimeData ? day.daytimeTotalPrecipitation : day.totalPrecipitation) ?? null,
          windSpeed: (hasDaytimeData ? day.daytimeWindAverage : day.windAverage) ?? null,
          cloudCoverPercent: (hasDaytimeData ? day.daytimeCloudAverage : day.cloudAverage) ?? null,
          chanceOfRain: (hasDaytimeData ? day.daytimeChanceOfRainMax : day.chanceOfRainMax) ?? null,
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
                <img src={iconInfo.src} alt="" aria-hidden="true" width={44} height={44} />
              ) : (
                <iconInfo.Icon aria-hidden="true" size={44} />
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
