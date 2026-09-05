import type {
  DailyAggregate,
  ObservationSeries,
  UnitSystem,
  WeatherObservation,
} from "../models/types";
import type { MultiSourceForecastEntry } from "../services/weatherApi";
import { deriveWeatherCondition, type WeatherCondition } from "../services/weatherCondition";
import { toDailyAggregates, toSubDayBuckets } from "../services/dailyAggregation";
import {
  convertPrecipitation,
  convertTemperature,
  convertWindSpeed,
} from "../services/units";

const DAILY_BUCKET_COUNT = 7;

/**
 * Caps an oldest->newest `DailyAggregate[]` (toDailyAggregates' own output) at `maxForecastDays`
 * *forecast* days, leaving every observed/historical day untouched
 * (019-dashboard-polish-round-four, US7, research.md §7).
 *
 * toDailyAggregates' own forward-extension rule returns `bucketCount` past days *plus* however
 * many forecast days the data reaches, uncapped — a location whose forecast reaches well beyond
 * a week produces far more than a week's worth of forecast columns. Capping the array's *tail*
 * directly (e.g. `days.slice(-7)`) is unsafe: since the array is oldest->newest, a long enough
 * forecast reach pushes the tail-slice's window past "today" entirely, dropping every observed
 * day (and "today" itself) — silently breaking anything that depends on locating "today" in this
 * same array, such as the persistent Today card. This instead only trims *forecast* entries
 * beyond `maxForecastDays`, since forecast entries are always the array's trailing run (once
 * `bucketEnd` passes "now", `isForecast` never reverts to false again) — every observed entry
 * before that run, including "today," is always kept.
 */
export function capForecastReach(days: DailyAggregate[], maxForecastDays: number): DailyAggregate[] {
  const firstForecastIndex = days.findIndex((d) => d.isForecast === true);
  if (firstForecastIndex === -1) return days; // no forecast at all — nothing to cap
  return days.slice(0, firstForecastIndex + maxForecastDays);
}

/**
 * A strict `count`-entry window anchored on "today," extending forward first (today + up to
 * `count - 1` forecast days); only backfills from observed history if forward reach is shorter
 * than `count - 1` days (020-dashboard-polish-round-five, US5, research.md §5) — used for the
 * persistent weekly forecast-brief strip specifically, which (unlike the main 7-day timeline's
 * `capForecastReach`) has no Observed/Forecast dual-section design to protect, so prioritizing
 * "today and the days ahead" over older history is the better fit here.
 */
export function windowAroundToday(days: DailyAggregate[], count: number): DailyAggregate[] {
  const firstForecastIndex = days.findIndex((d) => d.isForecast === true);
  const todayIndex = firstForecastIndex === -1 ? days.length - 1 : firstForecastIndex - 1;
  if (todayIndex < 0) return days.slice(-count);
  const end = Math.min(days.length, todayIndex + count);
  const start = Math.max(0, end - count);
  return days.slice(start, end);
}

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
  /** Wind row only: gust reading alongside the wind speed (009-timeline-polish-and-header). */
  gust?: number | null;
  /** Precipitation row only: percent (0-100) chance of rain, when available (011-precipitation-chance). */
  chanceOfRain?: number | null;
  /** Temperature row only, daily view: the day's high/low, alongside the plain average (014, FR-009). */
  high?: number | null;
  low?: number | null;
  /** Temperature row only, forecast periods: true when `value` is a cross-source average rather
   *  than a single source's own reading, set when "Forecast sources: Combined" is selected and
   *  2+ sources have data for this period (019-dashboard-polish-round-four, FR-011 — replaces
   *  016's per-source `sources` list, which showed each source's reading side by side). */
  combined?: boolean;
  /**
   * true when `value` was derived by interpolating this row's neighboring points at the
   * observed/forecast boundary, rather than measured/forecast directly
   * (009-timeline-polish-and-header, FR-012/FR-013).
   */
  interpolated?: boolean;
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
  snow: TimelineRow;
}

function unitLabels(unit: UnitSystem) {
  return {
    temp: unit === "imperial" ? "°F" : "°C",
    precip: unit === "imperial" ? "in" : "mm",
    wind: unit === "imperial" ? "mph" : "m/s",
  };
}

function boundaryIndex(isForecastFlags: boolean[]): number | null {
  const idx = isForecastFlags.findIndex((f) => f);
  return idx > 0 ? idx - 1 : null;
}

interface RowSource {
  temperature: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  windDirection?: number | null;
  windGust?: number | null;
  cloudCoverPercent: number | null;
  isSnowy: boolean;
  isForecast: boolean;
  chanceOfRain?: number | null;
  high?: number | null;
  low?: number | null;
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
      high: convertTemperature(s.high ?? null, unit),
      low: convertTemperature(s.low ?? null, unit),
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
      // Folded into the wind row instead of its own standalone row
      // (009-timeline-polish-and-header, FR-007).
      gust: convertWindSpeed(s.windGust ?? null, unit),
    })),
    available: true,
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
    available: snowPoints.some((p) => p.value !== null),
  };

  return { temperature, precipitation, wind, snow };
}

/**
 * Fills the single "now" boundary column's value via a midpoint average of its immediate
 * neighbors when it has no direct reading of its own, rather than leaving a blank gap
 * (009-timeline-polish-and-header, FR-012/FR-013, research.md §3). Only ever touches that one
 * column; every other gap in the row is left untouched. No-op when either neighbor is missing.
 */
function interpolateNowBoundary(row: TimelineRow, nowBoundaryIndex: number | null): TimelineRow {
  if (nowBoundaryIndex === null) return row;
  const nowIndex = nowBoundaryIndex + 1;
  const nowPoint = row.points[nowIndex];
  if (!nowPoint || nowPoint.value !== null) return row;

  const observedNeighbor = row.points[nowBoundaryIndex];
  const forecastNeighbor = row.points[nowIndex + 1];
  if (!observedNeighbor || observedNeighbor.value === null) return row;
  if (!forecastNeighbor || forecastNeighbor.value === null) return row;

  const interpolatedValue = (observedNeighbor.value + forecastNeighbor.value) / 2;
  const points = row.points.slice();
  points[nowIndex] = { ...nowPoint, value: interpolatedValue, interpolated: true };
  return { ...row, points };
}

/** Builds the synchronized hourly timeline (24h view) from an already-loaded series. */
export function buildHourlyTimelineData(series: ObservationSeries, unit: UnitSystem): TimelineData {
  const observations = series.observations;

  const periods: TimelinePeriod[] = observations.map((obs: WeatherObservation) => ({
    key: obs.timestamp,
    // Fixed 24-hour format regardless of the runtime's default locale — the previous
    // locale-driven format rendered differently across devices for the same underlying hour
    // (009-timeline-polish-and-header, FR-010, research.md §1).
    label: new Date(obs.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", hourCycle: "h23" }),
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

  const nowBoundaryIndex = boundaryIndex(periods.map((p) => p.isForecast));
  const rows = buildRows(sources, unit);

  return {
    periods,
    nowBoundaryIndex,
    temperature: interpolateNowBoundary(rows.temperature, nowBoundaryIndex),
    precipitation: interpolateNowBoundary(rows.precipitation, nowBoundaryIndex),
    wind: interpolateNowBoundary(rows.wind, nowBoundaryIndex),
    snow: interpolateNowBoundary(rows.snow, nowBoundaryIndex),
  };
}

/**
 * Shared by `buildDailyTimelineData` and `build3DayTimelineData` — both map a `DailyAggregate[]`
 * (one plain-daily, one sub-day) into a `TimelineData` the exact same way; only the function that
 * produces the `days` array differs (015-overview-3day-resolution-fix, contracts/overview-resolution-split.md).
 */
function daysToTimelineData(days: DailyAggregate[], unit: UnitSystem): TimelineData {
  const periods: TimelinePeriod[] = days.map((day) => ({
    key: day.bucketEnd,
    // A sub-day bucket (3-day view) labels itself by period name instead of weekday+date; a
    // plain daily bucket (7-day view) never carries subDayLabel, so it always falls through —
    // includes the calendar date, not just the weekday, per 019-dashboard-polish-round-four US7.
    label:
      day.subDayLabel ??
      new Date(day.bucketEnd).toLocaleDateString([], { weekday: "short", day: "numeric" }),
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
    // Last non-null reading in the bucket, same convention TodaySummaryCard already uses
    // (018-dashboard-visual-redesign) — this used to be hard-nulled here before aggregateBucket
    // computed a real value (019-dashboard-polish-round-four, US5).
    windDirection: day.windDirection ?? null,
    windGust: day.windGustHigh,
    cloudCoverPercent: day.cloudAverage,
    isSnowy:
      deriveWeatherCondition({
        temperature: day.average,
        precipitation: day.totalPrecipitation,
        windSpeed: day.windAverage,
        cloudCoverPercent: day.cloudAverage,
      }) === "snowy",
    isForecast: day.isForecast ?? false,
    chanceOfRain: day.chanceOfRainMax,
    high: day.high,
    low: day.low,
  }));

  // No boundary-column interpolation at daily/sub-day granularity — "now" isn't a single
  // well-defined column boundary in the same sense here (009-timeline-polish-and-header Edge Cases).
  return {
    periods,
    nowBoundaryIndex: boundaryIndex(periods.map((p) => p.isForecast)),
    ...buildRows(sources, unit),
  };
}

/** Builds the synchronized daily timeline (7-day view) from an already-loaded series — always
 *  one column per day, at a single consistent resolution (015, FR-001/FR-002). */
export function buildDailyTimelineData(series: ObservationSeries, unit: UnitSystem): TimelineData {
  return daysToTimelineData(
    capForecastReach(toDailyAggregates(series.observations, DAILY_BUCKET_COUNT), DAILY_BUCKET_COUNT),
    unit
  );
}

const SUB_DAY_VIEW_DAY_COUNT = 3;

/** Builds the synchronized sub-day timeline (3-day view) from an already-loaded series — every
 *  day at the same sub-day resolution, never mixed with plain daily columns (015, FR-003/FR-004). */
export function build3DayTimelineData(series: ObservationSeries, unit: UnitSystem): TimelineData {
  return daysToTimelineData(toSubDayBuckets(series.observations, SUB_DAY_VIEW_DAY_COUNT), unit);
}

/**
 * Overwrites each forecast period's temperature `TimelineRowPoint.value` with the mean of the
 * available sources' own per-period averages, and flags it `combined: true` — never for observed
 * periods, never fabricated when fewer than 2 sources have data for that period
 * (019-dashboard-polish-round-four, FR-011 — replaces 016's side-by-side per-source display,
 * which cluttered the timeline; "write it out" is now satisfied by the point's own "(avg)"
 * rendering, contracts/timeline-and-display-fixes.md). Mutates `temperatureRow.points` in place,
 * the same pattern `interpolateNowBoundary` already uses. A period's span is (previous period's
 * end, this period's own end] — the same contiguous-bucket convention every builder above already
 * produces, so this works unchanged across the hourly, 3-day, and 7-day timelines.
 */
export function mergeMultiSourceIntoTimelinePoints(
  temperatureRow: TimelineRow,
  periods: TimelinePeriod[],
  multiSourceForecast: MultiSourceForecastEntry[],
  unit: UnitSystem
): void {
  if (multiSourceForecast.length < 2) return;

  periods.forEach((period, i) => {
    if (!period.isForecast) return;
    const point = temperatureRow.points[i];
    if (!point) return;

    const periodEnd = Date.parse(period.key);
    const periodStart = i > 0 ? Date.parse(periods[i - 1].key) : periodEnd - 24 * 3600_000;

    const perSourceAverages = multiSourceForecast
      .map((entry) => {
        const temperatures = entry.observations
          .filter((o) => {
            const t = Date.parse(o.timestamp);
            return t > periodStart && t <= periodEnd;
          })
          .map((o) => o.temperature)
          .filter((v): v is number => v !== null);
        return temperatures.length > 0
          ? temperatures.reduce((sum, v) => sum + v, 0) / temperatures.length
          : null;
      })
      .filter((v): v is number => v !== null);

    if (perSourceAverages.length > 1) {
      const combinedAverage =
        perSourceAverages.reduce((sum, v) => sum + v, 0) / perSourceAverages.length;
      point.value = convertTemperature(combinedAverage, unit)!;
      point.combined = true;
    }
  });
}
