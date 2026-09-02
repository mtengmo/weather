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

/** The sibling data key holding a primary series' forecast continuation (005-add-weather-forecast). */
export function forecastKey(key: string): string {
  return `${key}Forecast`;
}

export type ChartRow = Record<string, number | string | null>;

/**
 * Duplicates the last observed row's value(s) into the matching forecast key(s) so the
 * dashed forecast segment visually connects to the solid observed segment with no gap
 * (research.md §4). No-op if there's no forecast (or no observed) data to bridge.
 */
function bridgeForecastBoundary(
  rows: ChartRow[],
  isForecastFlags: (boolean | undefined)[],
  keys: string[]
): void {
  const boundaryIndex = isForecastFlags.findIndex((f) => f);
  if (boundaryIndex <= 0) return;
  const boundaryRow = rows[boundaryIndex - 1];
  for (const key of keys) {
    boundaryRow[forecastKey(key)] = boundaryRow[key];
  }
}

/**
 * The X-axis category value (matching a chart's `timestamp`/`bucketEnd` dataKey) at which
 * the "now" marker should be drawn — the key value of the item immediately before the first
 * forecast point, or `null` when there's no forecast to divide (or nothing precedes it)
 * (006-forecast-now-marker).
 */
export function forecastBoundaryValue<T extends { isForecast?: boolean }>(
  items: T[],
  key: keyof T
): string | null {
  const boundaryIndex = items.findIndex((item) => item.isForecast);
  if (boundaryIndex <= 0) return null;
  const value = items[boundaryIndex - 1][key];
  return value === null || value === undefined ? null : String(value);
}

export function buildHourlyRows(
  primary: ObservationSeries,
  nearbyStations: NearbyStationSeries[],
  unit: UnitSystem
): ChartRow[] {
  const nearbyByTimestamp = nearbyStations.map(
    (n) => new Map(n.series.observations.map((o) => [o.timestamp, o]))
  );

  const rows = primary.observations.map((obs) => {
    const temperature = convertTemperature(obs.temperature, unit);
    const precipitation = convertPrecipitation(obs.precipitation, unit);
    const row: ChartRow = {
      timestamp: obs.timestamp,
      primary: obs.isForecast ? null : temperature,
      primaryForecast: obs.isForecast ? temperature : null,
      primaryPrecipitation: obs.isForecast ? null : precipitation,
      primaryPrecipitationForecast: obs.isForecast ? precipitation : null,
    };
    nearbyByTimestamp.forEach((map, i) => {
      const match = map.get(obs.timestamp);
      row[seriesKey(i + 1)] = convertTemperature(match?.temperature ?? null, unit);
    });
    return row;
  });

  bridgeForecastBoundary(
    rows,
    primary.observations.map((o) => o.isForecast),
    ["primary", "primaryPrecipitation"]
  );

  return rows;
}

interface HighLowAverageFields {
  high: keyof Pick<DailyAggregate, "high" | "windHigh">;
  low: keyof Pick<DailyAggregate, "low" | "windLow">;
  average: keyof Pick<DailyAggregate, "average" | "windAverage">;
}

/** Shared by temperature's and wind's daily high/low/average views (reused per FR-009/FR-010). */
export function buildHighLowAverageDailyRows(
  primary: ObservationSeries,
  nearbyStations: NearbyStationSeries[],
  unit: UnitSystem,
  bucketCount: number,
  fields: HighLowAverageFields,
  convert: (value: number | null, unit: UnitSystem) => number | null
): ChartRow[] {
  const primaryDaily = toDailyAggregates(primary.observations, bucketCount);
  const nearbyDaily = nearbyStations.map((n) =>
    toDailyAggregates(n.series.observations, bucketCount)
  );

  const rows = primaryDaily.map((day, dayIndex) => {
    const high = convert(day[fields.high], unit);
    const low = convert(day[fields.low], unit);
    const average = convert(day[fields.average], unit);
    const row: ChartRow = {
      bucketEnd: day.bucketEnd,
      primaryHigh: day.isForecast ? null : high,
      primaryHighForecast: day.isForecast ? high : null,
      primaryLow: day.isForecast ? null : low,
      primaryLowForecast: day.isForecast ? low : null,
      primaryAverage: day.isForecast ? null : average,
      primaryAverageForecast: day.isForecast ? average : null,
    };
    nearbyDaily.forEach((series, i) => {
      row[seriesKey(i + 1)] = convert(series[dayIndex]?.[fields.average] ?? null, unit);
    });
    return row;
  });

  bridgeForecastBoundary(
    rows,
    primaryDaily.map((d) => d.isForecast),
    ["primaryHigh", "primaryLow", "primaryAverage"]
  );

  return rows;
}

const TEMPERATURE_FIELDS: HighLowAverageFields = { high: "high", low: "low", average: "average" };
const WIND_HIGH_LOW_FIELDS: HighLowAverageFields = {
  high: "windHigh",
  low: "windLow",
  average: "windAverage",
};

export function buildDailyRows(
  primary: ObservationSeries,
  nearbyStations: NearbyStationSeries[],
  unit: UnitSystem,
  bucketCount: number
): ChartRow[] {
  const rows = buildHighLowAverageDailyRows(
    primary,
    nearbyStations,
    unit,
    bucketCount,
    TEMPERATURE_FIELDS,
    convertTemperature
  );

  const primaryDaily = toDailyAggregates(primary.observations, bucketCount);
  const precipRows = rows.map((row, i) => {
    const precipitation = convertPrecipitation(primaryDaily[i].totalPrecipitation, unit);
    return {
      ...row,
      primaryPrecipitation: primaryDaily[i].isForecast ? null : precipitation,
      primaryPrecipitationForecast: primaryDaily[i].isForecast ? precipitation : null,
    };
  });

  bridgeForecastBoundary(
    precipRows,
    primaryDaily.map((d) => d.isForecast),
    ["primaryPrecipitation"]
  );

  return precipRows;
}

export function buildWindDailyRows(
  primary: ObservationSeries,
  nearbyStations: NearbyStationSeries[],
  unit: UnitSystem,
  bucketCount: number
): ChartRow[] {
  return buildHighLowAverageDailyRows(
    primary,
    nearbyStations,
    unit,
    bucketCount,
    WIND_HIGH_LOW_FIELDS,
    convertWindSpeed
  );
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

  const rows = primary.observations.map((obs) => {
    const value = convert(obs[hourlyField], unit);
    const row: ChartRow = {
      timestamp: obs.timestamp,
      [seriesKey(0)]: obs.isForecast ? null : value,
      [forecastKey(seriesKey(0))]: obs.isForecast ? value : null,
    };
    nearbyByTimestamp.forEach((map, i) => {
      const match = map.get(obs.timestamp);
      row[seriesKey(i + 1)] = convert(match?.[hourlyField] ?? null, unit);
    });
    return row;
  });

  bridgeForecastBoundary(
    rows,
    primary.observations.map((o) => o.isForecast),
    [seriesKey(0)]
  );

  return rows;
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

  const rows = primaryDaily.map((day, dayIndex) => {
    const value = convert(day[dailyField], unit);
    const row: ChartRow = {
      bucketEnd: day.bucketEnd,
      [seriesKey(0)]: day.isForecast ? null : value,
      [forecastKey(seriesKey(0))]: day.isForecast ? value : null,
    };
    nearbyDaily.forEach((series, i) => {
      row[seriesKey(i + 1)] = convert(series[dayIndex]?.[dailyField] ?? null, unit);
    });
    return row;
  });

  bridgeForecastBoundary(
    rows,
    primaryDaily.map((d) => d.isForecast),
    [seriesKey(0)]
  );

  return rows;
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

export interface ObservedExtreme {
  value: number; // Celsius — unit-converted at display time, like every other chart value
  timestamp: string; // ISO 8601, from the source WeatherObservation
}

export interface ObservedExtremes {
  high: ObservedExtreme;
  low: ObservedExtreme;
}

/**
 * The single highest and lowest *observed* (non-forecast) temperature reading in a series
 * (013-overview-default-and-layout, FR-018/FR-019/FR-020). Operates on raw observations, not
 * daily-bucketed aggregates, so it applies uniformly regardless of which chart granularity is
 * currently displayed (research.md §8). Returns `null` when no observation both is observed
 * (`isForecast` not true) and has a non-null `temperature` — never a fabricated placeholder. A
 * tie resolves to the first (oldest) occurrence, since `observations` is already ordered
 * oldest→newest throughout this codebase.
 */
export function findObservedExtremes(observations: WeatherObservation[]): ObservedExtremes | null {
  let high: ObservedExtreme | null = null;
  let low: ObservedExtreme | null = null;

  for (const o of observations) {
    if (o.isForecast === true || o.temperature === null) continue;
    if (high === null || o.temperature > high.value) {
      high = { value: o.temperature, timestamp: o.timestamp };
    }
    if (low === null || o.temperature < low.value) {
      low = { value: o.temperature, timestamp: o.timestamp };
    }
  }

  if (high === null || low === null) return null;
  return { high, low };
}
