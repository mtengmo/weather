import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { isNight, type WeatherCondition } from "../services/weatherCondition";
import { resolveConditionIconFromCondition } from "./smhiSymbolIcons";
import { resolveCharacterIcon } from "./weatherCharacterIcons";
import { convertTemperature, convertWaterLevel, convertWaveHeight, convertWindSpeed } from "../services/units";
import { directionToCompass, formatValue } from "../services/format";
import { formatClockTime } from "../services/timeFormat";
import { getSunTimes } from "../services/sunMoon";
import { SEA_WEATHER_URL, type SeaMetric } from "../services/seaObservations";
import type { Location, UnitSystem } from "../models/types";
import type { SeaSummary } from "./seaTimelineData";

export interface SeaStationInfo {
  name: string;
  distanceKm: number;
  /** Epoch ms of the station's latest reading. */
  time: number;
}

export type SeaSummaryMetricStations = Partial<Record<SeaMetric, { name: string; distanceKm: number }>>;

interface SeaSummaryCardProps {
  metricStations?: SeaSummaryMetricStations;
  summary: SeaSummary | null;
  unit: UnitSystem;
  location: Pick<Location, "latitude" | "longitude">;
  stations: SeaStationInfo[];
  currentCondition: WeatherCondition | null;
  currentTemperature: number | null;
  currentSymbolCode: number | null;
  currentTimestamp: string | null;
}

interface Fact {
  key: string;
  label: string;
  value: string;
  compass?: string;
  /** Small muted source line (station + distance, or "model"). */
  source?: string;
}

export default function SeaSummaryCard({
  metricStations = {},
  summary,
  unit,
  location,
  stations,
  currentCondition,
  currentTemperature,
  currentSymbolCode,
  currentTimestamp,
}: SeaSummaryCardProps) {
  const { t } = useTranslation();
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  const imperial = unit === "imperial";
  const lengthUnit = imperial ? "ft" : "m";
  const speedUnit = imperial ? "mph" : "m/s";
  const levelUnit = imperial ? "in" : "cm";

  const characterTemperature = currentTemperature;
  const iconInfo = resolveConditionIconFromCondition(
    currentSymbolCode,
    currentCondition,
    isNight(currentTimestamp ?? new Date().toISOString()),
    characterTemperature
  );
  const characterIcon = resolveCharacterIcon(currentCondition, characterTemperature);
  const conditionLabel = iconInfo ? t(iconInfo.label) : "—";

  const height = (m: number) => `${formatValue(convertWaveHeight(m, unit), 1)} ${lengthUnit}`;
  const speed = (ms: number, decimals = 0) => `${formatValue(convertWindSpeed(ms, unit), decimals)}`;
  const level = (cm: number) => {
    const v = convertWaterLevel(cm, unit) as number;
    return `${v > 0 ? "+" : ""}${formatValue(v, 0)}`;
  };
  const clock = (ms: number) => formatClockTime(new Date(ms));
  const compass = (deg: number | null | undefined) => (deg != null ? directionToCompass(deg) : undefined);

  const sourceFor = (metric: SeaMetric, observed: boolean): string => {
    const st = metricStations[metric];
    return observed && st
      ? t("seaWeather.stationSub", { name: st.name, km: Math.round(st.distanceKm) })
      : t("seaWeather.modelSource");
  };

  const facts: Fact[] = [];
  if (summary?.wind) {
    const w = summary.wind;
    facts.push({
      key: "wind",
      label: t("seaWeather.wind"),
      value: `${speed(w.speed)}${w.gust != null ? ` (${speed(w.gust)})` : ""} ${speedUnit}`,
      compass: compass(w.direction),
    });
  }
  if (summary?.waves) {
    const w = summary.waves;
    facts.push({
      key: "waves",
      label: t("seaWeather.waves"),
      value: `${height(w.height)}${w.period != null ? ` · ${formatValue(w.period, 0)} s` : ""}`,
      compass: compass(w.direction),
      source: sourceFor("waveHeight", w.observed),
    });
  }
  if (summary?.seaTemperature) {
    facts.push({
      key: "seaTemperature",
      label: t("seaWeather.seaTemperature"),
      value: `${formatValue(convertTemperature(summary.seaTemperature.value, unit), 1)}°`,
      source: sourceFor("seaTemperature", summary.seaTemperature.observed),
    });
  }
  if (summary?.waterLevel) {
    facts.push({
      key: "waterLevel",
      label: t("seaWeather.waterLevel"),
      value: `${level(summary.waterLevel.value)} ${levelUnit}`,
      source: sourceFor("waterLevel", summary.waterLevel.observed),
    });
  }

  const { sunrise, sunset } = getSunTimes(location, new Date());
  const formatSun = (iso: string | null | undefined) => (iso ? formatClockTime(new Date(iso)) : "—");

  const details: Fact[] = [];
  if (summary?.swell) {
    const s = summary.swell;
    details.push({
      key: "swell",
      label: t("seaWeather.swell"),
      value: `${height(s.height)}${s.period != null ? ` · ${formatValue(s.period, 0)} s` : ""}`,
      compass: compass(s.direction),
    });
  }
  if (summary?.windWaveHeight != null) {
    details.push({ key: "windWaves", label: t("seaWeather.windWaves"), value: height(summary.windWaveHeight) });
  }
  if (summary?.current) {
    const c = summary.current;
    details.push({
      key: "current",
      label: t("seaWeather.current"),
      value: `${speed(c.speed, 1)} ${speedUnit}`,
      // A current is described by where it flows TOWARD.
      compass: compass(c.direction),
    });
  }
  if (summary?.next24h.maxWave) {
    const m = summary.next24h.maxWave;
    details.push({ key: "maxWave", label: t("seaWeather.maxWave24h"), value: `${height(m.value)}, ${clock(m.time)}` });
  }
  if (summary?.next24h.maxGust) {
    const g = summary.next24h.maxGust;
    details.push({
      key: "maxGust",
      label: t("seaWeather.maxGust24h"),
      value: `${speed(g.value)} ${speedUnit}, ${clock(g.time)}`,
    });
  }
  const { waterLevelMin, waterLevelMax } = summary?.next24h ?? { waterLevelMin: null, waterLevelMax: null };
  if (waterLevelMin !== null && waterLevelMax !== null) {
    details.push({
      key: "levelRange",
      label: t("seaWeather.waterLevelRange24h"),
      value: `${level(waterLevelMin)} … ${level(waterLevelMax)} ${levelUnit}`,
    });
  }
  details.push(
    { key: "sunrise", label: t("todaySummary.sunrise"), value: formatSun(sunrise) },
    { key: "sunset", label: t("todaySummary.sunset"), value: formatSun(sunset) }
  );

  return (
    <section className="today-summary-card sea-summary-card" aria-label={t("seaWeather.summaryTitle")}>
      <div className="today-summary-top">
        <div
          className={["today-summary-icon", currentCondition !== null ? `weather-condition-${currentCondition}` : null]
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
          {characterIcon ? <img src={characterIcon} alt="" aria-hidden="true" className="today-summary-character" /> : null}
        </div>
        <div className="today-summary-now-block">
          {currentTemperature != null && (
            <span className="today-summary-now">
              <span className="visually-hidden">{t("todaySummary.now")} </span>
              {formatValue(convertTemperature(currentTemperature, unit), 0)}°
            </span>
          )}
          <span className="today-summary-condition">{conditionLabel}</span>
        </div>
      </div>
      <dl className="today-summary-line">
        {facts.map((f) => (
          <div key={f.key} className="today-summary-pair">
            <dt className="today-summary-label">{f.label}</dt>
            <dd className="today-summary-value">
              {f.value}
              {f.compass ? ` ${f.compass}` : ""}
              {f.source && <span className="sea-summary-pair-source">{f.source}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div className="today-summary-footer">
        <span />
        <button
          type="button"
          className="today-summary-more"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((v) => !v)}
        >
          <span>{expanded ? t("todaySummary.less") : t("todaySummary.more")}</span>
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
              <dd className="today-summary-value">
                {d.value}
                {d.compass ? ` ${d.compass}` : ""}
              </dd>
            </div>
          ))}
          {stations.length > 0 && (
            <div className="today-summary-pair">
              <dt className="today-summary-label">{t("seaWeather.stations")}</dt>
              <dd className="today-summary-value">
                {stations.map((s) => (
                  <span key={s.name} className="sea-summary-station">
                    {t("seaWeather.stationAt", { name: s.name, km: Math.round(s.distanceKm), time: clock(s.time) })}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <p className="sea-summary-source">
        {t("seaWeather.sourceNote")}{" "}
        <a href={SEA_WEATHER_URL} target="_blank" rel="noopener noreferrer">
          {t("seaWeather.forecastLink")}
        </a>
      </p>
    </section>
  );
}
