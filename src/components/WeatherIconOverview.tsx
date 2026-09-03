import { useEffect, useRef, useState } from "react";
import type { Location, ObservationSeries, ObservationWindow, UnitSystem } from "../models/types";
import {
  build3DayTimelineData,
  buildDailyTimelineData,
  buildHourlyTimelineData,
  type TimelineData,
  type TimelinePeriod,
  type TimelineRow,
} from "./timelineData";
import { WEATHER_ICONS } from "./weatherIcons";
import { getMoonPhase, getSunTimes } from "../services/sunMoon";
import { dataSourceNote, formatValue } from "../services/format";

interface WeatherIconOverviewProps {
  location: Location;
  window: ObservationWindow;
  onWindowChange: (window: ObservationWindow) => void;
  unit: UnitSystem;
  series: ObservationSeries | null; // null while loading
  onBack: () => void;
  /** Mirrors the app-wide High/Low toggle already used by the graph view (014, FR-009). */
  highLowVisible: boolean;
}

// The overview only supports 24h/3d/7d (007 spec Edge Cases, extended by 015) — 30-day is out
// of scope, so its own window toggle never offers that option.
type OverviewDisplayMode = "last-24-hours" | "last-3-days" | "last-7-days";

// "Last 3 days" and "Last 7 days" both fetch via the same shared ObservationWindow
// ("last-7-days") — this is a purely client-side display choice over already-fetched data, so
// switching between them never triggers a new fetch (015, research.md §3, SC-004).
const OVERVIEW_WINDOWS: { value: OverviewDisplayMode; label: string }[] = [
  { value: "last-24-hours", label: "Last 24 hours" },
  { value: "last-3-days", label: "Last 3 days" },
  { value: "last-7-days", label: "Last 7 days" },
];

function xPercent(index: number, count: number): number {
  return ((index + 0.5) / count) * 100;
}

/** The column immediately after the "now" marker line — the same index used to position
 * `.weather-timeline-now` (010-timeline-visual-styling, FR-006/FR-007, research.md §2). */
function isNowColumn(index: number, nowBoundaryIndex: number | null): boolean {
  return nowBoundaryIndex !== null && index === nowBoundaryIndex + 1;
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
  const decimals = row.key === "temperature" ? 0 : 1;
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

const AREA_BASELINE_Y = 90; // matches buildSegments's 10-90 vertical band's bottom edge

/** Closes a line segment into a filled polygon down to the row's baseline, for the
 * temperature row's gradient fill (010-timeline-visual-styling, FR-003). */
function toAreaPointsAttr(points: Pt[]): string {
  if (points.length < 2) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${first.x},${AREA_BASELINE_Y} ${toPointsAttr(points)} ${last.x},${AREA_BASELINE_Y}`;
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

function LineRow({
  row,
  periods,
  nowBoundaryIndex,
  highLowVisible,
}: {
  row: TimelineRow;
  periods: TimelinePeriod[];
  nowBoundaryIndex: number | null;
  highLowVisible: boolean;
}) {
  if (!row.available) return null;
  const segments = buildSegments(row);

  return (
    <div className={`weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-${row.key}`}>
      <div className="weather-timeline-row-title">
        {row.label} <span className="weather-timeline-row-unit">({row.unitLabel})</span>
      </div>
      <div className="weather-timeline-line-area">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="weather-timeline-svg" aria-hidden="true">
          {row.key === "temperature" && (
            <defs>
              <linearGradient id="weather-timeline-temperature-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--row-temperature)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--row-temperature)" stopOpacity="0" />
              </linearGradient>
            </defs>
          )}
          {row.key === "temperature" &&
            segments.map((segment, si) => (
              <polygon
                key={`area-${si}`}
                points={toAreaPointsAttr(segment)}
                fill="url(#weather-timeline-temperature-gradient)"
              />
            ))}
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
          if (point.value === null) {
            return <span className="weather-timeline-gap" aria-label="No data">—</span>;
          }
          return (
            <span
              className={[
                point.interpolated ? "weather-timeline-interpolated" : null,
                isNowColumn(i, nowBoundaryIndex) ? "weather-timeline-now-column" : null,
              ]
                .filter(Boolean)
                .join(" ") || undefined}
              title={point.interpolated ? "Estimated" : undefined}
            >
              {highLowVisible && point.high != null && point.low != null
                ? `${formatRowValue(row, point.value)} (${formatValue(point.high, 0)}°/${formatValue(point.low, 0)}°)`
                : formatRowValue(row, point.value)}
            </span>
          );
        }}
      </PeriodGrid>
    </div>
  );
}

function BarRow({
  row,
  periods,
  nowBoundaryIndex,
}: {
  row: TimelineRow;
  periods: TimelinePeriod[];
  nowBoundaryIndex: number | null;
}) {
  if (!row.available) return null;
  const values = row.points.map((p) => p.value).filter((v): v is number => v !== null);
  const max = values.length > 0 ? Math.max(...values, 0.001) : 1;

  return (
    <div className={`weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-${row.key}`}>
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
                className={`weather-timeline-bar${point.isForecast ? " weather-timeline-bar-forecast" : ""}${point.interpolated ? " weather-timeline-bar-interpolated" : ""}`}
                style={{ height: `${heightPercent}%` }}
              />
              <span
                className={[
                  "weather-timeline-bar-value",
                  point.interpolated ? "weather-timeline-interpolated" : null,
                  isNowColumn(i, nowBoundaryIndex) ? "weather-timeline-now-column" : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                title={point.interpolated ? "Estimated" : undefined}
              >
                {formatRowValue(row, point.value)}
              </span>
              {point.chanceOfRain !== null && point.chanceOfRain !== undefined && (
                <span className="weather-timeline-bar-chance">{Math.round(point.chanceOfRain)}%</span>
              )}
            </div>
          );
        }}
      </PeriodGrid>
    </div>
  );
}

function WindRow({
  row,
  periods,
  nowBoundaryIndex,
}: {
  row: TimelineRow;
  periods: TimelinePeriod[];
  nowBoundaryIndex: number | null;
}) {
  return (
    <div className={`weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-${row.key}`}>
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
          // Gust folded into the wind row as a parenthetical, both whole numbers, no decimals
          // (009-timeline-polish-and-header, FR-007/FR-008/FR-009).
          const speedText =
            point.gust != null
              ? `${Math.round(point.value)} (${Math.round(point.gust)}) ${row.unitLabel}`
              : `${Math.round(point.value)} ${row.unitLabel}`;
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
              <span
                className={[
                  point.interpolated ? "weather-timeline-interpolated" : null,
                  isNowColumn(i, nowBoundaryIndex) ? "weather-timeline-now-column" : null,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined}
                title={point.interpolated ? "Estimated" : undefined}
              >
                {speedText}
              </span>
            </span>
          );
        }}
      </PeriodGrid>
    </div>
  );
}

function ConditionRow({
  periods,
  nowBoundaryIndex,
}: {
  periods: TimelinePeriod[];
  nowBoundaryIndex: number | null;
}) {
  return (
    <PeriodGrid periods={periods} className="weather-timeline-row weather-timeline-row-grid weather-timeline-row-condition">
      {(period, i) => {
        const iconInfo = period.condition !== null ? WEATHER_ICONS[period.condition] : null;
        return (
          <div
            className={[
              "weather-timeline-condition",
              period.isForecast ? "forecast-row" : null,
              period.condition !== null ? `weather-condition-${period.condition}` : null,
              isNowColumn(i, nowBoundaryIndex) ? "weather-timeline-now-column" : null,
            ]
              .filter(Boolean)
              .join(" ")}
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

// A horizontally-scrolling container with no vertical overflow doesn't consume plain
// vertical-wheel input by default (only trackpad swipe / dragged scrollbar work natively) — a
// laptop with a conventional mouse otherwise can't pan it at all (009-timeline-polish-and-header,
// FR-011, research.md §2). Redirect vertical wheel delta into horizontal scroll only when there's
// actually something to scroll, so normal page-scroll is unaffected once the timeline fits.
//
// Attached as a native listener (not React's onWheel) because React registers wheel handlers as
// passive by default, which silently no-ops preventDefault and logs a console warning.
function useTimelineWheelScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onWheel(event: WheelEvent) {
      if (el!.scrollWidth <= el!.clientWidth || event.deltaY === 0) return;
      el!.scrollLeft += event.deltaY;
      event.preventDefault();
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return ref;
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
  highLowVisible,
}: WeatherIconOverviewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timelineWrapRef = useTimelineWheelScroll<HTMLDivElement>();

  // Local display choice, independent of the shared fetch `window` — "last-3-days" and
  // "last-7-days" both fetch via "last-7-days" (015, research.md §3), so this alone decides
  // which build*TimelineData function runs and which button is highlighted.
  const [displayMode, setDisplayMode] = useState<OverviewDisplayMode>(
    window === "last-24-hours" ? "last-24-hours" : "last-7-days"
  );

  useEffect(() => {
    // Keeps displayMode in sync if `window` changes for a reason outside this component's own
    // buttons (e.g. the shared window falling back from last-30-days elsewhere in the app).
    if (window === "last-24-hours" && displayMode !== "last-24-hours") {
      setDisplayMode("last-24-hours");
    } else if (window !== "last-24-hours" && displayMode === "last-24-hours") {
      setDisplayMode("last-7-days");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window]);

  function selectDisplayMode(mode: OverviewDisplayMode) {
    setDisplayMode(mode);
    onWindowChange(mode === "last-24-hours" ? "last-24-hours" : "last-7-days");
  }

  useEffect(() => {
    // Mirrors ObservationChart/ObservationDetails: move focus to this view's heading when
    // it becomes the active view.
    headingRef.current?.focus();
  }, []);

  const timeline: TimelineData | null =
    series !== null && series.status === "ready"
      ? displayMode === "last-24-hours"
        ? buildHourlyTimelineData(series, unit)
        : displayMode === "last-3-days"
          ? build3DayTimelineData(series, unit)
          : buildDailyTimelineData(series, unit)
      : null;

  const nowLeftPercent =
    timeline !== null && timeline.nowBoundaryIndex !== null
      ? ((timeline.nowBoundaryIndex + 1) / timeline.periods.length) * 100
      : null;

  useEffect(() => {
    // Center the "now" column in the visible area on a fresh render whenever the timeline
    // overflows its container — otherwise the timeline opens scrolled to its leftmost (oldest)
    // hour, requiring a manual swipe to reach "now" on a narrow viewport
    // (013-overview-default-and-layout, FR-010/FR-011/FR-012, research.md §5).
    const el = timelineWrapRef.current;
    if (el === null || nowLeftPercent === null) return;
    if (el.scrollWidth <= el.clientWidth) return;

    const target = (el.scrollWidth * nowLeftPercent) / 100 - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth));
    // Reruns whenever the underlying series/window/displayMode changes, not just on the very
    // first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, window, displayMode, nowLeftPercent]);

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
            aria-pressed={displayMode === w.value}
            onClick={() => selectDisplayMode(w.value)}
          >
            {w.label}
          </button>
        ))}
      </div>

      {series !== null && dataSourceNote(series) && (
        <p className="data-source-note">{dataSourceNote(series)}</p>
      )}

      {series === null && <p role="status">Loading weather overview…</p>}

      {series !== null && series.status === "unavailable" && (
        <p className="error-banner" role="alert">
          Weather data is unavailable for this location right now. Please try again later.
        </p>
      )}

      {timeline !== null && (
        <>
          <SunMoonSummary location={location} date={new Date()} />
          <div className="weather-timeline-wrap" ref={timelineWrapRef}>
            <div
              className={`weather-timeline${displayMode !== "last-24-hours" ? " weather-timeline-fill" : ""}`}
            >
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

              <ConditionRow periods={timeline.periods} nowBoundaryIndex={timeline.nowBoundaryIndex} />
              <LineRow row={timeline.temperature} periods={timeline.periods} nowBoundaryIndex={timeline.nowBoundaryIndex} highLowVisible={highLowVisible} />
              <BarRow row={timeline.precipitation} periods={timeline.periods} nowBoundaryIndex={timeline.nowBoundaryIndex} />
              <WindRow row={timeline.wind} periods={timeline.periods} nowBoundaryIndex={timeline.nowBoundaryIndex} />
              <BarRow row={timeline.snow} periods={timeline.periods} nowBoundaryIndex={timeline.nowBoundaryIndex} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
