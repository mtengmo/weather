import { useState } from "react";
import { useTranslation } from "react-i18next";
import { deriveWeatherCondition, isNight, type WeatherCondition } from "../services/weatherCondition";
import { resolveConditionIconFromCondition } from "./smhiSymbolIcons";
import { resolveCharacterIcon } from "./weatherCharacterIcons";
import { convertTemperature, convertPrecipitation, convertWindSpeed } from "../services/units";
import { directionToCompass, formatValue } from "../services/format";
import { getMoonPhase, getSunTimes } from "../services/sunMoon";
import type { DailyAggregate, Location, UnitSystem, WeatherWarning } from "../models/types";

interface TodaySummaryCardProps {
  today: DailyAggregate | null;
  unit: UnitSystem;
  location: Pick<Location, "latitude" | "longitude">;
  /** The right-now condition (from the latest actual observation), shown instead of the day-long
   *  bucket's own whole-day-average condition when available — averaging cloud cover across the
   *  entire next 24 hours could label the card "Cloudy" while it's clearly sunny at this moment,
   *  disagreeing with the header's own current-conditions reading right above it (027 follow-up).
   *  Falls back to the whole-day average when there's no current reading (e.g. still loading). */
  currentCondition?: WeatherCondition | null;
  /** The latest actual reading's raw temperature — shown as "Now" alongside High/Low, moved down
   *  from the header's own former "current conditions" display (037-header-controls-and-chart-
   *  fixes follow-up: that display crowded the header and caused it to wrap with a long location
   *  name). `null`/`undefined` when there's no current reading yet (e.g. still loading). */
  currentTemperature?: number | null;
  /** Feels-like companion to `currentTemperature`, same "Now" line. */
  currentFeelsLike?: number | null;
  /** Precipitation summed over today's local calendar day (midnight to midnight) — used for the
   *  rain figure instead of `today.totalPrecipitation`'s own rolling next-24h window, which can
   *  include part of tomorrow (033-todays-rain-total). `null` renders the same "—" gap treatment
   *  a missing value already gets. */
  todaysRainTotalMm?: number | null;
  /** Active SMHI Message-level warnings for this location — a background advisory (e.g. "risk of
   *  water shortage"), not a time-bound weather danger, so it lives here as everyday context
   *  rather than in the standalone alert banner, and isn't individually dismissible
   *  (048-split-informational-smhi). */
  informationalWarnings?: WeatherWarning[];
  /** The same "current reading" used for `currentTemperature`/`currentCondition`'s relative
   *  humidity, classified into a plain-language level rather than shown as a raw percentage
   *  (050-show-humidity-level). `null`/`undefined` when there's no current reading with a
   *  humidity value — renders nothing, same as the other optional "Now"-derived fields. */
  currentHumidity?: number | null;
}

function humidityLevelKey(percent: number): "todaySummary.humidityDry" | "todaySummary.humidityNormal" | "todaySummary.humidityHigh" {
  if (percent < 30) return "todaySummary.humidityDry";
  if (percent <= 70) return "todaySummary.humidityNormal";
  return "todaySummary.humidityHigh";
}

/**
 * Persistent "Today" summary — high/low, description, rain, wind+compass, sunrise/sunset, moon
 * phase — shown on all three overview tabs, not just the daily one (018-dashboard-visual-
 * redesign, US4). Moon phase moved here from its own row above the timeline
 * (041-move-moon-to-today-card), alongside Sunrise/Sunset which already lived here.
 */
export default function TodaySummaryCard({
  today,
  unit,
  location,
  currentCondition,
  currentTemperature,
  currentFeelsLike,
  todaysRainTotalMm,
  informationalWarnings,
  currentHumidity,
}: TodaySummaryCardProps) {
  const { t } = useTranslation();
  const [expandedNoticeIds, setExpandedNoticeIds] = useState<Set<string>>(new Set());

  if (today === null) return null;

  function toggleNoticeExpanded(id: string) {
    setExpandedNoticeIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const dayCondition = deriveWeatherCondition({
    temperature: today.average,
    precipitation: today.totalPrecipitation,
    windSpeed: today.windAverage,
    cloudCoverPercent: today.cloudAverage,
    chanceOfRain: today.chanceOfRainMax,
  });
  const condition = currentCondition ?? dayCondition;
  // Falls back to today's high/low midpoint when there's no current reading, rather than omitting
  // the icon/character outright (061-cartoon-weather-companion, US3; research.md §5).
  const characterTemperature =
    currentTemperature ?? (today.high != null && today.low != null ? (today.high + today.low) / 2 : null);
  const iconInfo = resolveConditionIconFromCondition(
    undefined,
    condition,
    isNight(new Date().toISOString()),
    characterTemperature
  );
  const characterIcon = resolveCharacterIcon(condition, characterTemperature);
  const rainTotal = todaysRainTotalMm !== undefined ? todaysRainTotalMm : today.totalPrecipitation;
  const { sunrise, sunset } = getSunTimes(location, new Date());
  const moonPhase = getMoonPhase(new Date());
  const timeFormat: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

  return (
    <section className="today-summary-card" aria-label={t("todaySummary.title")}>
      <div
        className={["today-summary-icon", condition !== null ? `weather-condition-${condition}` : null]
          .filter(Boolean)
          .join(" ")}
      >
        {iconInfo ? (
          iconInfo.kind === "smhi-symbol" ? (
            <img src={iconInfo.src} alt="" aria-hidden="true" width={64} height={64} />
          ) : (
            <iconInfo.Icon aria-hidden="true" size={64} />
          )
        ) : null}
        {characterIcon ? (
          <img src={characterIcon} alt="" aria-hidden="true" className="today-summary-character" />
        ) : null}
      </div>
      <div className="today-summary-highlow">
        {currentTemperature != null && (
          <span className="today-summary-now">
            {t("todaySummary.now")} {formatValue(convertTemperature(currentTemperature, unit), 0)}°
            {currentFeelsLike != null &&
              ` (${t("todaySummary.feelsLike")} ${formatValue(convertTemperature(currentFeelsLike, unit), 0)}°)`}
          </span>
        )}
        <span className="today-summary-high">
          {t("todaySummary.high")} {formatValue(convertTemperature(today.high, unit), 0)}°
        </span>
        <span className="today-summary-low">
          {t("todaySummary.low")} {formatValue(convertTemperature(today.low, unit), 0)}°
        </span>
      </div>
      <p className="today-summary-description">{iconInfo ? `${t(iconInfo.label)}.` : "—"}</p>
      <div className="today-summary-detail">
        <span>
          {t("todaySummary.rain")} {formatValue(convertPrecipitation(rainTotal, unit), 1)}
          {unit === "imperial" ? " in" : " mm"}
        </span>
        <span>
          {t("todaySummary.wind")} {formatValue(convertWindSpeed(today.windAverage, unit), 0)}
          {unit === "imperial" ? " mph" : " m/s"}
          {today.windDirection != null && ` ${directionToCompass(today.windDirection)}`}
        </span>
      </div>
      <div className="today-summary-detail">
        <span>
          {t("todaySummary.sunrise")} {sunrise ? new Date(sunrise).toLocaleTimeString([], timeFormat) : "—"}
        </span>
        <span>
          {t("todaySummary.sunset")} {sunset ? new Date(sunset).toLocaleTimeString([], timeFormat) : "—"}
        </span>
        <span>
          {t("todaySummary.moon")} {t(`moonPhase.${moonPhase}`)}
        </span>
        {currentHumidity != null && (
          <span>
            {t("todaySummary.humidity")} {t(humidityLevelKey(currentHumidity))}
          </span>
        )}
      </div>
      {informationalWarnings && informationalWarnings.length > 0 && (
        <div className="today-summary-notices">
          {informationalWarnings.map((warning) => {
            const expanded = expandedNoticeIds.has(warning.id);
            return (
              <div key={warning.id} className="today-summary-notice">
                <button
                  type="button"
                  className="today-summary-notice-toggle"
                  aria-expanded={expanded}
                  onClick={() => toggleNoticeExpanded(warning.id)}
                >
                  {warning.title}
                </button>
                {expanded && <p className="today-summary-notice-detail">{warning.description}</p>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
