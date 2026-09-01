import { useEffect, useRef } from "react";
import type { Location, ObservationSeries, ObservationWindow, UnitSystem } from "../models/types";
import { deriveWeatherCondition } from "../services/weatherCondition";
import { WEATHER_ICONS } from "./weatherIcons";
import { toDailyAggregates } from "../services/dailyAggregation";
import { convertPrecipitation, convertTemperature, convertWindSpeed } from "../services/units";
import { formatValue } from "../services/format";

const DAILY_BUCKET_COUNT = 7;

interface WeatherIconOverviewProps {
  location: Location;
  window: ObservationWindow;
  onWindowChange: (window: ObservationWindow) => void;
  unit: UnitSystem;
  series: ObservationSeries | null; // null while loading
  onBack: () => void;
}

// The overview only supports 24h/7d (007-weather-icon-overview spec Edge Cases) — 30-day
// is out of scope, so its own window toggle never offers that option.
const OVERVIEW_WINDOWS: { value: ObservationWindow; label: string }[] = [
  { value: "last-24-hours", label: "Last 24 hours" },
  { value: "last-7-days", label: "Last 7 days" },
];

interface OverviewCell {
  key: string;
  label: string;
  condition: ReturnType<typeof deriveWeatherCondition>;
  isForecast: boolean;
  temperature: number | null;
  /** Daily cells only — shown instead of a single temperature when present (FR-005). */
  high?: number | null;
  low?: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  cloudCoverPercent: number | null;
}

function formatTemp(value: number | null, unit: UnitSystem): string {
  if (value === null) return formatValue(value);
  return `${formatValue(value, 0)}°${unit === "imperial" ? "F" : "C"}`;
}

function formatWind(value: number | null, unit: UnitSystem): string {
  if (value === null) return formatValue(value);
  return `${formatValue(value)} ${unit === "imperial" ? "mph" : "m/s"}`;
}

function formatPrecip(value: number | null, unit: UnitSystem): string {
  if (value === null) return formatValue(value);
  return `${formatValue(value)} ${unit === "imperial" ? "in" : "mm"}`;
}

function formatCloud(value: number | null): string {
  if (value === null) return formatValue(value);
  return `${formatValue(value, 0)}%`;
}

function OverviewCard({ cell, unit }: { cell: OverviewCell; unit: UnitSystem }) {
  const iconInfo = cell.condition !== null ? WEATHER_ICONS[cell.condition] : null;

  return (
    <div
      className={`weather-overview-cell${cell.isForecast ? " forecast-row" : ""}`}
      aria-label={`${cell.label}: ${iconInfo ? iconInfo.label : "No data"}${cell.isForecast ? " (forecast)" : ""}`}
    >
      <div className="weather-overview-cell-label">{cell.label}</div>
      {iconInfo ? (
        <iconInfo.Icon aria-hidden="true" size={40} />
      ) : (
        <div className="weather-overview-no-data" aria-hidden="true">
          —
        </div>
      )}
      <div className="weather-overview-cell-condition">{iconInfo ? iconInfo.label : "No data"}</div>
      {cell.isForecast && <div className="weather-overview-cell-forecast">Forecast</div>}
      <div className="weather-overview-cell-values">
        {cell.high !== undefined ? (
          <span>
            {formatTemp(convertTemperature(cell.high, unit), unit)} / {formatTemp(convertTemperature(cell.low ?? null, unit), unit)}
          </span>
        ) : (
          <span>{formatTemp(convertTemperature(cell.temperature, unit), unit)}</span>
        )}
        {cell.precipitation !== null && <span>{formatPrecip(convertPrecipitation(cell.precipitation, unit), unit)}</span>}
        {cell.windSpeed !== null && <span>{formatWind(convertWindSpeed(cell.windSpeed, unit), unit)}</span>}
        {cell.cloudCoverPercent !== null && <span>{formatCloud(cell.cloudCoverPercent)}</span>}
      </div>
    </div>
  );
}

export default function WeatherIconOverview({
  location,
  window,
  onWindowChange,
  unit,
  series,
  onBack,
}: WeatherIconOverviewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Mirrors ObservationChart/ObservationDetails: move focus to this view's heading when
    // it becomes the active view.
    headingRef.current?.focus();
  }, []);

  const hourlyCells: OverviewCell[] =
    series !== null && series.status === "ready" && window === "last-24-hours"
      ? series.observations.map((obs) => ({
          key: obs.timestamp,
          label: new Date(obs.timestamp).toLocaleTimeString([], { hour: "2-digit" }),
          condition: deriveWeatherCondition({
            temperature: obs.temperature,
            precipitation: obs.precipitation,
            windSpeed: obs.windSpeed,
            cloudCoverPercent: obs.cloudCoverPercent,
            timestamp: obs.timestamp,
          }),
          isForecast: obs.isForecast ?? false,
          temperature: obs.temperature,
          precipitation: obs.precipitation,
          windSpeed: obs.windSpeed,
          cloudCoverPercent: obs.cloudCoverPercent,
        }))
      : [];

  const dailyCells: OverviewCell[] =
    series !== null && series.status === "ready" && window === "last-7-days"
      ? toDailyAggregates(series.observations, DAILY_BUCKET_COUNT).map((day) => ({
          key: day.bucketEnd,
          label: new Date(day.bucketEnd).toLocaleDateString([], { weekday: "short" }),
          // No timestamp passed: a clear day always shows the sun, never the moon
          // (research.md §3) — a whole day inherently spans both.
          condition: deriveWeatherCondition({
            temperature: day.average,
            precipitation: day.totalPrecipitation,
            windSpeed: day.windAverage,
            cloudCoverPercent: day.cloudAverage,
          }),
          isForecast: day.isForecast ?? false,
          temperature: day.average,
          high: day.high,
          low: day.low,
          precipitation: day.totalPrecipitation,
          windSpeed: day.windAverage,
          cloudCoverPercent: day.cloudAverage,
        }))
      : [];

  return (
    <section aria-label={`Weather overview for ${location.displayName}`} className="weather-overview">
      <div className="app-header">
        <h2 ref={headingRef} tabIndex={-1}>
          {location.displayName} — overview
        </h2>
        <button type="button" onClick={onBack}>
          Back to graph
        </button>
      </div>

      <div className="window-toggle" role="group" aria-label="Overview window">
        {OVERVIEW_WINDOWS.map((w) => (
          <button
            key={w.value}
            type="button"
            aria-pressed={window === w.value}
            onClick={() => onWindowChange(w.value)}
          >
            {w.label}
          </button>
        ))}
      </div>

      {series === null && <p role="status">Loading weather overview…</p>}

      {series !== null && series.status === "unavailable" && (
        <p className="error-banner" role="alert">
          Weather data is unavailable for this location right now. Please try again later.
        </p>
      )}

      {series !== null && series.status === "ready" && window === "last-24-hours" && (
        <div className="weather-overview-grid">
          {hourlyCells.map((cell) => (
            <OverviewCard key={cell.key} cell={cell} unit={unit} />
          ))}
        </div>
      )}

      {series !== null && series.status === "ready" && window === "last-7-days" && (
        <div className="weather-overview-grid">
          {dailyCells.map((cell) => (
            <OverviewCard key={cell.key} cell={cell} unit={unit} />
          ))}
        </div>
      )}
    </section>
  );
}
