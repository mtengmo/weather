import type { UnitSystem, WeatherObservation } from "../models/types";
import type { MarineHour } from "../services/seaForecast";
import type { SeaMetric, SeaObservation } from "../services/seaObservations";
import { convertTemperature, convertWaterLevel, convertWaveHeight, convertWindSpeed } from "../services/units";
import type { TimelinePeriod, TimelineRow, TimelineRowPoint } from "./timelineData";

const HOUR_MS = 3_600_000;
const HALF_HOUR_MS = 1_800_000;
const DAY_MS = 24 * HOUR_MS;
/** Largest gap in SMHI readings that still counts as "covered" by an observation. */
const MAX_OBS_GAP_MS = 2 * HOUR_MS;
/** An SMHI reading older than this no longer stands in for "now". */
const FRESH_OBS_MS = 3 * HOUR_MS;

export interface SeaSample {
  time: number;
  value: number;
  /** true when the value is an SMHI observation, false when it is a model value. */
  observed: boolean;
}

export interface MergedSea {
  waveHeight: SeaSample[];
  wavePeriod: SeaSample[];
  waveDirection: SeaSample[];
  windWaveHeight: SeaSample[];
  swellHeight: SeaSample[];
  swellPeriod: SeaSample[];
  swellDirection: SeaSample[];
  seaTemperature: SeaSample[];
  waterLevel: SeaSample[];
  currentSpeed: SeaSample[];
  currentDirection: SeaSample[];
}

export type SeaObservations = Partial<Record<SeaMetric, SeaObservation | null>>;

function nearestIndex(sorted: { time: number }[], time: number): number {
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid].time < time) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(sorted[lo - 1].time - time) <= Math.abs(sorted[lo].time - time)) return lo - 1;
  return lo;
}

function modelSeries(hours: MarineHour[], pick: (h: MarineHour) => number | null): SeaSample[] {
  return hours.flatMap((h) => {
    const value = pick(h);
    return value === null ? [] : [{ time: h.time, value, observed: false }];
  });
}

/** Observed readings win inside the range they cover (nearest reading per hour); the model fills
 *  before that range and after the last reading. */
function mergeOne(obs: SeaObservation | null | undefined, model: SeaSample[]): SeaSample[] {
  const points = obs ? [...obs.points].sort((a, b) => a.time - b.time) : [];
  if (points.length === 0) return model;
  const first = points[0].time;
  const last = points[points.length - 1].time;

  const times = new Set<number>(model.map((s) => s.time));
  for (const p of points) times.add(Math.round(p.time / HOUR_MS) * HOUR_MS);
  const modelByTime = new Map(model.map((s) => [s.time, s]));

  const out: SeaSample[] = [];
  for (const time of [...times].sort((a, b) => a - b)) {
    if (time >= first - HALF_HOUR_MS && time <= last + HALF_HOUR_MS) {
      const p = points[nearestIndex(points, time)];
      if (Math.abs(p.time - time) <= MAX_OBS_GAP_MS) {
        out.push({ time, value: p.value, observed: true });
        continue;
      }
    }
    const m = modelByTime.get(time);
    if (m) out.push(m);
  }
  return out;
}

export function mergeObservedAndModel(obs: SeaObservations, modelHours: MarineHour[]): MergedSea {
  const m = (pick: (h: MarineHour) => number | null) => modelSeries(modelHours, pick);
  return {
    waveHeight: mergeOne(obs.waveHeight, m((h) => h.waveHeight)),
    wavePeriod: m((h) => h.wavePeriod),
    waveDirection: m((h) => h.waveDirection),
    windWaveHeight: m((h) => h.windWaveHeight),
    swellHeight: m((h) => h.swellWaveHeight),
    swellPeriod: m((h) => h.swellWavePeriod),
    swellDirection: m((h) => h.swellWaveDirection),
    seaTemperature: mergeOne(obs.seaTemperature, m((h) => h.seaTemperature)),
    waterLevel: mergeOne(obs.waterLevel, m((h) => h.seaLevelCm)),
    currentSpeed: m((h) => h.currentSpeed),
    currentDirection: m((h) => h.currentDirection),
  };
}

/** Circular mean of directions in degrees, normalized to [0, 360). circularMean([350, 10]) === 0. */
export function circularMean(degrees: number[]): number {
  let sin = 0;
  let cos = 0;
  for (const d of degrees) {
    const r = (d * Math.PI) / 180;
    sin += Math.sin(r);
    cos += Math.cos(r);
  }
  const deg = Math.round(((Math.atan2(sin, cos) * 180) / Math.PI) * 1e6) / 1e6;
  return ((deg % 360) + 360) % 360;
}

export type AggregateMethod = "max" | "mean" | "circular";

export interface PeriodValue {
  value: number | null;
  /** True for a past column made only of model values; forecast columns are never modelled. */
  modelled: boolean;
}

/** Column i covers (previous column key, own key]; the first column takes the next column's span. */
export function aggregateIntoPeriods(
  samples: SeaSample[],
  periods: Pick<TimelinePeriod, "key" | "isForecast">[],
  method: AggregateMethod
): PeriodValue[] {
  const ends = periods.map((p) => Date.parse(p.key));
  return periods.map((period, i) => {
    const end = ends[i];
    const span = i > 0 ? end - ends[i - 1] : ends.length > 1 ? ends[1] - ends[0] : HOUR_MS;

    if (span <= HOUR_MS) {
      if (samples.length === 0) return { value: null, modelled: false };
      const s = samples[nearestIndex(samples, end)];
      if (Math.abs(s.time - end) > HALF_HOUR_MS) return { value: null, modelled: false };
      return { value: s.value, modelled: !s.observed && !period.isForecast };
    }

    const start = end - span;
    const inside = samples.filter((s) => s.time > start && s.time <= end);
    if (inside.length === 0) return { value: null, modelled: false };
    const values = inside.map((s) => s.value);
    const value =
      method === "max"
        ? Math.max(...values)
        : method === "circular"
          ? circularMean(values)
          : values.reduce((a, b) => a + b, 0) / values.length;
    return { value, modelled: !period.isForecast && inside.every((s) => !s.observed) };
  });
}

export interface SeaRows {
  waves: TimelineRow;
  swell: TimelineRow;
  seaTemperature: TimelineRow;
  waterLevel: TimelineRow;
  current: TimelineRow;
}

type Convert = (v: number | null) => number | null;

function directionRow(
  key: string,
  periods: TimelinePeriod[],
  heights: PeriodValue[],
  directions: PeriodValue[],
  periodsSeconds: PeriodValue[] | null,
  config: Pick<TimelineRow, "label" | "unitLabel" | "decimals" | "directionConvention">,
  convert: Convert
): TimelineRow {
  const points: TimelineRowPoint[] = periods.map((p, i) => ({
    isForecast: p.isForecast,
    value: convert(heights[i].value),
    direction: directions[i].value,
    period: periodsSeconds ? periodsSeconds[i].value : undefined,
    modelled: heights[i].modelled,
  }));
  return { key, kind: "direction", ...config, points, available: points.some((p) => p.value !== null) };
}

function lineRow(
  key: string,
  periods: TimelinePeriod[],
  values: PeriodValue[],
  config: Pick<TimelineRow, "label" | "unitLabel" | "decimals" | "signed">,
  convert: Convert
): TimelineRow {
  const points: TimelineRowPoint[] = periods.map((p, i) => ({
    isForecast: p.isForecast,
    value: convert(values[i].value),
    modelled: values[i].modelled,
  }));
  return { key, kind: "line", ...config, points, available: points.some((p) => p.value !== null) };
}

export function buildSeaRows(timeline: { periods: TimelinePeriod[] }, sea: MergedSea, unit: UnitSystem): SeaRows {
  const periods = timeline.periods;
  const imperial = unit === "imperial";
  const agg = (s: SeaSample[], m: AggregateMethod) => aggregateIntoPeriods(s, periods, m);
  const height: Convert = (v) => convertWaveHeight(v, unit);

  return {
    waves: directionRow(
      "waves",
      periods,
      agg(sea.waveHeight, "max"),
      agg(sea.waveDirection, "circular"),
      agg(sea.wavePeriod, "mean"),
      { label: "timelineRow.waves", unitLabel: imperial ? "ft" : "m", decimals: 1, directionConvention: "from" },
      height
    ),
    swell: directionRow(
      "swell",
      periods,
      agg(sea.swellHeight, "max"),
      agg(sea.swellDirection, "circular"),
      agg(sea.swellPeriod, "mean"),
      { label: "timelineRow.swell", unitLabel: imperial ? "ft" : "m", decimals: 1, directionConvention: "from" },
      height
    ),
    seaTemperature: lineRow(
      "seaTemperature",
      periods,
      agg(sea.seaTemperature, "mean"),
      { label: "timelineRow.seaTemperature", unitLabel: imperial ? "°F" : "°C", decimals: 1 },
      (v) => convertTemperature(v, unit)
    ),
    waterLevel: lineRow(
      "waterLevel",
      periods,
      agg(sea.waterLevel, "mean"),
      { label: "timelineRow.waterLevel", unitLabel: imperial ? "in" : "cm", decimals: 0, signed: true },
      (v) => convertWaterLevel(v, unit)
    ),
    current: directionRow(
      "current",
      periods,
      agg(sea.currentSpeed, "mean"),
      agg(sea.currentDirection, "circular"),
      null,
      { label: "timelineRow.current", unitLabel: imperial ? "mph" : "m/s", decimals: 1, directionConvention: "toward" },
      (v) => convertWindSpeed(v, unit)
    ),
  };
}

export interface SeaReading {
  value: number;
  observed: boolean;
  time: number;
}

export interface SeaSummary {
  /** Metric values (m/s, m, s, cm, degrees C). */
  wind: { speed: number; gust: number | null; direction: number | null } | null;
  waves: { height: number; period: number | null; direction: number | null; observed: boolean; time: number } | null;
  swell: { height: number; period: number | null; direction: number | null } | null;
  windWaveHeight: number | null;
  seaTemperature: SeaReading | null;
  waterLevel: SeaReading | null;
  current: { speed: number; direction: number | null } | null;
  next24h: {
    maxWave: { value: number; time: number } | null;
    maxGust: { value: number; time: number } | null;
    waterLevelMin: number | null;
    waterLevelMax: number | null;
  };
}

/** An SMHI value under 3 h old when there is one, else the model value nearest to now. */
function currentReading(samples: SeaSample[], now: number): SeaReading | null {
  let fresh: SeaSample | null = null;
  for (const s of samples) {
    if (s.observed && s.time <= now + HALF_HOUR_MS && now - s.time < FRESH_OBS_MS) fresh = s;
  }
  let s = fresh;
  if (s === null) {
    const models = samples.filter((x) => !x.observed);
    if (models.length > 0) s = models[nearestIndex(models, now)];
  }
  return s ? { value: s.value, observed: s.observed, time: s.time } : null;
}

function valueNear(samples: SeaSample[], now: number): number | null {
  if (samples.length === 0) return null;
  const s = samples[nearestIndex(samples, now)];
  return Math.abs(s.time - now) <= HOUR_MS ? s.value : null;
}

export function summarizeSea(merged: MergedSea, weather: WeatherObservation[], nowMs: number): SeaSummary {
  const nowWeather =
    weather.length === 0
      ? null
      : weather.reduce((best, o) =>
          Math.abs(Date.parse(o.timestamp) - nowMs) < Math.abs(Date.parse(best.timestamp) - nowMs) ? o : best
        );

  const wave = currentReading(merged.waveHeight, nowMs);
  const swellH = valueNear(merged.swellHeight, nowMs);
  const currentSpeed = valueNear(merged.currentSpeed, nowMs);

  let maxWave: { value: number; time: number } | null = null;
  for (const s of merged.waveHeight) {
    if (s.time >= nowMs && s.time <= nowMs + DAY_MS && (maxWave === null || s.value > maxWave.value)) {
      maxWave = { value: s.value, time: s.time };
    }
  }
  let maxGust: { value: number; time: number } | null = null;
  for (const o of weather) {
    const time = Date.parse(o.timestamp);
    const v = o.windGust ?? o.windSpeed;
    if (v != null && time >= nowMs && time <= nowMs + DAY_MS && (maxGust === null || v > maxGust.value)) {
      maxGust = { value: v, time };
    }
  }
  const levels = merged.waterLevel.filter((s) => s.time >= nowMs && s.time <= nowMs + DAY_MS).map((s) => s.value);

  return {
    wind:
      nowWeather && nowWeather.windSpeed != null
        ? { speed: nowWeather.windSpeed, gust: nowWeather.windGust ?? null, direction: nowWeather.windDirection ?? null }
        : null,
    waves: wave
      ? {
          height: wave.value,
          observed: wave.observed,
          time: wave.time,
          period: valueNear(merged.wavePeriod, nowMs),
          direction: valueNear(merged.waveDirection, nowMs),
        }
      : null,
    swell:
      swellH !== null
        ? { height: swellH, period: valueNear(merged.swellPeriod, nowMs), direction: valueNear(merged.swellDirection, nowMs) }
        : null,
    windWaveHeight: valueNear(merged.windWaveHeight, nowMs),
    seaTemperature: currentReading(merged.seaTemperature, nowMs),
    waterLevel: currentReading(merged.waterLevel, nowMs),
    current: currentSpeed !== null ? { speed: currentSpeed, direction: valueNear(merged.currentDirection, nowMs) } : null,
    next24h: {
      maxWave,
      maxGust,
      waterLevelMin: levels.length ? Math.min(...levels) : null,
      waterLevelMax: levels.length ? Math.max(...levels) : null,
    },
  };
}
