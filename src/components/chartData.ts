import type {
  DailyAggregate,
  NearbyStationSeries,
  ObservationSeries,
  UnitSystem,
  WeatherObservation,
} from "../models/types";
import { toDailyAggregates } from "../services/dailyAggregation";
import { convertPrecipitation, convertTemperature, convertWindSpeed } from "../services/units";

export function seriesKey(index: number): string {
  return index === 0 ? "primary" : `nearby${index}`;
}

export type ChartRow = Record<string, number | string | null>;

export function buildHourlyRows(
  primary: ObservationSeries,
  nearbyStations: NearbyStationSeries[],
  unit: UnitSystem
): ChartRow[] {
  const nearbyByTimestamp = nearbyStations.map(
    (n) => new Map(n.series.observations.map((o) => [o.timestamp, o]))
  );

  return primary.observations.map((obs) => {
    const row: ChartRow = {
      timestamp: obs.timestamp,
      primary: convertTemperature(obs.temperature, unit),
      primaryPrecipitation: convertPrecipitation(obs.precipitation, unit),
    };
    nearbyByTimestamp.forEach((map, i) => {
      const match = map.get(obs.timestamp);
      row[seriesKey(i + 1)] = convertTemperature(match?.temperature ?? null, unit);
    });
    return row;
  });
}

export function buildDailyRows(
  primary: ObservationSeries,
  nearbyStations: NearbyStationSeries[],
  unit: UnitSystem,
  bucketCount: number
): ChartRow[] {
  const primaryDaily = toDailyAggregates(primary.observations, bucketCount);
  const nearbyDaily = nearbyStations.map((n) =>
    toDailyAggregates(n.series.observations, bucketCount)
  );

  return primaryDaily.map((day, dayIndex) => {
    const row: ChartRow = {
      bucketEnd: day.bucketEnd,
      primaryHigh: convertTemperature(day.high, unit),
      primaryLow: convertTemperature(day.low, unit),
      primaryAverage: convertTemperature(day.average, unit),
      primaryPrecipitation: convertPrecipitation(day.totalPrecipitation, unit),
    };
    nearbyDaily.forEach((series, i) => {
      row[seriesKey(i + 1)] = convertTemperature(series[dayIndex]?.average ?? null, unit);
    });
    return row;
  });
}

/** The three metrics that render as a single value-per-series line/bar chart (temperature keeps its own combined line+bar view above). */
export type SingleSeriesMetric = "rain" | "wind" | "cloud";

interface MetricFieldConfig {
  hourlyField: keyof Pick<WeatherObservation, "precipitation" | "windSpeed" | "cloudCoverPercent">;
  dailyField: keyof Pick<DailyAggregate, "totalPrecipitation" | "windAverage" | "cloudAverage">;
  convert: (value: number | null, unit: UnitSystem) => number | null;
}

const METRIC_FIELDS: Record<SingleSeriesMetric, MetricFieldConfig> = {
  rain: {
    hourlyField: "precipitation",
    dailyField: "totalPrecipitation",
    convert: convertPrecipitation,
  },
  wind: { hourlyField: "windSpeed", dailyField: "windAverage", convert: convertWindSpeed },
  cloud: { hourlyField: "cloudCoverPercent", dailyField: "cloudAverage", convert: (v) => v },
};

export function buildMetricHourlyRows(
  primary: ObservationSeries,
  nearbyStations: NearbyStationSeries[],
  unit: UnitSystem,
  metric: SingleSeriesMetric
): ChartRow[] {
  const { hourlyField, convert } = METRIC_FIELDS[metric];
  const nearbyByTimestamp = nearbyStations.map(
    (n) => new Map(n.series.observations.map((o) => [o.timestamp, o]))
  );

  return primary.observations.map((obs) => {
    const row: ChartRow = {
      timestamp: obs.timestamp,
      [seriesKey(0)]: convert(obs[hourlyField], unit),
    };
    nearbyByTimestamp.forEach((map, i) => {
      const match = map.get(obs.timestamp);
      row[seriesKey(i + 1)] = convert(match?.[hourlyField] ?? null, unit);
    });
    return row;
  });
}

export function buildMetricDailyRows(
  primary: ObservationSeries,
  nearbyStations: NearbyStationSeries[],
  unit: UnitSystem,
  metric: SingleSeriesMetric,
  bucketCount: number
): ChartRow[] {
  const { dailyField, convert } = METRIC_FIELDS[metric];
  const primaryDaily = toDailyAggregates(primary.observations, bucketCount);
  const nearbyDaily = nearbyStations.map((n) =>
    toDailyAggregates(n.series.observations, bucketCount)
  );

  return primaryDaily.map((day, dayIndex) => {
    const row: ChartRow = { bucketEnd: day.bucketEnd, [seriesKey(0)]: convert(day[dailyField], unit) };
    nearbyDaily.forEach((series, i) => {
      row[seriesKey(i + 1)] = convert(series[dayIndex]?.[dailyField] ?? null, unit);
    });
    return row;
  });
}

/** Whether the given metric has any non-null reading for the primary location (FR-004). */
export function isMetricAvailable(
  series: ObservationSeries,
  metric: "temperature" | SingleSeriesMetric
): boolean {
  const field: keyof WeatherObservation =
    metric === "temperature"
      ? "temperature"
      : metric === "rain"
        ? "precipitation"
        : metric === "wind"
          ? "windSpeed"
          : "cloudCoverPercent";
  // No data points at all is a different (already-handled) situation than "this
  // metric specifically isn't reported" — only the latter should show as unavailable.
  if (series.observations.length === 0) return true;
  return series.observations.some((o) => o[field] !== null);
}
