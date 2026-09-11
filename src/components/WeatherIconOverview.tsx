import { useEffect, useRef, useState } from "react";
import type {
  DailyAggregate,
  Location,
  ObservationSeries,
  ObservationWindow,
  UnitSystem,
  WeatherWarning,
} from "../models/types";
import type { MultiSourceForecastEntry } from "../services/weatherApi";
import {
  build3DayTimelineData,
  buildDailyTimelineData,
  buildHourlyTimelineData,
  capForecastReach,
  windowAroundToday,
  mergeMultiSourceIntoTimelinePoints,
  type TimelineData,
  type TimelinePeriod,
  type TimelineRow,
} from "./timelineData";
import { resolveConditionIconFromCondition } from "./smhiSymbolIcons";
import { deriveWeatherCondition, isNight } from "../services/weatherCondition";
import { deriveFeelsLike } from "../services/feelsLike";
import { formatValue } from "../services/format";
import { sumCalendarDayPrecipitation, toDailyAggregates } from "../services/dailyAggregation";
import TodaySummaryCard from "./TodaySummaryCard";
import WeeklyForecastStrip from "./WeeklyForecastStrip";
import { buildGradientStops, buildFillGradientStops } from "../services/temperatureColorScale";

interface WeatherIconOverviewProps {
  location: Location;
  window: ObservationWindow;
  onWindowChange: (window: ObservationWindow) => void;
  unit: UnitSystem;
  series: ObservationSeries | null; // null while loading
  /** Mirrors the app-wide High/Low toggle already used by the graph view (014, FR-009). */
  highLowVisible: boolean;
  multiSourceForecast: MultiSourceForecastEntry[];
  /** Always-on 7-day series, for the persistent Today card / 7-day strip (018-dashboard-visual-redesign). */
  weeklySeries: ObservationSeries | null;
  /** Hour-bucket keys whose UV Index is at/above the risk threshold — empty outside SMHI
   *  coverage, while loading, or on a failed fetch (027-uv-index-alert). */
  uvRiskHours: Set<number>;
  /** Active SMHI Message-level (non-color-coded) warnings, routed here instead of the standalone
   *  banner — they're a background advisory, not a time-bound weather danger
   *  (048-split-informational-smhi). */
  informationalWarnings?: WeatherWarning[];
}

// The overview only supports 24h/3d/7d (007 spec Edge Cases, extended by 015) — 30-day is out
// of scope, so its own window toggle never offers that option.
type OverviewDisplayMode = "last-24-hours" | "last-3-days" | "last-7-days";

// "Last 3 days" and "Last 7 days" both fetch via the same shared ObservationWindow
// ("last-7-days") — this is a purely client-side display choice over already-fetched data, so
// switching between them never triggers a new fetch (015, research.md §3, SC-004).
// Each label directly names its own time span rather than implying a fixed historical look-back
// via "Last" — misleading now that these windows also extend into forecast territory
// (016-dashboard-polish-round-two, FR-004).
const OVERVIEW_WINDOWS: { value: OverviewDisplayMode; label: string }[] = [
  { value: "last-24-hours", label: "24 Hours" },
  { value: "last-3-days", label: "3 Days" },
  { value: "last-7-days", label: "7 Days" },
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

interface YScale {
  min: number;
  max: number;
  yFor: (v: number) => number;
}

/** The row's own current min/max -> SVG-Y mapping, shared by the polyline itself (buildSegments)
 *  and the degree-scale ticks/gridlines below (032-dashboard-polish-round-seven, US7,
 *  research.md §9) — computed once so a tick's gridline and the polyline crossing that value
 *  can never disagree. `null` when the row has no non-null value to scale against. */
function computeYScale(row: TimelineRow): YScale | null {
  const nonNull = row.points.map((p) => p.value).filter((v): v is number => v !== null);
  if (nonNull.length === 0) return null;

  const min = Math.min(...nonNull);
  const max = Math.max(...nonNull);
  const range = max - min || 1;
  return { min, max, yFor: (v: number) => 90 - ((v - min) / range) * 80 }; // keep within a 10-90 vertical band
}

function buildSegments(row: TimelineRow, scale: YScale | null): Pt[][] {
  if (scale === null) return [];
  const n = row.points.length;

  const segments: Pt[][] = [];
  let current: Pt[] = [];
  row.points.forEach((p, i) => {
    if (p.value === null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: xPercent(i, n), y: scale.yFor(p.value), isForecast: p.isForecast });
  });
  if (current.length) segments.push(current);
  return segments;
}

const TEMPERATURE_TICK_STEP = 10;

interface Tick {
  value: number;
  y: number;
}

/** One tick per `TEMPERATURE_TICK_STEP`-degree step spanning the row's own min/max, rounded
 *  outward to the nearest step (032-dashboard-polish-round-seven, US7, research.md §9;
 *  widened from a 5- to a 10-degree step in 036-declutter-temperature-scale). Deliberately does
 *  NOT force a 0° tick into view for ranges that don't naturally reach it — the row's Y-scale is
 *  fixed to the data's own min/max (computeYScale, shared with the plotted curve), so a forced
 *  0° tick for a range far from freezing would compute a `y` far outside the visible 0-100 plot
 *  band; its *label* would then get clamped back into view by clampTickLabelPercent below while
 *  its gridline stayed off-canvas, producing a mislabeled-looking scale (036, reported live: "the
 *  scale is not correct... looks like 10 degrees is zero"). */
function buildTicks(scale: YScale): Tick[] {
  const start = Math.floor(scale.min / TEMPERATURE_TICK_STEP) * TEMPERATURE_TICK_STEP;
  const end = Math.ceil(scale.max / TEMPERATURE_TICK_STEP) * TEMPERATURE_TICK_STEP;

  const ticks: Tick[] = [];
  for (let value = start; value <= end; value += TEMPERATURE_TICK_STEP) {
    ticks.push({ value, y: scale.yFor(value) });
  }
  return ticks;
}

// Ticks are rounded *outward* beyond the data's own min/max (buildTicks), so the topmost/
// bottommost tick can land right at the literal 0%/100% edge of the chart's 70px-tall box — with
// the label's own centering transform, that pushed roughly half its height outside the box,
// visually overlapping the row above/below it. Clamps only the *label's* vertical position (the
// gridline itself stays mathematically exact) to leave enough room for a centered ~0.65rem label
// to render fully inside the box (regression found live: "the highest value comes over to the
// temp row" — a real overflow, not a rounding cosmetic). Widened from 8/92 to 12/88
// (037-header-controls-and-chart-fixes, US3) for extra breathing room after a live report that
// the top/bottom gridlines read as touching the rows above/below.
const TICK_LABEL_SAFE_MIN_PERCENT = 12;
const TICK_LABEL_SAFE_MAX_PERCENT = 88;

function clampTickLabelPercent(y: number): number {
  return Math.min(TICK_LABEL_SAFE_MAX_PERCENT, Math.max(TICK_LABEL_SAFE_MIN_PERCENT, y));
}

// Ticks are generated at a fixed step regardless of the row's actual data range, so for
// a narrow range two adjacent ticks' clamped label positions can land close enough (or on
// literally the same clamped position) that their text visually overlaps (035-fix-temp-scale-logo,
// research.md §2). Thins the rendered *labels* only — gridlines still use the full `ticks` list —
// keeping the topmost/bottommost (range boundary) ticks always, and greedily keeping middle ticks
// only if they clear this minimum gap from the previously kept label.
const MIN_TICK_LABEL_GAP_PERCENT = 16;

function dedupeCloseTicks(ticks: Tick[]): Tick[] {
  if (ticks.length <= 2) return ticks;
  const sorted = [...ticks].sort((a, b) => clampTickLabelPercent(a.y) - clampTickLabelPercent(b.y));
  const kept: Tick[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const candidate = sorted[i];
    const isLast = i === sorted.length - 1;
    const lastKeptY = clampTickLabelPercent(kept[kept.length - 1].y);
    const candidateY = clampTickLabelPercent(candidate.y);
    const gap = candidateY - lastKeptY;
    if (isLast && gap < MIN_TICK_LABEL_GAP_PERCENT && kept.length > 1) {
      kept.pop();
    } else if (!isLast && gap < MIN_TICK_LABEL_GAP_PERCENT) {
      continue;
    }
    kept.push(candidate);
  }
  // Return in the original (ascending-by-value) order — the sort above was only to walk the
  // ticks in on-screen top-to-bottom order while deciding which to keep.
  const keptValues = new Set(kept.map((t) => t.value));
  return ticks.filter((t) => keptValues.has(t.value));
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
  subLabel,
}: {
  row: TimelineRow;
  periods: TimelinePeriod[];
  nowBoundaryIndex: number | null;
  highLowVisible: boolean;
  subLabel?: string;
}) {
  if (!row.available) return null;
  const scale = computeYScale(row);
  const segments = buildSegments(row, scale);
  const isTemperature = row.key === "temperature";
  const ticks = isTemperature && scale !== null ? buildTicks(scale) : [];
  const labelTicks = isTemperature ? dedupeCloseTicks(ticks) : [];

  return (
    <div className={`weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-${row.key}`}>
      <div className="weather-timeline-row-title">
        {isTemperature && labelTicks.length > 0 && (
          <div className="weather-timeline-temp-scale" aria-hidden="true">
            {labelTicks.map((tick) => (
              <span
                key={tick.value}
                className="weather-timeline-temp-scale-tick"
                style={{ top: `${clampTickLabelPercent(tick.y)}%` }}
              >
                {tick.value}°
              </span>
            ))}
          </div>
        )}
        <span className="weather-timeline-row-title-text">
          {row.label} <span className="weather-timeline-row-unit">({row.unitLabel})</span>
          {subLabel && <span className="weather-timeline-row-sublabel">{subLabel}</span>}
        </span>
      </div>
      <div className="weather-timeline-row-grid-cells">
        <div className="weather-timeline-line-area">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="weather-timeline-svg" aria-hidden="true">
            {isTemperature && scale !== null && (
              // userSpaceOnUse (not the default objectBoundingBox) on both gradients, pinned to
              // the same 0-100 viewBox Y coordinates `scale.yFor` already maps every value to: a
              // row can render several separate <polyline>/<polygon> segments (split by data
              // gaps), and objectBoundingBox scopes to each *referencing element's own* bounding
              // box — which would color each segment relative to its own local min/max instead
              // of the row's actual range. userSpaceOnUse with explicit y1/y2 makes every
              // segment share one coordinate system, so a given Y position (temperature) always
              // gets the same color regardless of which segment it's in.
              <defs>
                <linearGradient
                  id="weather-timeline-temperature-line-gradient"
                  gradientUnits="userSpaceOnUse"
                  x1="0"
                  y1={scale.yFor(scale.max)}
                  x2="0"
                  y2={scale.yFor(scale.min)}
                >
                  {buildGradientStops(scale.min, scale.max).map((stop, i) => (
                    <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} />
                  ))}
                </linearGradient>
                {/* Same per-value band coloring as the line above, fading to transparent toward
                    the baseline — replaces the old single-flat-color fill
                    (037-header-controls-and-chart-fixes follow-up). */}
                <linearGradient
                  id="weather-timeline-temperature-gradient"
                  gradientUnits="userSpaceOnUse"
                  x1="0"
                  y1={scale.yFor(scale.max)}
                  x2="0"
                  y2={AREA_BASELINE_Y}
                >
                  {buildFillGradientStops(scale.min, scale.max).map((stop, i) => (
                    <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} stopOpacity={stop.opacity} />
                  ))}
                </linearGradient>
              </defs>
            )}
            {isTemperature &&
              ticks.map((tick) => (
                <line
                  key={`grid-${tick.value}`}
                  x1="0"
                  y1={tick.y}
                  x2="100"
                  y2={tick.y}
                  className="weather-timeline-temp-gridline"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            {isTemperature &&
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
                    <polyline
                      points={toPointsAttr(observed)}
                      className="weather-timeline-line-observed"
                      style={isTemperature ? { stroke: "url(#weather-timeline-temperature-line-gradient)" } : undefined}
                    />
                  )}
                  {forecast.length > 1 && (
                    <polyline
                      points={toPointsAttr(forecast)}
                      className="weather-timeline-line-forecast"
                      style={isTemperature ? { stroke: "url(#weather-timeline-temperature-line-gradient)" } : undefined}
                    />
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
                  ? `${formatRowValue(row, point.value)} (H ${formatValue(point.high, 0)}° / L ${formatValue(point.low, 0)}°)`
                  : formatRowValue(row, point.value)}
              </span>
            );
          }}
        </PeriodGrid>
      </div>
    </div>
  );
}

/**
 * Renders as two adjacent rows sharing the same column grid — a bars-only row, then a
 * values-only row directly beneath it, each column aligned to its counterpart above/below
 * (032-dashboard-polish-round-seven, US6; previously one row stacking a bar and its value/
 * chance-of-rain text in the same cell, which crowded the bar). Applies to both the
 * precipitation and snow rows, since both share this one component.
 */
function BarRow({
  row,
  periods,
  nowBoundaryIndex,
  subLabel,
}: {
  row: TimelineRow;
  periods: TimelinePeriod[];
  nowBoundaryIndex: number | null;
  subLabel?: string;
}) {
  if (!row.available) return null;
  const values = row.points.map((p) => p.value).filter((v): v is number => v !== null);
  const max = values.length > 0 ? Math.max(...values, 0.001) : 1;

  return (
    <>
      <div className={`weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-${row.key}`}>
        <div className="weather-timeline-row-title">
          {row.label} <span className="weather-timeline-row-unit">({row.unitLabel})</span>
          {subLabel && <span className="weather-timeline-row-sublabel">{subLabel}</span>}
        </div>
        <div className="weather-timeline-row-grid-cells">
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
                </div>
              );
            }}
          </PeriodGrid>
        </div>
      </div>
      <div className={`weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-${row.key}-values`}>
        <div className="weather-timeline-row-title" aria-hidden="true" />
        <div className="weather-timeline-row-grid-cells">
          <PeriodGrid periods={periods} className="weather-timeline-row weather-timeline-row-grid weather-timeline-row-bar-values">
            {(_period, i) => {
              const point = row.points[i];
              if (point.value === null) {
                return <span className="weather-timeline-gap" aria-label="No data">—</span>;
              }
              return (
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
                  {point.chanceOfRain !== null && point.chanceOfRain !== undefined && point.chanceOfRain > 0 && (
                    <span className="weather-timeline-bar-chance"> · {Math.round(point.chanceOfRain)}%</span>
                  )}
                </span>
              );
            }}
          </PeriodGrid>
        </div>
      </div>
    </>
  );
}

function WindRow({
  row,
  periods,
  nowBoundaryIndex,
  subLabel,
}: {
  row: TimelineRow;
  periods: TimelinePeriod[];
  nowBoundaryIndex: number | null;
  subLabel?: string;
}) {
  return (
    <div className={`weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-${row.key}`}>
      <div className="weather-timeline-row-title">
        {row.label} <span className="weather-timeline-row-unit">({row.unitLabel})</span>
        {subLabel && <span className="weather-timeline-row-sublabel">{subLabel}</span>}
      </div>
      <div className="weather-timeline-row-grid-cells">
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
    <div className="weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-condition">
      <div className="weather-timeline-row-title">Weather</div>
      <div className="weather-timeline-row-grid-cells">
        <PeriodGrid periods={periods} className="weather-timeline-row weather-timeline-row-grid">
          {(period, i) => {
            const iconInfo = resolveConditionIconFromCondition(
              period.smhiSymbolCode,
              period.condition,
              isNight(period.key),
              period.temperature
            );
            return (
              <div
                className={[
                  "weather-timeline-condition",
                  period.isForecast ? "forecast-row" : null,
                  // The SMHI-code path renders its own full-color artwork; the CSS color classes
                  // below only apply to the fallback lucide-icon path, matching how it already
                  // looked before this feature (043-smhi-27-symbol-icons, research.md §6).
                  iconInfo?.kind === "condition" && period.condition !== null
                    ? `weather-condition-${period.condition}`
                    : null,
                  isNowColumn(i, nowBoundaryIndex) ? "weather-timeline-now-column" : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={`${period.label}: ${iconInfo ? iconInfo.label : "No data"}${period.isForecast ? " (forecast)" : ""}${period.uvRisk ? " · High UV" : ""}`}
              >
                {iconInfo ? (
                  iconInfo.kind === "smhi-symbol" ? (
                    <img src={iconInfo.src} alt="" aria-hidden="true" width={28} height={28} />
                  ) : (
                    <iconInfo.Icon aria-hidden="true" size={28} />
                  )
                ) : (
                  <span className="weather-timeline-gap" aria-hidden="true">—</span>
                )}
                {period.uvRisk && (
                  <span className="weather-timeline-uv-badge" aria-hidden="true" title="High UV">
                    UV
                  </span>
                )}
                <span className="weather-timeline-condition-label">
                  {iconInfo ? iconInfo.label : "No data"}
                </span>
              </div>
            );
          }}
        </PeriodGrid>
      </div>
    </div>
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

export default function WeatherIconOverview({
  location,
  window,
  onWindowChange,
  unit,
  series,
  highLowVisible,
  multiSourceForecast,
  weeklySeries,
  uvRiskHours,
  informationalWarnings,
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
        ? buildHourlyTimelineData(series, unit, uvRiskHours)
        : displayMode === "last-3-days"
          ? build3DayTimelineData(series, unit, uvRiskHours)
          : buildDailyTimelineData(series, unit, uvRiskHours)
      : null;

  // Always averaged across sources when 2+ have data — no user toggle anymore
  // (020-dashboard-polish-round-five, US2).
  if (timeline !== null) {
    mergeMultiSourceIntoTimelinePoints(timeline.temperature, timeline.periods, multiSourceForecast, unit);
  }

  const nowLeftPercent =
    timeline !== null && timeline.nowBoundaryIndex !== null
      ? ((timeline.nowBoundaryIndex + 1) / timeline.periods.length) * 100
      : null;

  // Left-percent position of each day boundary — only on the 3-day view, where several sub-day
  // columns share a calendar day, making it hard to spot where one day ends and the next begins.
  // Not rendered on the 7-day view, where every column is already unambiguously its own day
  // (016-dashboard-polish-round-two, FR-003, research.md §3). Relies on the 3-day view always
  // producing groups of exactly 5 sub-day periods per day (toSubDayBuckets' own contract, 015).
  const dayBoundaryPercents: number[] =
    displayMode === "last-3-days" && timeline !== null
      ? timeline.periods
          .map((_p, i) => (i > 0 && i % 5 === 0 ? (i / timeline.periods.length) * 100 : null))
          .filter((v): v is number => v !== null)
      : [];

  // "Observed"/"Forecast" section header row, spanning the same columns as the timeline data
  // below it (018-dashboard-visual-redesign, contracts/timeline-structure.md). Derived from an
  // explicit observed-column count rather than a single percentage, so "0 observed columns" (the
  // 3-day view can be entirely forecast) is distinguishable from "no boundary at all" (026-fix-
  // 3-day, research.md §2) — a single percentage couldn't represent that distinction cleanly.
  const timelinePeriodCount = timeline?.periods.length ?? 0;
  const observedCount =
    timeline === null
      ? 0
      : timeline.nowBoundaryIndex === null
        ? timelinePeriodCount
        : timeline.nowBoundaryIndex + 1;
  const showObservedSection = observedCount > 0;
  const showForecastSection = observedCount < timelinePeriodCount;

  // "Today" = the first forecast-tagged entry in the always-on 7-day series — the forward-looking
  // (now, now+24h] window, matching what a user reading "Today" next to today's own sunrise/sunset
  // expects (023-fix-today-summary, research.md §1). The bucket immediately before this one is the
  // backward-looking (now-24h, now] window, which was the confirmed root cause of the Today card
  // disagreeing with the visible forward-looking hourly forecast. Falls back to the most recent
  // observed entry only when there is no forecast anywhere in the array at all — reused on all
  // three tabs, not gated on displayMode (018-dashboard-visual-redesign, contracts/summary-cards.md).
  // Forecast reach capped at 7 days (019-dashboard-polish-round-four, US7): toDailyAggregates'
  // own forward-extension rule means it can return far more than 7 forecast days once a
  // location's forecast reaches beyond a week — capped here without touching the observed side,
  // so "today" (needed below) is never at risk of being trimmed away.
  const weeklyDays: DailyAggregate[] = capForecastReach(
    weeklySeries !== null && weeklySeries.status === "ready"
      ? toDailyAggregates(weeklySeries.observations, 7)
      : [],
    7
  );
  const todayIndex = (() => {
    const firstForecastIndex = weeklyDays.findIndex((d) => d.isForecast === true);
    return firstForecastIndex === -1 ? weeklyDays.length - 1 : firstForecastIndex;
  })();
  const today = todayIndex >= 0 ? weeklyDays[todayIndex] : null;

  // The Today card's rain figure specifically uses a calendar-day sum (midnight to midnight)
  // rather than `today.totalPrecipitation`'s own rolling next-24h-from-now window, which can
  // include part of tomorrow (033-todays-rain-total) — every other value on the card still reads
  // from `today` unchanged.
  const todaysRainTotalMm =
    weeklySeries !== null ? sumCalendarDayPrecipitation(weeklySeries.observations, new Date()) : null;

  // The single nearest forward-looking reading (the first forecast-tagged entry, or — only when
  // there's no forecast at all — the latest observed one) — used to override the Today card's own
  // whole-next-24h-average condition. That average can read "Cloudy" purely because a cloudier
  // stretch later today outweighs a currently-clear sky, disagreeing with the header's own
  // current-conditions reading directly above this card (027 follow-up). Deliberately still
  // forward-looking, never the latest *observed* reading on its own — falling back to history here
  // would resurrect the exact backward-looking mismatch 023-fix-today-summary fixed.
  const nearestObservation =
    weeklySeries?.observations.find((o) => o.isForecast === true) ??
    (weeklySeries !== null && weeklySeries.observations.length > 0
      ? weeklySeries.observations[weeklySeries.observations.length - 1]
      : null);
  const currentCondition =
    nearestObservation != null
      ? deriveWeatherCondition({
          temperature: nearestObservation.temperature,
          precipitation: nearestObservation.precipitation,
          windSpeed: nearestObservation.windSpeed,
          cloudCoverPercent: nearestObservation.cloudCoverPercent,
          timestamp: nearestObservation.timestamp,
          chanceOfRain: nearestObservation.chanceOfRain,
        })
      : null;
  // The header used to show its own separate "current conditions" reading (temperature, feels
  // like) right above this card — moved down onto the Today card itself, labeled "Now", so it's
  // no longer competing for space in the header alongside a long location name
  // (037-header-controls-and-chart-fixes follow-up: reported header line-wrap with "Abisko").
  const currentTemperature = nearestObservation?.temperature ?? null;
  const currentHumidity = nearestObservation?.relativeHumidity ?? null;
  const currentFeelsLike =
    nearestObservation != null
      ? deriveFeelsLike({
          temperature: nearestObservation.temperature,
          windSpeed: nearestObservation.windSpeed,
          relativeHumidity: nearestObservation.relativeHumidity ?? null,
        })
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
      {/* Visually redundant with the app-level header's own location/conditions display
          (018-dashboard-visual-redesign, US1) but kept for the focus-on-view-change a11y
          convention every other view (ObservationChart/ObservationDetails) also follows. */}
      <h2 ref={headingRef} tabIndex={-1} className="visually-hidden">
        {location.displayName} — overview
      </h2>

      <TodaySummaryCard
        today={today}
        unit={unit}
        location={location}
        currentCondition={currentCondition}
        currentTemperature={currentTemperature}
        currentFeelsLike={currentFeelsLike}
        todaysRainTotalMm={todaysRainTotalMm}
        informationalWarnings={informationalWarnings}
        currentHumidity={currentHumidity}
      />
      {/* A stricter "today + up to 6 days ahead" window than weeklyDays' own forecast-reach cap
          (020-dashboard-polish-round-five, US5) — this brief strip has no Observed/Forecast
          section design to protect, so it always prioritizes the days ahead over older history. */}
      <WeeklyForecastStrip days={windowAroundToday(weeklyDays, 7)} unit={unit} />

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

      {series === null && <p role="status">Loading weather overview…</p>}

      {series !== null && series.status === "unavailable" && (
        <p className="error-banner" role="alert">
          Weather data is unavailable for this location right now. Please try again later.
        </p>
      )}

      {timeline !== null && (
        <>
          <div className="weather-timeline-wrap" ref={timelineWrapRef}>
            <div className="weather-timeline">
              {/* left is a percentage of the DATA columns' own width, but this element's
                  positioning parent (.weather-timeline) also includes the 7rem sticky label
                  column — calc() translates the fraction into the actual coordinate space
                  instead of treating the whole container (label column included) as 100%
                  (020-dashboard-polish-round-five, US3, research.md §3). */}
              {nowLeftPercent !== null && (
                <div
                  className="weather-timeline-now"
                  style={{ left: `calc(7rem + (100% - 7rem) * ${nowLeftPercent / 100})` }}
                  aria-label="Now"
                >
                  <span className="weather-timeline-now-label">Now</span>
                </div>
              )}

              {dayBoundaryPercents.map((percent, i) => (
                <div
                  key={`day-boundary-${i}`}
                  className="weather-timeline-day-boundary"
                  style={{ left: `calc(7rem + (100% - 7rem) * ${percent / 100})` }}
                  aria-hidden="true"
                />
              ))}

              <div className="weather-timeline-sections" aria-hidden="true">
                <div className="weather-timeline-sections-bands">
                  {showObservedSection && (
                    <div
                      className="weather-timeline-section-observed"
                      style={{ width: `${(observedCount / timelinePeriodCount) * 100}%` }}
                    >
                      Observed
                    </div>
                  )}
                  {showForecastSection && (
                    <div
                      className="weather-timeline-section-forecast"
                      style={{ width: `${((timelinePeriodCount - observedCount) / timelinePeriodCount) * 100}%` }}
                    >
                      Forecast
                    </div>
                  )}
                </div>
                {/* Weekday labels share this same row as the Observed/Forecast bands rather than
                    taking a row of their own (026-fix-3-day follow-up) — one label per
                    5-column day group, spanning that group's full width. */}
                {displayMode === "last-3-days" && (
                  <div
                    className="weather-timeline-sections-weekdays"
                    style={{ gridTemplateColumns: `repeat(${timeline.periods.length}, 1fr)` }}
                  >
                    {timeline.periods.map((period, i) =>
                      i % 5 === 0 ? (
                        <span
                          key={period.key}
                          className="weather-timeline-weekday-label"
                          style={{ gridColumn: "span 5" }}
                        >
                          {new Date(period.key).toLocaleDateString([], { weekday: "short" })}
                        </span>
                      ) : null
                    )}
                  </div>
                )}
              </div>

              <div className="weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-time">
                <div className="weather-timeline-row-title" aria-hidden="true" />
                <PeriodGrid
                  periods={timeline.periods}
                  className="weather-timeline-row weather-timeline-row-grid weather-timeline-row-grid-cells"
                >
                  {(period) => <span>{period.label}</span>}
                </PeriodGrid>
              </div>

              <ConditionRow periods={timeline.periods} nowBoundaryIndex={timeline.nowBoundaryIndex} />
              <LineRow row={timeline.temperature} periods={timeline.periods} nowBoundaryIndex={timeline.nowBoundaryIndex} highLowVisible={highLowVisible} />
              <BarRow row={timeline.precipitation} periods={timeline.periods} nowBoundaryIndex={timeline.nowBoundaryIndex} subLabel="Probability" />
              <WindRow row={timeline.wind} periods={timeline.periods} nowBoundaryIndex={timeline.nowBoundaryIndex} subLabel="Gusts" />
              <BarRow row={timeline.snow} periods={timeline.periods} nowBoundaryIndex={timeline.nowBoundaryIndex} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
