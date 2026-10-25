import { useTranslation } from "react-i18next";
import type { TimelinePeriod, TimelineRow } from "../timelineData";
import { formatValue } from "../../services/format";
import { buildGradientStops, buildFillGradientStops } from "../../services/temperatureColorScale";
import { PeriodGrid, isNowColumn, formatRowValue, xPercent } from "./rows";

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

export function LineRow({
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
  const { t } = useTranslation();
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
          {t(row.label)} <span className="weather-timeline-row-unit">({row.unitLabel})</span>
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
              return <span className="weather-timeline-gap" aria-label={t("weatherOverview.noData")}>—</span>;
            }
            return (
              <span
                className={[
                  point.interpolated ? "weather-timeline-interpolated" : null,
                  isNowColumn(i, nowBoundaryIndex) ? "weather-timeline-now-column" : null,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined}
                title={point.interpolated ? t("weatherOverview.estimated") : undefined}
              >
                {highLowVisible && point.high != null && point.low != null
                  ? `${formatRowValue(row, point.value)} (${t("weatherOverview.highAbbr")} ${formatValue(point.high, 0)}° / ${t("weatherOverview.lowAbbr")} ${formatValue(point.low, 0)}°)`
                  : formatRowValue(row, point.value)}
              </span>
            );
          }}
        </PeriodGrid>
      </div>
    </div>
  );
}
