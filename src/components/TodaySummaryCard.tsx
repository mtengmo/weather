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

/**
 * Persistent "Today" summary — high/low, description, rain, wind+compass, sunrise/sunset —
 * shown on all three overview tabs, not just the daily one (018-dashboard-visual-redesign, US4).
 */
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
        <span className="today-summary-high">High {formatValue(convertTemperature(today.high, unit), 0)}°</span>
        <span className="today-summary-low">Low {formatValue(convertTemperature(today.low, unit), 0)}°</span>
      </div>
      <p className="today-summary-description">{iconInfo ? `${iconInfo.label}.` : "—"}</p>
      <div className="today-summary-detail">
        <span>
          Rain {formatValue(convertPrecipitation(today.totalPrecipitation, unit), 1)}
          {unit === "imperial" ? " in" : " mm"}
        </span>
        <span>
          Wind {formatValue(convertWindSpeed(today.windAverage, unit), 0)}
          {unit === "imperial" ? " mph" : " m/s"}
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
