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

interface ObservationDetailsProps {
  location: Location;
  window: ObservationWindow;
  unit: UnitSystem;
  series: ObservationSeries | null;
  nearbyStations: NearbyStationSeries[];
  onBack: () => void;
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
  onBack,
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
      <div className="app-header">
        <h2 ref={headingRef} tabIndex={-1}>
          {location.displayName} — details
        </h2>
        <button type="button" onClick={onBack}>
          Back to graph
        </button>
      </div>

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
                return (
                  <tr
                    key={obs.timestamp}
                    className={
                      obs.isForecast ? "forecast-row" : isGap ? "gap-point" : undefined
                    }
                  >
                    <td>{new Date(obs.timestamp).toLocaleString()}</td>
                    <td>{obs.isForecast ? "Forecast" : "Observed"}</td>
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
