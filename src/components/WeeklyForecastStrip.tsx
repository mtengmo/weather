import { useTranslation } from "react-i18next";
import { deriveDailyCondition } from "../services/weatherCondition";
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
        // Shared with the 7-day overview (069-fix-7day-graph-rain) so the two can never
        // independently drift apart on whether a given day shows rain — see
        // `deriveDailyCondition`'s own doc comment for the daytime-weighting rule itself.
        const condition = deriveDailyCondition(day);
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
