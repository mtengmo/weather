import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatWeekdayShort } from "../../services/timeFormat";
import type { TimelineData } from "../timelineData";
import { PeriodGrid } from "./rows";
import type { OverviewDisplayMode } from "./useOverviewDisplayMode";

// A horizontally-scrolling container with no vertical overflow doesn't consume plain
// vertical-wheel input by default (only trackpad swipe / dragged scrollbar work natively) — a
// laptop with a conventional mouse otherwise can't pan it at all (009-timeline-polish-and-header,
// FR-011, research.md §2). Redirect vertical wheel delta into horizontal scroll only when there's
// actually something to scroll, so normal page-scroll is unaffected once the timeline fits.
//
// Attached as a native listener (not React's onWheel) because React registers wheel handlers as
// passive by default, which silently no-ops preventDefault and logs a console warning.
export function useTimelineWheelScroll<T extends HTMLElement>() {
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

type NowDirection = "left" | "right" | null;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/** Where the Now marker sits relative to the horizontally scrolled viewport: "left"/"right" when it
 *  is outside the visible range (so a Go-to-Now control is useful), null when it is in view. Driven
 *  by the scroll container's own metrics: a passive scroll listener plus a ResizeObserver. */
export function useNowDirection(
  wrapRef: React.RefObject<HTMLDivElement | null>,
  nowRef: React.RefObject<HTMLDivElement | null>,
  deps: ReadonlyArray<unknown>
): { direction: NowDirection; goToNow: () => void } {
  const [direction, setDirection] = useState<NowDirection>(null);

  function measure(): NowDirection {
    const wrap = wrapRef.current;
    const now = nowRef.current;
    if (!wrap || !now) return null;
    const x = now.offsetLeft;
    if (x < wrap.scrollLeft) return "left";
    if (x > wrap.scrollLeft + wrap.clientWidth) return "right";
    return null;
  }

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const update = () => setDirection(measure());
    update();
    wrap.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(wrap);
    return () => {
      wrap.removeEventListener("scroll", update);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  function goToNow() {
    const wrap = wrapRef.current;
    const now = nowRef.current;
    if (!wrap || !now) return;
    const target = Math.max(0, Math.min(now.offsetLeft - wrap.clientWidth / 2, wrap.scrollWidth - wrap.clientWidth));
    if (typeof wrap.scrollTo === "function") {
      wrap.scrollTo({ left: target, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    } else {
      wrap.scrollLeft = target;
    }
  }

  return { direction, goToNow };
}

export function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d={direction === "left" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WindowToggle({
  displayMode,
  onSelect,
  windows,
}: {
  displayMode: OverviewDisplayMode;
  onSelect: (mode: OverviewDisplayMode) => void;
  windows: { value: OverviewDisplayMode; label: string }[];
}) {
  const { t } = useTranslation();
  return (
    <div className="window-toggle" role="group" aria-label={t("weatherOverview.windowGroupLabel")}>
      {windows.map((w) => (
        <button
          key={w.value}
          type="button"
          aria-pressed={displayMode === w.value}
          onClick={() => onSelect(w.value)}
        >
          {t(w.label)}
        </button>
      ))}
    </div>
  );
}

export function TimelineFrame({
  timeline,
  displayMode,
  extendedForecast,
  onExtendedForecastChange,
  scrollDeps,
  children,
}: {
  timeline: TimelineData;
  displayMode: OverviewDisplayMode;
  extendedForecast: boolean;
  onExtendedForecastChange?: (extended: boolean) => void;
  /** Extra values (e.g. series, window) that should re-center the Now column when they change. */
  scrollDeps: ReadonlyArray<unknown>;
  children: (nowHighlightBoundary: number | null) => React.ReactNode;
}) {
  const { t } = useTranslation();
  const timelineWrapRef = useTimelineWheelScroll<HTMLDivElement>();
  const nowMarkerRef = useRef<HTMLDivElement>(null);

  const nowLeftPercent =
    timeline.nowPosition !== undefined
      ? timeline.nowPosition * 100
      : timeline.nowBoundaryIndex !== null
        ? ((timeline.nowBoundaryIndex + 1) / timeline.periods.length) * 100
        : null;
  // Column-highlight index: isNowColumn highlights nowBoundaryIndex + 1, so for the calendar view
  // (where "now" is inside today's column) pass nowColumnIndex - 1.
  const nowHighlightBoundary =
    timeline.nowColumnIndex !== undefined ? timeline.nowColumnIndex - 1 : timeline.nowBoundaryIndex;

  // Left-percent position of each day boundary — only on the 3-day view (016, FR-003). Relies on
  // the 3-day view always producing groups of exactly 5 sub-day periods per day.
  const dayBoundaryPercents: number[] =
    displayMode === "last-3-days"
      ? timeline.periods
          .map((_p, i) => (i > 0 && i % 5 === 0 ? (i / timeline.periods.length) * 100 : null))
          .filter((v): v is number => v !== null)
      : [];

  // "Observed"/"Forecast" section header row, derived from an explicit observed-column count so
  // "0 observed columns" is distinguishable from "no boundary at all" (026-fix-3-day).
  const timelinePeriodCount = timeline.periods.length;
  const observedCount =
    timeline.nowBoundaryIndex === null ? timelinePeriodCount : timeline.nowBoundaryIndex + 1;
  const showObservedSection = observedCount > 0;
  const showForecastSection = observedCount < timelinePeriodCount;

  useEffect(() => {
    // Center the "now" column in the visible area whenever the timeline overflows its container
    // (013-overview-default-and-layout, FR-010/FR-011/FR-012, research.md §5).
    const el = timelineWrapRef.current;
    if (el === null || nowLeftPercent === null) return;
    if (el.scrollWidth <= el.clientWidth) return;

    const target = (el.scrollWidth * nowLeftPercent) / 100 - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...scrollDeps, displayMode, nowLeftPercent]);

  const { direction: nowDirection, goToNow } = useNowDirection(timelineWrapRef, nowMarkerRef, [
    ...scrollDeps,
    displayMode,
    nowLeftPercent,
    extendedForecast,
  ]);

  return (
    <>
      {/* Fixed-height strip reserved in EVERY mode so the diagram never shifts between
          24h/3d/7d: 48 h chip at the start (24h only), Go-to-Now at the end. */}
      <div className="weather-timeline-strip">
        {displayMode === "last-24-hours" && onExtendedForecastChange && (
          <button
            type="button"
            className="timeline-chip"
            aria-pressed={extendedForecast}
            aria-label={t("weatherOverview.show48h")}
            onClick={() => onExtendedForecastChange(!extendedForecast)}
          >
            <span className="timeline-pill">
              {extendedForecast && (
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
                  <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span aria-hidden="true">{t("weatherOverview.show48hShort")}</span>
            </span>
          </button>
        )}
        {nowDirection !== null && (
          <button
            type="button"
            className="timeline-now-button"
            data-direction={nowDirection}
            aria-label={t("weatherOverview.goToNow")}
            onClick={goToNow}
          >
            <span className="timeline-pill">
              {nowDirection === "left" && <ArrowIcon direction="left" />}
              <span aria-hidden="true">{t("weatherOverview.now")}</span>
              {nowDirection === "right" && <ArrowIcon direction="right" />}
            </span>
          </button>
        )}
      </div>
      <div className="weather-timeline-wrap" ref={timelineWrapRef}>
        <div className="weather-timeline">
          {/* left is a percentage of the DATA columns' own width, but this element's positioning
              parent also includes the 7rem sticky label column — calc() translates the fraction
              into the actual coordinate space (020-dashboard-polish-round-five, US3). */}
          {nowLeftPercent !== null && (
            <div
              className="weather-timeline-now"
              ref={nowMarkerRef}
              style={{ left: `calc(7rem + (100% - 7rem) * ${nowLeftPercent / 100})` }}
              aria-label={t("weatherOverview.now")}
            >
              <span className="weather-timeline-now-label">{t("weatherOverview.now")}</span>
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
                  {t("weatherOverview.observed")}
                </div>
              )}
              {showForecastSection && (
                <div
                  className="weather-timeline-section-forecast"
                  style={{ width: `${((timelinePeriodCount - observedCount) / timelinePeriodCount) * 100}%` }}
                >
                  {t("weatherOverview.forecast")}
                </div>
              )}
            </div>
            {/* Weekday labels share this same row as the Observed/Forecast bands
                (026-fix-3-day follow-up) — one label per 5-column day group. */}
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
                      {formatWeekdayShort(new Date(period.key))}
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
              {(period) => (
                <span>
                  {period.label}
                  {period.subLabel && <small className="weather-timeline-sublabel">{period.subLabel}</small>}
                </span>
              )}
            </PeriodGrid>
          </div>

          {children(nowHighlightBoundary)}
        </div>
      </div>
    </>
  );
}
