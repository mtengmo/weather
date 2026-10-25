import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type {
  Location,
  ObservationSeries,
  ObservationWindow,
  UnitSystem,
  WeatherWarning,
} from "../models/types";
import type { MultiSourceForecastEntry } from "../services/weatherApi";
import {
  buildTimelineForMode,
  windowAroundToday,
  mergeMultiSourceIntoTimelinePoints,
  type TimelineData,
} from "./timelineData";
import TodaySummaryCard from "./TodaySummaryCard";
import WeeklyForecastStrip from "./WeeklyForecastStrip";
import { deriveCurrentReading, deriveToday } from "./overviewNow";
import { OVERVIEW_WINDOWS, useOverviewDisplayMode } from "./timeline/useOverviewDisplayMode";
import { TimelineFrame, WindowToggle } from "./timeline/TimelineFrame";
import { BarRow, ConditionRow, WindRow } from "./timeline/rows";
import { LineRow } from "./timeline/lineRow";

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
  /** Whether the hourly view is extended from 24 to 48 forecast hours (off by default). */
  extendedForecast?: boolean;
  onExtendedForecastChange?: (extended: boolean) => void;
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
  extendedForecast = false,
  onExtendedForecastChange,
}: WeatherIconOverviewProps) {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Local display choice, independent of the shared fetch `window` (015, research.md §3).
  const { displayMode, selectDisplayMode } = useOverviewDisplayMode(window, onWindowChange);

  useEffect(() => {
    // Mirrors ObservationChart/ObservationDetails: move focus to this view's heading when
    // it becomes the active view.
    headingRef.current?.focus();
  }, []);

  const timeline: TimelineData | null =
    series !== null && series.status === "ready"
      ? buildTimelineForMode(series, unit, displayMode, uvRiskHours)
      : null;

  // Always averaged across sources when 2+ have data — no user toggle anymore
  // (020-dashboard-polish-round-five, US2).
  if (timeline !== null) {
    mergeMultiSourceIntoTimelinePoints(timeline.temperature, timeline.periods, multiSourceForecast, unit);
  }

  const { weeklyDays, today, restOfDay } = deriveToday(weeklySeries);
  const { nearestObservation, currentCondition, currentSkyCondition, currentTemperature, currentHumidity, currentFeelsLike } =
    deriveCurrentReading(weeklySeries);

  return (
    <section aria-label={t("weatherOverview.ariaLabel", { location: location.displayName })} className="weather-overview">
      {/* Visually redundant with the app-level header's own location/conditions display
          (018-dashboard-visual-redesign, US1) but kept for the focus-on-view-change a11y
          convention every other view (ObservationChart/ObservationDetails) also follows. */}
      <h2 ref={headingRef} tabIndex={-1} className="visually-hidden">
        {location.displayName} {t("weatherOverview.headingSuffix")}
      </h2>

      <TodaySummaryCard
        today={today}
        unit={unit}
        location={location}
        currentCondition={currentCondition}
        currentTemperature={currentTemperature}
        currentFeelsLike={currentFeelsLike}
        restOfDay={restOfDay}
        informationalWarnings={informationalWarnings}
        currentHumidity={currentHumidity}
        currentSymbolCode={nearestObservation?.smhiSymbolCode ?? null}
        currentTimestamp={nearestObservation?.timestamp ?? null}
        currentWindSpeed={nearestObservation?.windSpeed ?? null}
        currentSkyCondition={currentSkyCondition}
      />
      {/* A stricter "today + up to 6 days ahead" window than weeklyDays' own forecast-reach cap
          (020-dashboard-polish-round-five, US5) — this brief strip has no Observed/Forecast
          section design to protect, so it always prioritizes the days ahead over older history. */}
      <WeeklyForecastStrip days={windowAroundToday(weeklyDays, 7)} unit={unit} />

      <WindowToggle displayMode={displayMode} onSelect={selectDisplayMode} windows={OVERVIEW_WINDOWS} />

      {series === null && <p role="status">{t("weatherOverview.loading")}</p>}

      {series !== null && series.status === "unavailable" && (
        <p className="error-banner" role="alert">
          {t("weatherOverview.unavailable")}
        </p>
      )}

      {timeline !== null && (
        <TimelineFrame
          timeline={timeline}
          displayMode={displayMode}
          extendedForecast={extendedForecast}
          onExtendedForecastChange={onExtendedForecastChange}
          scrollDeps={[series, window]}
        >
          {(nowHighlightBoundary) => (
            <>
              <ConditionRow periods={timeline.periods} nowBoundaryIndex={nowHighlightBoundary} />
              <LineRow row={timeline.temperature} periods={timeline.periods} nowBoundaryIndex={nowHighlightBoundary} highLowVisible={highLowVisible} />
              <BarRow row={timeline.precipitation} periods={timeline.periods} nowBoundaryIndex={nowHighlightBoundary} subLabel={t("weatherOverview.probability")} />
              <WindRow row={timeline.wind} periods={timeline.periods} nowBoundaryIndex={nowHighlightBoundary} subLabel={t("weatherOverview.gusts")} />
              <BarRow row={timeline.snow} periods={timeline.periods} nowBoundaryIndex={nowHighlightBoundary} />
            </>
          )}
        </TimelineFrame>
      )}
    </section>
  );
}
