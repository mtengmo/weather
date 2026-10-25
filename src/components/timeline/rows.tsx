import { useTranslation } from "react-i18next";
import { resolveConditionIconFromCondition } from "../smhiSymbolIcons";
import { isNight } from "../../services/weatherCondition";
import { formatValue } from "../../services/format";
import type { TimelinePeriod, TimelineRow, TimelineRowPoint } from "../timelineData";

export function xPercent(index: number, count: number): number {
  return ((index + 0.5) / count) * 100;
}

/** The column immediately after the "now" marker line — the same index used to position
 * `.weather-timeline-now` (010-timeline-visual-styling, FR-006/FR-007, research.md §2). */
export function isNowColumn(index: number, nowBoundaryIndex: number | null): boolean {
  return nowBoundaryIndex !== null && index === nowBoundaryIndex + 1;
}

/** One shared grid row: N equal columns, matching every other row's column math exactly. */
export function PeriodGrid({
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

export function formatRowValue(row: TimelineRow, value: number): string {
  const decimals = row.decimals ?? (row.key === "temperature" ? 0 : 1);
  const sign = row.signed && value > 0 ? "+" : "";
  return `${sign}${formatValue(value, decimals)}${row.unitLabel === "%" ? row.unitLabel : ` ${row.unitLabel}`}`;
}

/**
 * Renders as two adjacent rows sharing the same column grid — a bars-only row, then a
 * values-only row directly beneath it, each column aligned to its counterpart above/below
 * (032-dashboard-polish-round-seven, US6; previously one row stacking a bar and its value/
 * chance-of-rain text in the same cell, which crowded the bar). Applies to both the
 * precipitation and snow rows, since both share this one component.
 */
export function BarRow({
  row,
  periods,
  nowBoundaryIndex,
  subLabel,
  barClass,
  renderValue,
}: {
  row: TimelineRow;
  periods: TimelinePeriod[];
  nowBoundaryIndex: number | null;
  subLabel?: string;
  /** Extra class for a column's bar (e.g. a colour level). */
  barClass?: (point: TimelineRowPoint) => string | undefined;
  /** Replaces the default value text under the bar; direction rows also get their arrow. */
  renderValue?: (point: TimelineRowPoint, row: TimelineRow) => React.ReactNode;
}) {
  const { t } = useTranslation();
  if (!row.available) return null;
  const values = row.points.map((p) => p.value).filter((v): v is number => v !== null);
  const max = values.length > 0 ? Math.max(...values, 0.001) : 1;

  return (
    <>
      <div className={`weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-${row.key}`}>
        <div className="weather-timeline-row-title">
          {t(row.label)} <span className="weather-timeline-row-unit">({row.unitLabel})</span>
          {subLabel && <span className="weather-timeline-row-sublabel">{subLabel}</span>}
        </div>
        <div className="weather-timeline-row-grid-cells">
          <PeriodGrid periods={periods} className="weather-timeline-row weather-timeline-row-grid weather-timeline-row-bars">
            {(_period, i) => {
              const point = row.points[i];
              if (point.value === null) {
                return <span className="weather-timeline-gap" aria-label={t("weatherOverview.noData")}>—</span>;
              }
              const heightPercent = Math.max(2, (point.value / max) * 100);
              return (
                <div className="weather-timeline-bar-cell">
                  <div
                    className={`weather-timeline-bar${point.isForecast ? " weather-timeline-bar-forecast" : ""}${point.interpolated ? " weather-timeline-bar-interpolated" : ""}${point.modelled ? " weather-timeline-bar-modelled" : ""}${barClass?.(point) ? ` ${barClass(point)}` : ""}`}
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
                return <span className="weather-timeline-gap" aria-label={t("weatherOverview.noData")}>—</span>;
              }
              return (
                <span
                  className={[
                    "weather-timeline-bar-value",
                    point.interpolated || point.modelled ? "weather-timeline-interpolated" : null,
                    isNowColumn(i, nowBoundaryIndex) ? "weather-timeline-now-column" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  title={point.modelled ? t("seaWeather.modelled") : point.interpolated ? t("weatherOverview.estimated") : undefined}
                >
                  {renderValue ? (
                    <>
                      {row.kind === "direction" && <DirectionArrow point={point} row={row} />}
                      {renderValue(point, row)}
                    </>
                  ) : (
                    formatRowValue(row, point.value)
                  )}
                  {!renderValue && point.chanceOfRain !== null && point.chanceOfRain !== undefined && point.chanceOfRain > 0 && (
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

/** Meteorological direction is where it blows FROM — rotate +180deg so the arrow points where it
 *  is going TOWARD. "toward" rows already carry that direction. */
function DirectionArrow({ point, row }: { point: TimelineRowPoint; row: TimelineRow }) {
  if (point.direction == null) return null;
  const rotation = row.directionConvention === "toward" ? point.direction : (point.direction + 180) % 360;
  return (
    <span className="weather-timeline-wind-arrow" style={{ transform: `rotate(${rotation}deg)` }} aria-hidden="true">
      ↑
    </span>
  );
}

export function DirectionRow({
  row,
  periods,
  nowBoundaryIndex,
  subLabel,
  renderText,
}: {
  row: TimelineRow;
  periods: TimelinePeriod[];
  nowBoundaryIndex: number | null;
  subLabel?: string;
  renderText: (point: TimelineRowPoint, row: TimelineRow) => React.ReactNode;
}) {
  const { t } = useTranslation();
  const toward = row.directionConvention === "toward";
  return (
    <div className={`weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-${row.key}`}>
      <div className="weather-timeline-row-title">
        {t(row.label)} <span className="weather-timeline-row-unit">({row.unitLabel})</span>
        {subLabel && <span className="weather-timeline-row-sublabel">{subLabel}</span>}
      </div>
      <div className="weather-timeline-row-grid-cells">
        <PeriodGrid periods={periods} className="weather-timeline-row weather-timeline-row-grid">
          {(_period, i) => {
            const point = row.points[i];
            if (point.value === null) {
              return <span className="weather-timeline-gap" aria-label={t("weatherOverview.noData")}>—</span>;
            }
            // Meteorological direction is where it blows FROM — rotate +180deg so the arrow
            // points where it is going TOWARD. "toward" rows already carry that direction.
            const arrowRotation =
              point.direction != null ? (toward ? point.direction : (point.direction + 180) % 360) : null;
            const estimated = point.interpolated || point.modelled;
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
                    estimated ? "weather-timeline-interpolated" : null,
                    isNowColumn(i, nowBoundaryIndex) ? "weather-timeline-now-column" : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined}
                  title={
                    point.modelled
                      ? t("seaWeather.modelled")
                      : point.interpolated
                        ? t("weatherOverview.estimated")
                        : undefined
                  }
                >
                  {renderText(point, row)}
                </span>
              </span>
            );
          }}
        </PeriodGrid>
      </div>
    </div>
  );
}

export function WindRow({
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
    <DirectionRow
      row={row}
      periods={periods}
      nowBoundaryIndex={nowBoundaryIndex}
      subLabel={subLabel}
      renderText={(point, r) =>
        // Gust folded into the wind row as a parenthetical, both whole numbers
        // (009-timeline-polish-and-header, FR-007/FR-008/FR-009).
        point.gust != null
          ? `${Math.round(point.value as number)} (${Math.round(point.gust)}) ${r.unitLabel}`
          : `${Math.round(point.value as number)} ${r.unitLabel}`
      }
    />
  );
}

export function ConditionRow({
  periods,
  nowBoundaryIndex,
}: {
  periods: TimelinePeriod[];
  nowBoundaryIndex: number | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="weather-timeline-row weather-timeline-row-label-wrap weather-timeline-row-condition">
      <div className="weather-timeline-row-title">{t("weatherOverview.weatherRowTitle")}</div>
      <div className="weather-timeline-row-grid-cells">
        <PeriodGrid periods={periods} className="weather-timeline-row weather-timeline-row-grid">
          {(period, i) => {
            const iconInfo = resolveConditionIconFromCondition(
              period.smhiSymbolCode,
              period.condition,
              isNight(period.key),
              period.temperature
            );
            const noDataLabel = t("weatherOverview.noData");
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
                aria-label={`${period.label}: ${iconInfo ? t(iconInfo.label) : noDataLabel}${period.isForecast ? t("weatherOverview.forecastParenthetical") : ""}${period.uvRisk ? t("weatherOverview.highUvParenthetical") : ""}`}
              >
                {iconInfo ? (
                  iconInfo.kind === "smhi-symbol" ? (
                    <img src={iconInfo.src} alt="" aria-hidden="true" width={44} height={44} />
                  ) : (
                    <iconInfo.Icon aria-hidden="true" size={44} />
                  )
                ) : (
                  <span className="weather-timeline-gap" aria-hidden="true">—</span>
                )}
                {period.uvRisk && (
                  <span className="weather-timeline-uv-badge" aria-hidden="true" title={t("weatherOverview.highUv")}>
                    UV
                  </span>
                )}
                <span className="weather-timeline-condition-label">
                  {iconInfo ? t(iconInfo.label) : noDataLabel}
                </span>
              </div>
            );
          }}
        </PeriodGrid>
      </div>
    </div>
  );
}
