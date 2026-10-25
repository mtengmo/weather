import { ConditionArtwork } from "./WindBadge";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { deriveWeatherCondition, isNight, isWindy, type WeatherCondition } from "../services/weatherCondition";
import { resolveConditionIconFromCondition } from "./smhiSymbolIcons";
import { resolveCharacterIcon } from "./weatherCharacterIcons";
import { convertTemperature, convertPrecipitation, convertWindSpeed } from "../services/units";
import { directionToCompass, formatValue } from "../services/format";
import { formatClockTime } from "../services/timeFormat";
import { getMoonPhase, getSunTimes } from "../services/sunMoon";
import type { RestOfDayAggregate } from "../services/dailyAggregation";
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
  /** High / Low / Rain / Wind over the rest of today (start of the current hour to the next local
   *  midnight) — one shared window for all four. When omitted, falls back to `today`'s own
   *  rolling-bucket values. */
  restOfDay?: RestOfDayAggregate | null;
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
  /** SMHI symbol code and timestamp of the SAME observation `currentTemperature`/`currentCondition`
   *  come from. The icon and character are derived from these exactly as the timeline derives its
   *  Now column (symbol code, day/night by the observation's own timestamp), so the two can never
   *  disagree. Both optional: without them the card falls back to condition + wall-clock time. */
  currentSymbolCode?: number | null;
  currentTimestamp?: string | null;
  /** Wind of the SAME nearest observation (matches the "now" picture, not the rest-of-day average),
   *  and that observation's sky-only condition — together they select the windy artwork. */
  currentWindSpeed?: number | null;
  currentSkyCondition?: WeatherCondition | null;
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
  restOfDay,
  informationalWarnings,
  currentHumidity,
  currentSymbolCode,
  currentTimestamp,
  currentWindSpeed,
  currentSkyCondition,
}: TodaySummaryCardProps) {
  const { t } = useTranslation();
  const detailsId = useId();
  // Session-only: the card always starts collapsed (compact first screen).
  const [expanded, setExpanded] = useState(false);
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
    currentSymbolCode,
    condition,
    isNight(currentTimestamp ?? new Date().toISOString()),
    characterTemperature,
    isWindy(currentWindSpeed !== undefined ? currentWindSpeed : today.windAverage),
    currentSkyCondition ??
      deriveWeatherCondition({
        temperature: today.average,
        precipitation: today.totalPrecipitation,
        windSpeed: null,
        cloudCoverPercent: today.cloudAverage,
        chanceOfRain: today.chanceOfRainMax,
      })
  );
  const characterIcon = resolveCharacterIcon(condition, characterTemperature);
  const win = restOfDay ?? null;
  const high = win ? win.high : today.high;
  const low = win ? win.low : today.low;
  const rainTotal = win ? win.totalPrecipitation : today.totalPrecipitation;
  const windAverage = win ? win.windAverage : today.windAverage;
  const windDirection = win ? win.windDirection : today.windDirection;
  const { sunrise, sunset } = getSunTimes(location, new Date());
  const moonPhase = getMoonPhase(new Date());
  const formatClock = (iso: string | null | undefined) => (iso ? formatClockTime(new Date(iso)) : "—");
  const conditionLabel = iconInfo ? t(iconInfo.label) : "—";

  const summaryFacts: Array<{ key: string; label: string; value: string }> = [
    {
      key: "rain",
      label: t("todaySummary.rain"),
      value: `${formatValue(convertPrecipitation(rainTotal, unit), 1)}${unit === "imperial" ? " in" : " mm"}`,
    },
    {
      key: "wind",
      label: t("todaySummary.wind"),
      value: `${formatValue(convertWindSpeed(windAverage, unit), 0)}${unit === "imperial" ? " mph" : " m/s"}${
        windDirection != null ? ` ${directionToCompass(windDirection)}` : ""
      }`,
    },
  ];
  const details: Array<{ key: string; label: string; value: string }> = [
    { key: "sunrise", label: t("todaySummary.sunrise"), value: formatClock(sunrise) },
    { key: "sunset", label: t("todaySummary.sunset"), value: formatClock(sunset) },
    { key: "moon", label: t("todaySummary.moon"), value: t(`moonPhase.${moonPhase}`) },
  ];
  if (currentHumidity != null) {
    details.push({
      key: "humidity",
      label: t("todaySummary.humidity"),
      value: t(humidityLevelKey(currentHumidity)),
    });
  }
  const hasNotices = !!informationalWarnings && informationalWarnings.length > 0;

  return (
    <section className="today-summary-card" aria-label={t("todaySummary.title")}>
      <div className="today-summary-top">
        <div
          className={["today-summary-icon", condition !== null ? `weather-condition-${condition}` : null]
            .filter(Boolean)
            .join(" ")}
        >
          {iconInfo ? (
            iconInfo.kind === "smhi-symbol" ? (
              <ConditionArtwork icon={iconInfo} size={64} />
            ) : (
              <iconInfo.Icon aria-hidden="true" size={64} />
            )
          ) : null}
          {characterIcon ? (
            <img src={characterIcon} alt="" aria-hidden="true" className="today-summary-character" />
          ) : null}
        </div>
        <div className="today-summary-now-block">
          {currentTemperature != null && (
            <span className="today-summary-now">
              <span className="visually-hidden">{t("todaySummary.now")} </span>
              {formatValue(convertTemperature(currentTemperature, unit), 0)}°
            </span>
          )}
          <span className="today-summary-condition">{conditionLabel}</span>
          {currentTemperature != null && currentFeelsLike != null && (
            <span className="today-summary-feels">
              {t("todaySummary.feelsLike")} {formatValue(convertTemperature(currentFeelsLike, unit), 0)}°
            </span>
          )}
        </div>
      </div>
      <dl className="today-summary-line">
        <div className="today-summary-pair today-summary-high">
          <dt className="today-summary-label">{t("todaySummary.high")}</dt>
          <dd className="today-summary-value">{formatValue(convertTemperature(high, unit), 0)}°</dd>
        </div>
        <div className="today-summary-pair today-summary-low">
          <dt className="today-summary-label">{t("todaySummary.low")}</dt>
          <dd className="today-summary-value">{formatValue(convertTemperature(low, unit), 0)}°</dd>
        </div>
        {summaryFacts.map((d) => (
          <div key={d.key} className="today-summary-pair">
            <dt className="today-summary-label">{d.label}</dt>
            <dd className="today-summary-value">{d.value}</dd>
          </div>
        ))}
      </dl>
      <div className="today-summary-footer">
        {win ? <span className="today-summary-window">{t("todaySummary.restOfDay")}</span> : <span />}
        <button
          type="button"
          className="today-summary-more"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((v) => !v)}
        >
          <span>{expanded ? t("todaySummary.less") : t("todaySummary.more")}</span>
          {hasNotices && !expanded && (
            <>
              <span className="today-summary-notice-dot" aria-hidden="true" />
              <span className="visually-hidden">{t("todaySummary.noticesAvailable")}</span>
            </>
          )}
          <svg className="chevron" viewBox="0 0 12 12" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div id={detailsId} className="today-summary-extra" hidden={!expanded}>
        <dl className="today-summary-grid">
          {details.map((d) => (
            <div key={d.key} className="today-summary-pair">
              <dt className="today-summary-label">{d.label}</dt>
              <dd className="today-summary-value">{d.value}</dd>
            </div>
          ))}
        </dl>
        {hasNotices && (
          <div className="today-summary-notices">
            {informationalWarnings!.map((warning) => {
              const noticeExpanded = expandedNoticeIds.has(warning.id);
              return (
                <div key={warning.id} className="today-summary-notice">
                  <button
                    type="button"
                    className="today-summary-notice-toggle"
                    aria-expanded={noticeExpanded}
                    onClick={() => toggleNoticeExpanded(warning.id)}
                  >
                    <span className="today-summary-notice-title">{warning.title}</span>
                    <svg className="chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
                      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {noticeExpanded && <p className="today-summary-notice-detail">{warning.description}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
