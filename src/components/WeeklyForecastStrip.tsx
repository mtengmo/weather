import { useTranslation } from "react-i18next";
import { deriveWeatherCondition, PRECIPITATION_HEAVY_THRESHOLD_MM } from "../services/weatherCondition";
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
        // A brief morning shower alone can still push `daytimeTotalPrecipitation` above zero —
        // that sum doesn't distinguish "rain for a couple of hours" from "rain most of the day"
        // (067-fix-rain-brief-icons, data-model.md). Only let it drive the day's condition when
        // rain covers a majority of the day's daytime hours, or a single hour was heavy enough to
        // matter on its own — otherwise treat the day's daytime precipitation as zero for
        // condition purposes only; every other input, and the whole-bucket fallback below when
        // there's no daytime data at all, is unchanged.
        const dayRainIsMeaningful =
          day.daytimeHourCount != null &&
          day.daytimeRainHourCount != null &&
          (day.daytimeRainHourCount / day.daytimeHourCount > 0.5 ||
            (day.daytimeMaxHourlyPrecipitation ?? 0) >= PRECIPITATION_HEAVY_THRESHOLD_MM);
        const daytimePrecipitationForCondition = dayRainIsMeaningful ? day.daytimeTotalPrecipitation : 0;
        const condition = deriveWeatherCondition({
          temperature: (hasDaytimeData ? day.daytimeAverage : day.average) ?? null,
          precipitation: (hasDaytimeData ? daytimePrecipitationForCondition : day.totalPrecipitation) ?? null,
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
