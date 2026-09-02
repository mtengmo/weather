import { useEffect, useRef } from "react";
import type { Location, ObservationSeries, ObservationWindow, UnitSystem } from "../models/types";
import {
  buildDailyTimelineData,
  buildHourlyTimelineData,
  type TimelineData,
  type TimelinePeriod,
  type TimelineRow,
} from "./timelineData";
import { WEATHER_ICONS } from "./weatherIcons";
import { getMoonPhase, getSunTimes } from "../services/sunMoon";
import { formatValue } from "../services/format";

interface WeatherIconOverviewProps {
  location: Location;
  window: ObservationWindow;
  onWindowChange: (window: ObservationWindow) => void;
  unit: UnitSystem;
  series: ObservationSeries | null; // null while loading
  onBack: () => void;
}

// The overview only supports 24h/7d (007 spec Edge Cases, unchanged by 008) — 30-day is out
// of scope, so its own window toggle never offers that option.
const OVERVIEW_WINDOWS: { value: ObservationWindow; label: string }[] = [
  { value: "last-24-hours", label: "Last 24 hours" },
  { value: "last-7-days", label: "Last 7 days" },
];

function xPercent(index: number, count: number): number {
  return ((index + 0.5) / count) * 100;
}

/** One shared grid row: N equal columns, matching every other row's column math exactly. */
function PeriodGrid({
  periods,
  children,
  className,
}: {
  periods: TimelinePeriod[];
  children: (period: TimelinePeriod, index: number) => React.ReactNode;
  className: string;
}) {
  return (
    <div
      className={className}
      style={{ gridTemplateColumns: `repeat(${periods.length}, 1fr)` }}
    >
      {periods.map((period, i) => (
        <div key={period.key} className="weather-timeline-cell">
          {children(period, i)}
        </div>
      ))}
    </div>
  );
}

function formatRowValue(row: TimelineRow, value: number): string {
  const decimals = row.key === "temperature" || row.key === "feelsLike" || row.key === "cloud" ? 0 : 1;
  return `${formatValue(value, decimals)}${row.unitLabel === "%" ? row.unitLabel : ` ${row.unitLabel}`}`;
}

interface Pt {
  x: number;
  y: number;
  isForecast: boolean;
}

function buildSegments(row: TimelineRow): Pt[][] {
  const n = row.points.length;
  const values = row.points.map((p) => p.value);
  const nonNull = values.filter((v): v is number => v !== null);
  if (nonNull.length === 0) return [];

  const min = Math.min(...nonNull);
  const max = Math.max(...nonNull);
  const range = max - min || 1;
  const yFor = (v: number) => 90 - ((v - min) / range) * 80; // keep within a 10-90 vertical band

  const segments: Pt[][] = [];
  let current: Pt[] = [];
  row.points.forEach((p, i) => {
    if (p.value === null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: xPercent(i, n), y: yFor(p.value), isForecast: p.isForecast });
  });
  if (current.length) segments.push(current);
  return segments;
}

function toPointsAttr(points: Pt[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

/** Splits one contiguous (non-gap) segment into its observed/forecast sub-polylines,
 * bridging the boundary point so the dashed segment visually connects (006 convention). */
function splitObservedForecast(segment: Pt[]): { observed: Pt[]; forecast: Pt[] } {
  const transitionIdx = segment.findIndex((p) => p.isForecast);
  if (transitionIdx === -1) return { observed: segment, forecast: [] };
  if (transitionIdx === 0) return { observed: [], forecast: segment };
  return {
    observed: segment.slice(0, transitionIdx),
    forecast: [segment[transitionIdx - 1], ...segment.slice(transitionIdx)],
  };
}

function LineRow({ row, periods }: { row: TimelineRow; periods: TimelinePeriod[] }) {
  if (!row.available) return null;
  const segments = buildSegments(row);

  return (
    <div className="weather-timeline-row weather-timeline-row-label-wrap">
      <div className="weather-timeline-row-title">
        {row.label} <span className="weather-timeline-row-unit">({row.unitLabel})</span>
      </div>
      <div className="weather-timeline-line-area">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="weather-timeline-svg" aria-hidden="true">
          {segments.map((segment, si) => {
            const { observed, forecast } = splitObservedForecast(segment);
            return (
              <g key={si}>
                {observed.length > 1 && (
                  <polyline points={toPointsAttr(observed)} className="weather-timeline-line-observed" />
                )}
                {forecast.length > 1 && (
                  <polyline points={toPointsAttr(forecast)} className="weather-timeline-line-forecast" />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <PeriodGrid periods={periods} className="weather-timeline-row weather-timeline-row-grid">
        {(_period, i) => {
          const point = row.points[i];
          return point.value === null ? (
            <span className="weather-timeline-gap" aria-label="No data">—</span>
          ) : (
            <span>{formatRowValue(row, point.value)}</span>
          );
        }}
      </PeriodGrid>
    </div>
  );
}

function BarRow({ row, periods }: { row: TimelineRow; periods: TimelinePeriod[] }) {
  if (!row.available) return null;
  const values = row.points.map((p) => p.value).filter((v): v is number => v !== null);
  const max = values.length > 0 ? Math.max(...values, 0.001) : 1;

  return (
    <div className="weather-timeline-row weather-timeline-row-label-wrap">
      <div className="weather-timeline-row-title">
        {row.label} <span className="weather-timeline-row-unit">({row.unitLabel})</span>
      </div>
      <PeriodGrid periods={periods} className="weather-timeline-row weather-timeline-row-grid weather-timeline-row-bars">
        {(_period, i) => {
          const point = row.points[i];
          if (point.value === null) {
            return <span className="weather-timeline-gap" aria-label="No data">—</span>;
          }
          const heightPercent = Math.max(2, (point.value / max) * 100);
          return (
            <div className="weather-timeline-bar-cell">
              <div
                className={`weather-timeline-bar${point.isForecast ? " weather-timeline-bar-forecast" : ""}`}
                style={{ height: `${heightPercent}%` }}
              />
              <span className="weather-timeline-bar-value">{formatRowValue(row, point.value)}</span>
            </div>
          );
        }}
      </PeriodGrid>
    </div>
  );
}

function WindRow({ row, periods }: { row: TimelineRow; periods: TimelinePeriod[] }) {
  return (
    <div className="weather-timeline-row weather-timeline-row-label-wrap">
      <div className="weather-timeline-row-title">
        {row.label} <span className="weather-timeline-row-unit">({row.unitLabel})</span>
      </div>
      <PeriodGrid periods={periods} className="weather-timeline-row weather-timeline-row-grid">
        {(_period, i) => {
          const point = row.points[i];
          if (point.value === null) {
            return <span className="weather-timeline-gap" aria-label="No data">—</span>;
          }
          // Meteorological direction is where wind blows FROM — rotate +180deg so the arrow
          // visually points where the wind is blowing TOWARD (the intuitive reading).
          const arrowRotation = point.direction != null ? (point.direction + 180) % 360 : null;
          return (
            <span className="weather-timeline-wind-cell">
              {arrowRotation !== null && (
                <span
                  className="weather-timeline-wind-arrow"
                  style={{ transform: `rotate(${arrowRotation}deg)` }}
                  aria-hidden="true"
                >
                  ↑
                </span>
              )}
              {formatRowValue(row, point.value)}
            </span>
          );
        }}
      </PeriodGrid>
    </div>
  );
}

function ConditionRow({ periods }: { periods: TimelinePeriod[] }) {
  return (
    <PeriodGrid periods={periods} className="weather-timeline-row weather-timeline-row-grid weather-timeline-row-condition">
      {(period) => {
        const iconInfo = period.condition !== null ? WEATHER_ICONS[period.condition] : null;
        return (
          <div
            className={`weather-timeline-condition${period.isForecast ? " forecast-row" : ""}`}
            aria-label={`${period.label}: ${iconInfo ? iconInfo.label : "No data"}${period.isForecast ? " (forecast)" : ""}`}
          >
            {iconInfo ? (
              <iconInfo.Icon aria-hidden="true" size={28} />
            ) : (
              <span className="weather-timeline-gap" aria-hidden="true">—</span>
            )}
            <span className="weather-timeline-condition-label">
              {iconInfo ? iconInfo.label : "No data"}
            </span>
            {period.isForecast && <span className="weather-timeline-cell-forecast">Forecast</span>}
          </div>
        );
      }}
    </PeriodGrid>
  );
}

function SunMoonSummary({ location, date }: { location: Location; date: Date }) {
  const { sunrise, sunset } = getSunTimes(location, date);
  const moonPhase = getMoonPhase(date);
  const timeFormat: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

  return (
    <div className="weather-timeline-sun-moon">
      <span>
        Sunrise: {sunrise ? new Date(sunrise).toLocaleTimeString([], timeFormat) : "—"}
      </span>
      <span>
        Sunset: {sunset ? new Date(sunset).toLocaleTimeString([], timeFormat) : "—"}
      </span>
      <span>Moon: {moonPhase.replace("-", " ")}</span>
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

  const timeline: TimelineData | null =
    series !== null && series.status === "ready"
      ? window === "last-24-hours"
        ? buildHourlyTimelineData(series, unit)
        : buildDailyTimelineData(series, unit)
      : null;

  const nowLeftPercent =
    timeline !== null && timeline.nowBoundaryIndex !== null
      ? ((timeline.nowBoundaryIndex + 1) / timeline.periods.length) * 100
      : null;

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

      {timeline !== null && (
        <>
          <SunMoonSummary location={location} date={new Date()} />
          <div className="weather-timeline-wrap">
            <div className="weather-timeline">
              {nowLeftPercent !== null && (
                <div
                  className="weather-timeline-now"
                  style={{ left: `${nowLeftPercent}%` }}
                  aria-label="Now"
                >
                  <span className="weather-timeline-now-label">Now</span>
                </div>
              )}

              <PeriodGrid
                periods={timeline.periods}
                className="weather-timeline-row weather-timeline-row-grid weather-timeline-row-time"
              >
                {(period) => <span>{period.label}</span>}
              </PeriodGrid>

              <ConditionRow periods={timeline.periods} />
              <LineRow row={timeline.temperature} periods={timeline.periods} />
              <BarRow row={timeline.precipitation} periods={timeline.periods} />
              <WindRow row={timeline.wind} periods={timeline.periods} />
              <LineRow row={timeline.cloud} periods={timeline.periods} />
              <LineRow row={timeline.feelsLike} periods={timeline.periods} />
              <BarRow row={timeline.snow} periods={timeline.periods} />
              <BarRow row={timeline.gust} periods={timeline.periods} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
