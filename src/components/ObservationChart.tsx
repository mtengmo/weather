import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
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
  findObservedExtremes,
  forecastBoundaryValue,
  forecastKey,
  isMetricAvailable,
  seriesKey,
  type SingleSeriesMetric,
} from "./chartData";
import { HIGH_COLOR, LOW_COLOR, seriesColor, seriesDash } from "./seriesColors";
import MetricTabs from "./MetricTabs";
import { dataSourceNote, formatValue } from "../services/format";
import { toDailyAggregates } from "../services/dailyAggregation";
import { convertTemperature } from "../services/units";

function tooltipFormatter(value: unknown, name: unknown): [string, string] {
  const formatted = formatValue(typeof value === "number" ? value : Number(value), 1);
  // Forecast series are named with a "(forecast)"/"(forecast, alt. source)" suffix
  // (chartData.ts's forecastKey) — surface that in the tooltip label so a prediction (and,
  // per 006, a source mismatch) is identifiable without relying on the dashed line alone
  // (FR-010, FR-007).
  const label = typeof name === "string" && name.includes("(forecast") ? name : String(name);
  return [formatted, label];
}

// Shared forecast-segment styling: same color as the primary series, dashed (FR-004's
// default), reusing the app's existing dashed-line convention for "not fully solid data."
const FORECAST_DASH = "4 2";

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
  onViewOverview: () => void;
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

// The "now" marker (006-forecast-now-marker): a neutral color distinct from any series
// color, so it never reads as "another data line."
const NOW_MARKER_STROKE = "var(--text-muted)";
const NOW_MARKER_LABEL = { value: "Now", position: "insideTopLeft" as const, fill: NOW_MARKER_STROKE };

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
  onViewOverview,
}: ObservationChartProps) {
  const tempUnitLabel = unit === "imperial" ? "°F" : "°C";
  const precipUnitLabel = unit === "imperial" ? "in" : "mm";
  const headingRef = useRef<HTMLHeadingElement>(null);

  // "Now" marker position (006-forecast-now-marker): null when there's no forecast to
  // divide, in which case no ReferenceLine is rendered anywhere below (FR-003).
  const hourlyNowMarker =
    series !== null && series.status === "ready"
      ? forecastBoundaryValue(series.observations, "timestamp")
      : null;
  const dailyBucketCount = window !== "last-24-hours" ? DAILY_BUCKET_COUNT[window] : undefined;
  const dailyNowMarker =
    series !== null && series.status === "ready" && dailyBucketCount !== undefined
      ? forecastBoundaryValue(toDailyAggregates(series.observations, dailyBucketCount), "bucketEnd")
      : null;

  // Forecast-unavailable state (006-forecast-now-marker, FR-005): the window expects a
  // forecast but none was obtained from any source (the weatherApi.ts fallback already ran).
  // Guarded on isMetricAvailable so this doesn't stack with the per-metric "not available"
  // banner above when the current metric has no data at all — that's a more fundamental
  // problem than "no forecast," and showing both would be confusing/redundant clutter.
  const forecastUnavailable =
    series !== null &&
    series.status === "ready" &&
    isMetricAvailable(series, metric) &&
    window !== "last-30-days" &&
    !series.observations.some((o) => o.isForecast);

  // Source-mismatch indicator (006-forecast-now-marker, FR-007): visible in the legend
  // (no hover required) whenever the forecast came from the fallback source rather than
  // the same source as the observed data it continues.
  const forecastLabelSuffix = series?.forecastFromFallbackSource
    ? "(forecast, alt. source)"
    : "(forecast)";

  useEffect(() => {
    // Mirrors ObservationDetails: move focus to this view's heading when it
    // becomes the active view (e.g. returning from the details table).
    headingRef.current?.focus();
  }, []);

  // Observed high/low callout for the temperature chart (013-overview-default-and-layout,
  // FR-018/FR-019/FR-020) — operates on raw observations so it applies to whichever window is
  // currently displayed (research.md §8).
  const observedExtremes =
    metric === "temperature" && series !== null && series.status === "ready"
      ? findObservedExtremes(series.observations)
      : null;

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
        <button type="button" onClick={onViewOverview}>
          Overview
        </button>
      </div>

      <MetricTabs metric={metric} onChange={onMetricChange} />

      {series !== null && dataSourceNote(series) && (
        <p className="data-source-note">{dataSourceNote(series)}</p>
      )}

      {observedExtremes && (
        <p className="observed-extremes-note">
          High: {formatValue(convertTemperature(observedExtremes.high.value, unit), 0)}
          {tempUnitLabel} at{" "}
          {new Date(observedExtremes.high.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" · "}
          Low: {formatValue(convertTemperature(observedExtremes.low.value, unit), 0)}
          {tempUnitLabel} at{" "}
          {new Date(observedExtremes.low.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

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

      {forecastUnavailable && (
        <p className="error-banner" role="alert">
          A forecast isn't available for this location right now.
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
            {hourlyNowMarker !== null && (
              <ReferenceLine
                x={hourlyNowMarker}
                yAxisId="temp"
                stroke={NOW_MARKER_STROKE}
                strokeDasharray="2 2"
                label={NOW_MARKER_LABEL}
              />
            )}
            <Bar
              yAxisId="precip"
              dataKey="primaryPrecipitation"
              name={`${location.displayName} precipitation`}
              fill="url(#precipGradient-24h)"
            />
            <Bar
              yAxisId="precip"
              dataKey="primaryPrecipitationForecast"
              name={`${location.displayName} precipitation ${forecastLabelSuffix}`}
              fill="url(#precipGradient-24h)"
              fillOpacity={0.45}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="primary"
              name={location.displayName}
              stroke={seriesColor(0)}
              connectNulls={false}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="primaryForecast"
              name={`${location.displayName} ${forecastLabelSuffix}`}
              stroke={seriesColor(0)}
              strokeDasharray={FORECAST_DASH}
              connectNulls={false}
              dot={{ r: 3 }}
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
                dot={{ r: 3 }}
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
            {dailyNowMarker !== null && (
              <ReferenceLine
                x={dailyNowMarker}
                yAxisId="temp"
                stroke={NOW_MARKER_STROKE}
                strokeDasharray="2 2"
                label={NOW_MARKER_LABEL}
              />
            )}
            <Bar
              yAxisId="precip"
              dataKey="primaryPrecipitation"
              name={`${location.displayName} precipitation`}
              fill="url(#precipGradient-daily)"
            />
            <Bar
              yAxisId="precip"
              dataKey="primaryPrecipitationForecast"
              name={`${location.displayName} precipitation ${forecastLabelSuffix}`}
              fill="url(#precipGradient-daily)"
              fillOpacity={0.45}
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
                dot={{ r: 3 }}
              />
            )}
            {highLowVisible && (
              // Forecast continuation of the high line — high/low already use a dashed
              // stroke for a different reason, so forecast is distinguished here by
              // reduced opacity instead of a second dash convention.
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="primaryHighForecast"
                name={`${location.displayName} high ${forecastLabelSuffix}`}
                stroke={HIGH_COLOR}
                strokeDasharray="4 2"
                strokeOpacity={0.5}
                connectNulls={false}
                dot={{ r: 3 }}
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
                dot={{ r: 3 }}
              />
            )}
            {highLowVisible && (
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="primaryLowForecast"
                name={`${location.displayName} low ${forecastLabelSuffix}`}
                stroke={LOW_COLOR}
                strokeDasharray="4 2"
                strokeOpacity={0.5}
                connectNulls={false}
                dot={{ r: 3 }}
              />
            )}
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="primaryAverage"
              name={`${location.displayName} average`}
              stroke={seriesColor(0)}
              connectNulls={false}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="primaryAverageForecast"
              name={`${location.displayName} average ${forecastLabelSuffix}`}
              stroke={seriesColor(0)}
              strokeDasharray={FORECAST_DASH}
              connectNulls={false}
              dot={{ r: 3 }}
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
                dot={{ r: 3 }}
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
            {/* Mirrored right-edge scale (013-overview-default-and-layout, FR-015, research.md
                §6) — same implicit axis id as the left YAxis above, so it shares its domain. */}
            <YAxis orientation="right" label={{ value: precipUnitLabel, angle: 90, position: "insideRight" }} />
            <Tooltip
              formatter={tooltipFormatter}
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
            />
            <Legend />
            {(window === "last-24-hours" ? hourlyNowMarker : dailyNowMarker) !== null && (
              <ReferenceLine
                x={window === "last-24-hours" ? hourlyNowMarker! : dailyNowMarker!}
                stroke={NOW_MARKER_STROKE}
                strokeDasharray="2 2"
                label={NOW_MARKER_LABEL}
              />
            )}
            <Bar
              dataKey={seriesKey(0)}
              name={`${location.displayName} precipitation`}
              fill="url(#rainGradient)"
            />
            <Bar
              dataKey={forecastKey(seriesKey(0))}
              name={`${location.displayName} precipitation ${forecastLabelSuffix}`}
              fill="url(#rainGradient)"
              fillOpacity={0.45}
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
            {/* Mirrored right-edge scale (013-overview-default-and-layout, FR-015, research.md
                §6) — same implicit axis id as the left YAxis above, so it shares its domain. */}
            <YAxis
              orientation="right"
              label={{ value: METRIC_LABELS[metric].unit(unit), angle: 90, position: "insideRight" }}
            />
            <Tooltip
              formatter={tooltipFormatter}
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
            />
            <Legend />
            {(window === "last-24-hours" ? hourlyNowMarker : dailyNowMarker) !== null && (
              <ReferenceLine
                x={window === "last-24-hours" ? hourlyNowMarker! : dailyNowMarker!}
                stroke={NOW_MARKER_STROKE}
                strokeDasharray="2 2"
                label={NOW_MARKER_LABEL}
              />
            )}
            <Line
              type="monotone"
              dataKey={seriesKey(0)}
              name={`${location.displayName} ${METRIC_LABELS[metric].name}`}
              stroke={seriesColor(0)}
              connectNulls={false}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey={forecastKey(seriesKey(0))}
              name={`${location.displayName} ${METRIC_LABELS[metric].name} ${forecastLabelSuffix}`}
              stroke={seriesColor(0)}
              strokeDasharray={FORECAST_DASH}
              connectNulls={false}
              dot={{ r: 3 }}
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
                dot={{ r: 3 }}
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
            {/* Mirrored right-edge scale (013-overview-default-and-layout, FR-015, research.md
                §6) — same implicit axis id as the left YAxis above, so it shares its domain. */}
            <YAxis
              orientation="right"
              label={{ value: METRIC_LABELS.wind.unit(unit), angle: 90, position: "insideRight" }}
            />
            <Tooltip
              labelFormatter={(t) => new Date(String(t)).toLocaleDateString()}
              formatter={tooltipFormatter}
              contentStyle={TOOLTIP_CONTENT_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
            />
            <Legend />
            {dailyNowMarker !== null && (
              <ReferenceLine
                x={dailyNowMarker}
                stroke={NOW_MARKER_STROKE}
                strokeDasharray="2 2"
                label={NOW_MARKER_LABEL}
              />
            )}
            {highLowVisible && (
              <Line
                type="monotone"
                dataKey="primaryHigh"
                name={`${location.displayName} high`}
                stroke={HIGH_COLOR}
                strokeDasharray="4 2"
                connectNulls={false}
                dot={{ r: 3 }}
              />
            )}
            {highLowVisible && (
              <Line
                type="monotone"
                dataKey="primaryHighForecast"
                name={`${location.displayName} high ${forecastLabelSuffix}`}
                stroke={HIGH_COLOR}
                strokeDasharray="4 2"
                strokeOpacity={0.5}
                connectNulls={false}
                dot={{ r: 3 }}
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
                dot={{ r: 3 }}
              />
            )}
            {highLowVisible && (
              <Line
                type="monotone"
                dataKey="primaryLowForecast"
                name={`${location.displayName} low ${forecastLabelSuffix}`}
                stroke={LOW_COLOR}
                strokeDasharray="4 2"
                strokeOpacity={0.5}
                connectNulls={false}
                dot={{ r: 3 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="primaryAverage"
              name={`${location.displayName} average`}
              stroke={seriesColor(0)}
              connectNulls={false}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="primaryAverageForecast"
              name={`${location.displayName} average ${forecastLabelSuffix}`}
              stroke={seriesColor(0)}
              strokeDasharray={FORECAST_DASH}
              connectNulls={false}
              dot={{ r: 3 }}
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
                dot={{ r: 3 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
