import { useEffect, useRef } from "react";
import type {
  Location,
  NearbyStationSeries,
  ObservationSeries,
  ObservationWindow,
  UnitSystem,
} from "../models/types";
import { toDailyAggregates } from "../services/dailyAggregation";
import { convertPrecipitation, convertTemperature } from "../services/units";
import { formatValue } from "../services/format";
import { deriveWeatherCondition } from "../services/weatherCondition";
import { WEATHER_ICONS } from "./weatherIcons";

interface ObservationDetailsProps {
  location: Location;
  window: ObservationWindow;
  unit: UnitSystem;
  series: ObservationSeries | null;
  nearbyStations: NearbyStationSeries[];
}

function formatTemperature(value: number | null, unit: UnitSystem): string {
  if (value === null) return formatValue(value);
  return `${formatValue(value)}°${unit === "imperial" ? "F" : "C"}`;
}

function formatPrecipitation(value: number | null, unit: UnitSystem): string {
  if (value === null) return formatValue(value);
  return `${formatValue(value)} ${unit === "imperial" ? "in" : "mm"}`;
}

export default function ObservationDetails({
  location,
  window,
  unit,
  series,
  nearbyStations,
}: ObservationDetailsProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Move focus into the new view on navigation so screen reader users get the
    // context change announced, rather than focus silently staying on the
    // (now-unmounted) "View details" button.
    headingRef.current?.focus();
  }, []);

  return (
    <section aria-label={`Observation details for ${location.displayName}`}>
      {/* Visually redundant with the app-level header's own location display
          (020-dashboard-polish-round-five, US4 — matches WeatherIconOverview's existing
          pattern) but kept for the focus-on-view-change a11y convention every view follows. */}
      <h2 ref={headingRef} tabIndex={-1} className="visually-hidden">
        {location.displayName} — details
      </h2>

      {series === null && <p role="status">Loading observed weather…</p>}

      {series !== null && series.status === "unavailable" && (
        <p className="error-banner" role="alert">
          Weather data is unavailable for this location right now. Please try again later.
        </p>
      )}

      {series !== null && series.status === "ready" && window === "last-24-hours" && (
        <div className="observation-table-wrap">
          <table className="observation-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Status</th>
                <th>Condition</th>
                <th>{location.displayName} temperature</th>
                <th>{location.displayName} precipitation</th>
                {nearbyStations.map((n) => (
                  <th key={n.station.id}>
                    {n.station.displayName} ({n.station.distanceKm.toFixed(1)} km)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.observations.map((obs) => {
                const isGap = obs.temperature === null && obs.precipitation === null;
                // Same deriveWeatherCondition/WEATHER_ICONS pairing the Overview's ConditionRow
                // uses, at the same 28px size, for visual consistency between the two
                // (020-dashboard-polish-round-five, US7).
                const condition = deriveWeatherCondition({
                  temperature: obs.temperature,
                  precipitation: obs.precipitation,
                  windSpeed: obs.windSpeed,
                  cloudCoverPercent: obs.cloudCoverPercent,
                  timestamp: obs.timestamp,
                });
                const iconInfo = condition !== null ? WEATHER_ICONS[condition] : null;
                return (
                  <tr
                    key={obs.timestamp}
                    className={
                      obs.isForecast ? "forecast-row" : isGap ? "gap-point" : undefined
                    }
                  >
                    <td>{new Date(obs.timestamp).toLocaleString()}</td>
                    <td>{obs.isForecast ? "Forecast" : "Observed"}</td>
                    <td>
                      {iconInfo ? (
                        <iconInfo.Icon aria-label={iconInfo.label} size={28} />
                      ) : (
                        <span aria-label="No data">—</span>
                      )}
                    </td>
                    <td>{formatTemperature(convertTemperature(obs.temperature, unit), unit)}</td>
                    <td>
                      {formatPrecipitation(convertPrecipitation(obs.precipitation, unit), unit)}
                    </td>
                    {nearbyStations.map((n) => {
                      const match = n.series.observations.find((o) => o.timestamp === obs.timestamp);
                      return (
                        <td key={n.station.id}>
                          {formatTemperature(
                            convertTemperature(match?.temperature ?? null, unit),
                            unit
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {series !== null && series.status === "ready" && window !== "last-24-hours" && (
        <div className="observation-table-wrap">
          <table className="observation-table">
            <thead>
              <tr>
                <th>Day ending</th>
                {window === "last-7-days" && <th>Status</th>}
                <th>{location.displayName} high</th>
                <th>{location.displayName} low</th>
                <th>{location.displayName} average</th>
                <th>{location.displayName} total precipitation</th>
                {nearbyStations.map((n) => (
                  <th key={n.station.id}>
                    {n.station.displayName} average ({n.station.distanceKm.toFixed(1)} km)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const bucketCount = window === "last-30-days" ? 30 : 7;
                const primaryDaily = toDailyAggregates(series.observations, bucketCount);
                const nearbyDaily = nearbyStations.map((n) => ({
                  station: n.station,
                  days: toDailyAggregates(n.series.observations, bucketCount),
                }));

                return primaryDaily.map((day, dayIndex) => {
                  const isGap = day.high === null && day.totalPrecipitation === null;
                  return (
                    <tr
                      key={day.bucketEnd}
                      className={
                        day.isForecast ? "forecast-row" : isGap ? "gap-point" : undefined
                      }
                    >
                      <td>{new Date(day.bucketEnd).toLocaleDateString()}</td>
                      {window === "last-7-days" && (
                        <td>{day.isForecast ? "Forecast" : "Observed"}</td>
                      )}
                      <td>{formatTemperature(convertTemperature(day.high, unit), unit)}</td>
                      <td>{formatTemperature(convertTemperature(day.low, unit), unit)}</td>
                      <td>{formatTemperature(convertTemperature(day.average, unit), unit)}</td>
                      <td>
                        {formatPrecipitation(
                          convertPrecipitation(day.totalPrecipitation, unit),
                          unit
                        )}
                      </td>
                      {nearbyDaily.map(({ station, days }) => (
                        <td key={station.id}>
                          {formatTemperature(
                            convertTemperature(days[dayIndex]?.average ?? null, unit),
                            unit
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
