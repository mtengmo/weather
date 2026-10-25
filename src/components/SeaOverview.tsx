import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Location, ObservationSeries, ObservationWindow, UnitSystem } from "../models/types";
import type { MultiSourceForecastEntry } from "../services/weatherApi";
import { useSeaData } from "../hooks/useSeaData";
import { SEA_METRICS } from "../services/seaObservations";
import { buildTimelineForMode, mergeMultiSourceIntoTimelinePoints, type TimelineData, type TimelineRowPoint } from "./timelineData";
import { buildSeaRows, mergeObservedAndModel, summarizeSea } from "./seaTimelineData";
import SeaSummaryCard, { type SeaStationInfo } from "./SeaSummaryCard";
import { deriveCurrentReading } from "./overviewNow";
import { OVERVIEW_WINDOWS, useOverviewDisplayMode } from "./timeline/useOverviewDisplayMode";
import { TimelineFrame, WindowToggle } from "./timeline/TimelineFrame";
import { BarRow, ConditionRow, DirectionRow, WindRow, formatRowValue } from "./timeline/rows";
import { LineRow } from "./timeline/lineRow";

interface SeaOverviewProps {
  location: Location;
  window: ObservationWindow;
  onWindowChange: (window: ObservationWindow) => void;
  unit: UnitSystem;
  series: ObservationSeries | null; // null while loading
  highLowVisible: boolean;
  multiSourceForecast: MultiSourceForecastEntry[];
  weeklySeries: ObservationSeries | null;
  uvRiskHours: Set<number>;
  extendedForecast?: boolean;
  onExtendedForecastChange?: (extended: boolean) => void;
}

/** Sea weather: the Overview's weather rows plus waves, swell, sea temperature, water level and current. */
export default function SeaOverview({
  location,
  window,
  onWindowChange,
  unit,
  series,
  highLowVisible,
  multiSourceForecast,
  weeklySeries,
  uvRiskHours,
  extendedForecast = false,
  onExtendedForecastChange,
}: SeaOverviewProps) {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { displayMode, selectDisplayMode } = useOverviewDisplayMode(window, onWindowChange);
  const sea = useSeaData(location.latitude, location.longitude);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const timeline: TimelineData | null =
    series !== null && series.status === "ready" ? buildTimelineForMode(series, unit, displayMode, uvRiskHours) : null;
  if (timeline !== null) {
    mergeMultiSourceIntoTimelinePoints(timeline.temperature, timeline.periods, multiSourceForecast, unit);
  }

  const merged = useMemo(
    () => mergeObservedAndModel(sea.observations, sea.marineHours),
    [sea.observations, sea.marineHours]
  );
  const rows = timeline !== null ? buildSeaRows(timeline, merged, unit) : null;
  const summary = summarizeSea(merged, weeklySeries?.observations ?? [], Date.now());

  const { nearestObservation, currentCondition, currentTemperature } = deriveCurrentReading(weeklySeries);

  const stations: SeaStationInfo[] = [];
  for (const metric of SEA_METRICS) {
    const obs = sea.observations[metric];
    if (!obs || obs.points.length === 0) continue;
    const time = obs.points[obs.points.length - 1].time;
    const existing = stations.find((s) => s.name === obs.station.name);
    if (existing) existing.time = Math.max(existing.time, time);
    else stations.push({ name: obs.station.name, distanceKm: obs.station.distanceKm, time });
  }

  const seaLoading = sea.marineStatus === "loading" || sea.observationsStatus === "loading";
  const noMarineData =
    !seaLoading &&
    sea.marineStatus === "ready" &&
    merged.waveHeight.length === 0 &&
    merged.seaTemperature.length === 0 &&
    merged.waterLevel.length === 0;

  const heightText = (point: TimelineRowPoint, row: Parameters<typeof formatRowValue>[0]) => (
    <>
      {formatRowValue(row, point.value as number)}
      {point.period != null && <span className="weather-timeline-direction-sub">{Math.round(point.period)} s</span>}
    </>
  );

  return (
    <section aria-label={t("seaWeather.ariaLabel", { location: location.displayName })} className="weather-overview sea-overview">
      <h2 ref={headingRef} tabIndex={-1} className="visually-hidden">
        {location.displayName} {t("seaWeather.title")}
      </h2>

      <SeaSummaryCard
        summary={summary}
        unit={unit}
        location={location}
        stations={stations}
        currentCondition={currentCondition}
        currentTemperature={currentTemperature}
        currentSymbolCode={nearestObservation?.smhiSymbolCode ?? null}
        currentTimestamp={nearestObservation?.timestamp ?? null}
      />

      <WindowToggle displayMode={displayMode} onSelect={selectDisplayMode} windows={OVERVIEW_WINDOWS} />

      {series === null && <p role="status">{t("weatherOverview.loading")}</p>}
      {series !== null && series.status === "unavailable" && (
        <p className="error-banner" role="alert">
          {t("weatherOverview.unavailable")}
        </p>
      )}
      {seaLoading && <p role="status">{t("seaWeather.loadingSea")}</p>}
      {sea.marineStatus === "error" && (
        <p className="error-banner" role="alert">
          {t("seaWeather.seaError")}
        </p>
      )}
      {noMarineData && <p role="status">{t("seaWeather.noMarineData")}</p>}

      {timeline !== null && rows !== null && (
        <TimelineFrame
          timeline={timeline}
          displayMode={displayMode}
          extendedForecast={extendedForecast}
          onExtendedForecastChange={onExtendedForecastChange}
          scrollDeps={[series, window, sea]}
        >
          {(nowHighlightBoundary) => (
            <>
              <ConditionRow periods={timeline.periods} nowBoundaryIndex={nowHighlightBoundary} />
              <LineRow row={timeline.temperature} periods={timeline.periods} nowBoundaryIndex={nowHighlightBoundary} highLowVisible={highLowVisible} />
              <BarRow row={timeline.precipitation} periods={timeline.periods} nowBoundaryIndex={nowHighlightBoundary} subLabel={t("weatherOverview.probability")} />
              <WindRow row={timeline.wind} periods={timeline.periods} nowBoundaryIndex={nowHighlightBoundary} subLabel={t("weatherOverview.gusts")} />
              {rows.waves.available && (
                <DirectionRow row={rows.waves} periods={timeline.periods} nowBoundaryIndex={nowHighlightBoundary} renderText={heightText} />
              )}
              {rows.swell.available && (
                <DirectionRow row={rows.swell} periods={timeline.periods} nowBoundaryIndex={nowHighlightBoundary} renderText={heightText} />
              )}
              <LineRow row={rows.seaTemperature} periods={timeline.periods} nowBoundaryIndex={nowHighlightBoundary} highLowVisible={false} />
              <LineRow row={rows.waterLevel} periods={timeline.periods} nowBoundaryIndex={nowHighlightBoundary} highLowVisible={false} />
              {rows.current.available && (
                <DirectionRow
                  row={rows.current}
                  periods={timeline.periods}
                  nowBoundaryIndex={nowHighlightBoundary}
                  renderText={(p, r) => formatRowValue(r, p.value as number)}
                />
              )}
            </>
          )}
        </TimelineFrame>
      )}
    </section>
  );
}
