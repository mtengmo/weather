import type {
  DailyAggregate,
  ObservationSeries,
  UnitSystem,
  WeatherObservation,
} from "../models/types";
import { deriveWeatherCondition, type WeatherCondition } from "../services/weatherCondition";
import { toDailyAggregates } from "../services/dailyAggregation";
import { deriveFeelsLike } from "../services/feelsLike";
import {
  convertPrecipitation,
  convertTemperature,
  convertWindSpeed,
} from "../services/units";

const DAILY_BUCKET_COUNT = 7;

/** One column of the shared timeline — every row aligns to this same list (008 FR-002/FR-003). */
export interface TimelinePeriod {
  key: string;
  label: string;
  isForecast: boolean;
  condition: WeatherCondition | null;
}

/** One column's value for a single metric row. `value === null` renders as a gap (FR-006). */
export interface TimelineRowPoint {
  isForecast: boolean;
  value: number | null;
  /** Wind row only: direction in degrees, for the directional arrow. */
  direction?: number | null;
  /** Precipitation row only: percent (0-100) chance of rain, when available (011-precipitation-chance). */
  chanceOfRain?: number | null;
}

export type TimelineRowKind = "line" | "bar" | "wind";

export interface TimelineRow {
  key: string;
  label: string;
  unitLabel: string;
  kind: TimelineRowKind;
  points: TimelineRowPoint[]; // same length/order as TimelineData.periods
  /** false when every point in the series lacks this field — the row is omitted (FR-011). */
  available: boolean;
}

export interface TimelineData {
  periods: TimelinePeriod[];
  /**
   * Index of the last observed period immediately before the first forecast period, or null
   * when there's no forecast to divide (006's forecastBoundaryValue concept, reused).
   */
  nowBoundaryIndex: number | null;
  temperature: TimelineRow;
  precipitation: TimelineRow;
  wind: TimelineRow;
  cloud: TimelineRow;
  feelsLike: TimelineRow;
  snow: TimelineRow;
  gust: TimelineRow;
}

function unitLabels(unit: UnitSystem) {
  return {
    temp: unit === "imperial" ? "°F" : "°C",
    precip: unit === "imperial" ? "in" : "mm",
    wind: unit === "imperial" ? "mph" : "m/s",
    cloud: "%",
  };
}

function boundaryIndex(isForecastFlags: boolean[]): number | null {
  const idx = isForecastFlags.findIndex((f) => f);
  return idx > 0 ? idx - 1 : null;
}

function rowAvailable(points: TimelineRowPoint[]): boolean {
  return points.some((p) => p.value !== null);
}

interface RowSource {
  temperature: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  windDirection?: number | null;
  windGust?: number | null;
  cloudCoverPercent: number | null;
  feelsLike: number | null;
  isSnowy: boolean;
  isForecast: boolean;
  chanceOfRain?: number | null;
}

function buildRows(sources: RowSource[], unit: UnitSystem): Omit<TimelineData, "periods" | "nowBoundaryIndex"> {
  const labels = unitLabels(unit);

  const temperature: TimelineRow = {
    key: "temperature",
    label: "Temperature",
    unitLabel: labels.temp,
    kind: "line",
    points: sources.map((s) => ({
      isForecast: s.isForecast,
      value: convertTemperature(s.temperature, unit),
    })),
    available: true, // core row, always shown even if all-gap (FR-006 shows the gap, not omission)
  };

  const precipitation: TimelineRow = {
    key: "precipitation",
    label: "Precipitation",
    unitLabel: labels.precip,
    kind: "bar",
    points: sources.map((s) => ({
      isForecast: s.isForecast,
      value: convertPrecipitation(s.precipitation, unit),
      // Only ever carried for forecast points, regardless of what the raw source value is —
      // an observed reading is measured, not a probability (011-precipitation-chance, FR-004).
      chanceOfRain: s.isForecast ? s.chanceOfRain ?? null : null,
    })),
    available: true,
  };

  const wind: TimelineRow = {
    key: "wind",
    label: "Wind",
    unitLabel: labels.wind,
    kind: "wind",
    points: sources.map((s) => ({
      isForecast: s.isForecast,
      value: convertWindSpeed(s.windSpeed, unit),
      direction: s.windDirection ?? null,
    })),
    available: true,
  };

  const cloud: TimelineRow = {
    key: "cloud",
    label: "Cloud cover",
    unitLabel: labels.cloud,
    kind: "line",
    points: sources.map((s) => ({ isForecast: s.isForecast, value: s.cloudCoverPercent })),
    available: true,
  };

  const feelsLikePoints: TimelineRowPoint[] = sources.map((s) => ({
    isForecast: s.isForecast,
    value: convertTemperature(s.feelsLike, unit),
  }));
  const feelsLike: TimelineRow = {
    key: "feelsLike",
    label: "Feels like",
    unitLabel: labels.temp,
    kind: "line",
    points: feelsLikePoints,
    available: rowAvailable(feelsLikePoints),
  };

  const snowPoints: TimelineRowPoint[] = sources.map((s) => ({
    isForecast: s.isForecast,
    value: s.isSnowy ? convertPrecipitation(s.precipitation, unit) : null,
  }));
  const snow: TimelineRow = {
    key: "snow",
    label: "Snow",
    unitLabel: labels.precip,
    kind: "bar",
    points: snowPoints,
    available: rowAvailable(snowPoints),
  };

  const gustPoints: TimelineRowPoint[] = sources.map((s) => ({
    isForecast: s.isForecast,
    value: convertWindSpeed(s.windGust ?? null, unit),
  }));
  const gust: TimelineRow = {
    key: "gust",
    label: "Gusts",
    unitLabel: labels.wind,
    kind: "bar",
    points: gustPoints,
    available: rowAvailable(gustPoints),
  };

  return { temperature, precipitation, wind, cloud, feelsLike, snow, gust };
}

/** Builds the synchronized hourly timeline (24h view) from an already-loaded series. */
export function buildHourlyTimelineData(series: ObservationSeries, unit: UnitSystem): TimelineData {
  const observations = series.observations;

  const periods: TimelinePeriod[] = observations.map((obs: WeatherObservation) => ({
    key: obs.timestamp,
    label: new Date(obs.timestamp).toLocaleTimeString([], { hour: "2-digit" }),
    isForecast: obs.isForecast ?? false,
    condition: deriveWeatherCondition({
      temperature: obs.temperature,
      precipitation: obs.precipitation,
      windSpeed: obs.windSpeed,
      cloudCoverPercent: obs.cloudCoverPercent,
      timestamp: obs.timestamp,
    }),
  }));

  const sources: RowSource[] = observations.map((obs) => ({
    temperature: obs.temperature,
    precipitation: obs.precipitation,
    windSpeed: obs.windSpeed,
    windDirection: obs.windDirection,
    windGust: obs.windGust,
    cloudCoverPercent: obs.cloudCoverPercent,
    feelsLike: deriveFeelsLike({
      temperature: obs.temperature,
      windSpeed: obs.windSpeed,
      relativeHumidity: obs.relativeHumidity ?? null,
    }),
    isSnowy:
      deriveWeatherCondition({
        temperature: obs.temperature,
        precipitation: obs.precipitation,
        windSpeed: obs.windSpeed,
        cloudCoverPercent: obs.cloudCoverPercent,
        timestamp: obs.timestamp,
      }) === "snowy",
    isForecast: obs.isForecast ?? false,
    chanceOfRain: obs.chanceOfRain,
  }));

  return {
    periods,
    nowBoundaryIndex: boundaryIndex(periods.map((p) => p.isForecast)),
    ...buildRows(sources, unit),
  };
}

/** Builds the synchronized daily timeline (7-day view) from an already-loaded series. */
export function buildDailyTimelineData(series: ObservationSeries, unit: UnitSystem): TimelineData {
  const days: DailyAggregate[] = toDailyAggregates(series.observations, DAILY_BUCKET_COUNT);

  const periods: TimelinePeriod[] = days.map((day) => ({
    key: day.bucketEnd,
    label: new Date(day.bucketEnd).toLocaleDateString([], { weekday: "short" }),
    isForecast: day.isForecast ?? false,
    // No timestamp passed: a clear day always shows the sun, never the moon (007/008
    // research.md §3) — a whole day inherently spans both.
    condition: deriveWeatherCondition({
      temperature: day.average,
      precipitation: day.totalPrecipitation,
      windSpeed: day.windAverage,
      cloudCoverPercent: day.cloudAverage,
    }),
  }));

  const sources: RowSource[] = days.map((day) => ({
    temperature: day.average,
    precipitation: day.totalPrecipitation,
    windSpeed: day.windAverage,
    windDirection: null, // no meaningful "average direction" at daily granularity
    windGust: day.windGustHigh,
    cloudCoverPercent: day.cloudAverage,
    feelsLike: day.feelsLikeAverage ?? null,
    isSnowy:
      deriveWeatherCondition({
        temperature: day.average,
        precipitation: day.totalPrecipitation,
        windSpeed: day.windAverage,
        cloudCoverPercent: day.cloudAverage,
      }) === "snowy",
    isForecast: day.isForecast ?? false,
    chanceOfRain: day.chanceOfRainMax,
  }));

  return {
    periods,
    nowBoundaryIndex: boundaryIndex(periods.map((p) => p.isForecast)),
    ...buildRows(sources, unit),
  };
}
