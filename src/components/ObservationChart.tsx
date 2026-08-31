import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  Location,
  NearbyStationSeries,
  ObservationSeries,
  ObservationWindow,
  UnitSystem,
  WeatherMetric,
} from "../models/types";
import {
  buildDailyRows,
  buildHourlyRows,
  buildMetricDailyRows,
  buildMetricHourlyRows,
  buildWindDailyRows,
  isMetricAvailable,
  seriesKey,
  type SingleSeriesMetric,
} from "./chartData";
import { HIGH_COLOR, LOW_COLOR, seriesColor, seriesDash } from "./seriesColors";
import MetricTabs from "./MetricTabs";
import { formatValue } from "../services/format";

function tooltipFormatter(value: unknown): string {
  return formatValue(typeof value === "number" ? value : Number(value), 1);
}

interface ObservationChartProps {
  location: Location;
  window: ObservationWindow;
  onWindowChange: (window: ObservationWindow) => void;
  metric: WeatherMetric;
  onMetricChange: (metric: WeatherMetric) => void;
  highLowVisible: boolean;
  unit: UnitSystem;
  series: ObservationSeries | null; // null while loading
  nearbyStations: NearbyStationSeries[];
  onViewDetails: () => void;
}

const METRIC_LABELS: Record<SingleSeriesMetric, { name: string; unit: (unit: UnitSystem) => string }> = {
  rain: { name: "precipitation", unit: (u) => (u === "imperial" ? "in" : "mm") },
  wind: { name: "wind speed", unit: (u) => (u === "imperial" ? "mph" : "m/s") },
  cloud: { name: "cloud coverage", unit: () => "%" },
};

const WINDOWS: { value: ObservationWindow; label: string }[] = [
  { value: "last-24-hours", label: "Last 24 hours" },
  { value: "last-7-days", label: "Last 7 days" },
  { value: "last-30-days", label: "Last 30 days" },
];

const DAILY_BUCKET_COUNT: Partial<Record<ObservationWindow, number>> = {
  "last-7-days": 7,
  "last-30-days": 30,
};

// Themed via CSS variables so the tooltip (Recharts renders it with inline
// styles, not a stylesheet-targetable class) tracks the active theme live.
const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
};
const TOOLTIP_ITEM_STYLE: CSSProperties = { color: "var(--text)" };
const TOOLTIP_LABEL_STYLE: CSSProperties = { color: "var(--text)" };

export default function ObservationChart({
  location,
  window,
  onWindowChange,
  metric,
  onMetricChange,
  highLowVisible,
  unit,
  series,
  nearbyStations,
  onViewDetails,
}: ObservationChartProps) {
  const tempUnitLabel = unit === "imperial" ? "°F" : "°C";
  const precipUnitLabel = unit === "imperial" ? "in" : "mm";
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Mirrors ObservationDetails: move focus to this view's heading when it
    // becomes the active view (e.g. returning from the details table).
    headingRef.current?.focus();
  }, []);

  return (
    <section aria-label={`Observed weather for ${location.displayName}`}>
      <h2 ref={headingRef} tabIndex={-1}>
        {location.displayName}
      </h2>

      <div className="window-toggle" role="group" aria-label="Observation window">
        {WINDOWS.map((w) => (
          <button
            key={w.value}
            type="button"
            aria-pressed={window === w.value}
            onClick={() => onWindowChange(w.value)}
          >
            {w.label}
          </button>
        ))}
        <button type="button" onClick={onViewDetails}>
          View details
        </button>
      </div>

      <MetricTabs metric={metric} onChange={onMetricChange} />

      {series === null && <p role="status">Loading observed weather…</p>}

      {series !== null && series.status === "unavailable" && (
        <p className="error-banner" role="alert">
          Weather data is unavailable for this location right now. Please try again later.
        </p>
      )}

      {series !== null && series.status === "ready" && !isMetricAvailable(series, metric) && (
        <p className="error-banner" role="alert">
          {metric === "temperature" ? "Temperature" : METRIC_LABELS[metric].name} data is not
          available for this location.
        </p>
      )}

      {series !== null &&
        series.status === "ready" &&
        isMetricAvailable(series, metric) &&
        metric === "temperature" &&
        window === "last-24-hours" && (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={buildHourlyRows(series, nearbyStations, unit)}>
            <defs>
              <linearGradient id="precipGradient-24h" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-2)" stopOpacity={0.55} />
                <stop offset="100%" stopColor={seriesColor(0)} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(t: string) => new Date(t).toLocaleTimeString([], { hour: "2-digit" })}
            />
            <YAxis yAxisId="temp" label={{ value: tempUnitLabel, angle: -90, position: "insideLeft" }} />
            <YAxis
              yAxisId="precip"
              orientation="right"
              label={{ value: precipUnitLabel, angle: 90, position: "insideRight" }}
            />
            <Tooltip
              labelFormatter={(t) => new Date(String(t)).toLocaleString()}
              formatter={tooltipFormatter}
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
            />
            <Legend />
            <Bar
              yAxisId="precip"
              dataKey="primaryPrecipitation"
              name={`${location.displayName} precipitation`}
              fill="url(#precipGradient-24h)"
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="primary"
              name={location.displayName}
              stroke={seriesColor(0)}
              connectNulls={false}
              dot={false}
              activeDot={{ r: 5 }}
            />
            {nearbyStations.map((n, i) => (
              <Line
                key={n.station.id}
                yAxisId="temp"
                type="monotone"
                dataKey={seriesKey(i + 1)}
                name={`${n.station.displayName} (${n.station.distanceKm.toFixed(1)} km)`}
                stroke={seriesColor(i + 1)}
                strokeDasharray={seriesDash(i + 1)}
                connectNulls={false}
                dot={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {series !== null &&
        series.status === "ready" &&
        isMetricAvailable(series, metric) &&
        metric === "temperature" &&
        window !== "last-24-hours" && (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={buildDailyRows(series, nearbyStations, unit, DAILY_BUCKET_COUNT[window]!)}
          >
            <defs>
              <linearGradient id="precipGradient-daily" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-2)" stopOpacity={0.55} />
                <stop offset="100%" stopColor={seriesColor(0)} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="bucketEnd"
              tickFormatter={(t: string) =>
                new Date(t).toLocaleDateString(
                  [],
                  window === "last-30-days" ? { month: "short", day: "numeric" } : { weekday: "short" }
                )
              }
            />
            <YAxis yAxisId="temp" label={{ value: tempUnitLabel, angle: -90, position: "insideLeft" }} />
            <YAxis
              yAxisId="precip"
              orientation="right"
              label={{ value: precipUnitLabel, angle: 90, position: "insideRight" }}
            />
            <Tooltip
              labelFormatter={(t) => new Date(String(t)).toLocaleDateString()}
              formatter={tooltipFormatter}
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
            />
            <Legend />
            <Bar
              yAxisId="precip"
              dataKey="primaryPrecipitation"
              name={`${location.displayName} precipitation`}
              fill="url(#precipGradient-daily)"
            />
            {highLowVisible && (
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="primaryHigh"
                name={`${location.displayName} high`}
                stroke={HIGH_COLOR}
                strokeDasharray="4 2"
                connectNulls={false}
                dot={false}
              />
            )}
            {highLowVisible && (
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="primaryLow"
                name={`${location.displayName} low`}
                stroke={LOW_COLOR}
                strokeDasharray="4 2"
                connectNulls={false}
                dot={false}
              />
            )}
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="primaryAverage"
              name={`${location.displayName} average`}
              stroke={seriesColor(0)}
              connectNulls={false}
              dot={false}
              activeDot={{ r: 5 }}
            />
            {nearbyStations.map((n, i) => (
              <Line
                key={n.station.id}
                yAxisId="temp"
                type="monotone"
                dataKey={seriesKey(i + 1)}
                name={`${n.station.displayName} average (${n.station.distanceKm.toFixed(1)} km)`}
                stroke={seriesColor(i + 1)}
                strokeDasharray={seriesDash(i + 1)}
                connectNulls={false}
                dot={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {series !== null &&
        series.status === "ready" &&
        isMetricAvailable(series, metric) &&
        metric === "rain" && (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={
              window === "last-24-hours"
                ? buildMetricHourlyRows(series, nearbyStations, unit, "rain")
                : buildMetricDailyRows(series, nearbyStations, unit, "rain", DAILY_BUCKET_COUNT[window]!)
            }
          >
            <defs>
              <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-2)" stopOpacity={0.55} />
                <stop offset="100%" stopColor={seriesColor(0)} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={window === "last-24-hours" ? "timestamp" : "bucketEnd"}
              tickFormatter={(t: string) =>
                window === "last-24-hours"
                  ? new Date(t).toLocaleTimeString([], { hour: "2-digit" })
                  : new Date(t).toLocaleDateString(
                      [],
                      window === "last-30-days" ? { month: "short", day: "numeric" } : { weekday: "short" }
                    )
              }
            />
            <YAxis label={{ value: precipUnitLabel, angle: -90, position: "insideLeft" }} />
            <Tooltip
              formatter={tooltipFormatter}
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
            />
            <Legend />
            <Bar
              dataKey={seriesKey(0)}
              name={`${location.displayName} precipitation`}
              fill="url(#rainGradient)"
            />
            {nearbyStations.map((n, i) => (
              <Bar
                key={n.station.id}
                dataKey={seriesKey(i + 1)}
                name={`${n.station.displayName} (${n.station.distanceKm.toFixed(1)} km)`}
                fill={seriesColor(i + 1)}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {series !== null &&
        series.status === "ready" &&
        isMetricAvailable(series, metric) &&
        (metric === "cloud" || (metric === "wind" && window === "last-24-hours")) && (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={
              window === "last-24-hours"
                ? buildMetricHourlyRows(series, nearbyStations, unit, metric)
                : buildMetricDailyRows(series, nearbyStations, unit, metric, DAILY_BUCKET_COUNT[window]!)
            }
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={window === "last-24-hours" ? "timestamp" : "bucketEnd"}
              tickFormatter={(t: string) =>
                window === "last-24-hours"
                  ? new Date(t).toLocaleTimeString([], { hour: "2-digit" })
                  : new Date(t).toLocaleDateString(
                      [],
                      window === "last-30-days" ? { month: "short", day: "numeric" } : { weekday: "short" }
                    )
              }
            />
            <YAxis
              label={{ value: METRIC_LABELS[metric].unit(unit), angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={tooltipFormatter}
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={seriesKey(0)}
              name={`${location.displayName} ${METRIC_LABELS[metric].name}`}
              stroke={seriesColor(0)}
              connectNulls={false}
              dot={false}
              activeDot={{ r: 5 }}
            />
            {nearbyStations.map((n, i) => (
              <Line
                key={n.station.id}
                type="monotone"
                dataKey={seriesKey(i + 1)}
                name={`${n.station.displayName} (${n.station.distanceKm.toFixed(1)} km)`}
                stroke={seriesColor(i + 1)}
                strokeDasharray={seriesDash(i + 1)}
                connectNulls={false}
                dot={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {series !== null &&
        series.status === "ready" &&
        isMetricAvailable(series, metric) &&
        metric === "wind" &&
        window !== "last-24-hours" && (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={buildWindDailyRows(series, nearbyStations, unit, DAILY_BUCKET_COUNT[window]!)}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="bucketEnd"
              tickFormatter={(t: string) =>
                new Date(t).toLocaleDateString(
                  [],
                  window === "last-30-days" ? { month: "short", day: "numeric" } : { weekday: "short" }
                )
              }
            />
            <YAxis
              label={{ value: METRIC_LABELS.wind.unit(unit), angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              labelFormatter={(t) => new Date(String(t)).toLocaleDateString()}
              formatter={tooltipFormatter}
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
            />
            <Legend />
            {highLowVisible && (
              <Line
                type="monotone"
                dataKey="primaryHigh"
                name={`${location.displayName} high`}
                stroke={HIGH_COLOR}
                strokeDasharray="4 2"
                connectNulls={false}
                dot={false}
              />
            )}
            {highLowVisible && (
              <Line
                type="monotone"
                dataKey="primaryLow"
                name={`${location.displayName} low`}
                stroke={LOW_COLOR}
                strokeDasharray="4 2"
                connectNulls={false}
                dot={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="primaryAverage"
              name={`${location.displayName} average`}
              stroke={seriesColor(0)}
              connectNulls={false}
              dot={false}
              activeDot={{ r: 5 }}
            />
            {nearbyStations.map((n, i) => (
              <Line
                key={n.station.id}
                type="monotone"
                dataKey={seriesKey(i + 1)}
                name={`${n.station.displayName} average (${n.station.distanceKm.toFixed(1)} km)`}
                stroke={seriesColor(i + 1)}
                strokeDasharray={seriesDash(i + 1)}
                connectNulls={false}
                dot={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
