import type { DailyAggregate, WeatherObservation } from "../models/types";
import { deriveFeelsLike } from "./feelsLike";

const BUCKET_MS = 24 * 3600_000;

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function nonNull(values: (number | null)[]): number[] {
  return values.filter((v): v is number => v !== null);
}

// Bucket index relative to "now": 0 = most recent past bucket (now-24h, now], 1 = the one
// before that, etc. A *negative* index is a future (forecast) bucket: -1 = (now, now+24h],
// -2 = the day after that, and so on (005-add-weather-forecast).
function bucketIndexOf(obs: WeatherObservation, now: number): number {
  return Math.floor((now - Date.parse(obs.timestamp)) / BUCKET_MS);
}

/** The per-bucket aggregation math shared by every bucket shape (rolling 24h day, or sub-day
 *  period) — factored out so `toSubDayBuckets` reuses it exactly rather than duplicating it
 *  (014-dashboard-usability-fixes, research.md §8). */
function aggregateBucket(bucket: WeatherObservation[]): Omit<DailyAggregate, "bucketEnd" | "isForecast"> {
  const temperatures = nonNull(bucket.map((o) => o.temperature));
  const precipitations = nonNull(bucket.map((o) => o.precipitation));
  const windSpeeds = nonNull(bucket.map((o) => o.windSpeed));
  const cloudCoverages = nonNull(bucket.map((o) => o.cloudCoverPercent));
  const windGusts = nonNull(bucket.map((o) => o.windGust ?? null));
  const chancesOfRain = nonNull(
    bucket.filter((o) => o.isForecast === true).map((o) => o.chanceOfRain ?? null)
  );
  const feelsLikes = nonNull(
    bucket.map((o) =>
      deriveFeelsLike({
        temperature: o.temperature,
        windSpeed: o.windSpeed,
        relativeHumidity: o.relativeHumidity ?? null,
      })
    )
  );

  return {
    high: temperatures.length > 0 ? Math.max(...temperatures) : null,
    low: temperatures.length > 0 ? Math.min(...temperatures) : null,
    average: temperatures.length > 0 ? mean(temperatures) : null,
    totalPrecipitation:
      precipitations.length > 0 ? precipitations.reduce((sum, p) => sum + p, 0) : null,
    windAverage: windSpeeds.length > 0 ? mean(windSpeeds) : null,
    cloudAverage: cloudCoverages.length > 0 ? mean(cloudCoverages) : null,
    windHigh: windSpeeds.length > 0 ? Math.max(...windSpeeds) : null,
    windLow: windSpeeds.length > 0 ? Math.min(...windSpeeds) : null,
    windGustHigh: windGusts.length > 0 ? Math.max(...windGusts) : null,
    feelsLikeAverage: feelsLikes.length > 0 ? mean(feelsLikes) : null,
    chanceOfRainMax: chancesOfRain.length > 0 ? Math.max(...chancesOfRain) : null,
  };
}

export function toDailyAggregates(
  observations: WeatherObservation[],
  bucketCount: number
): DailyAggregate[] {
  const now = Date.now();

  const indices = observations.map((o) => bucketIndexOf(o, now));
  const minIndex = indices.length > 0 ? Math.min(...indices) : 0;
  // Extend forward only as far as forecast data in `observations` actually reaches — never
  // fabricate placeholder future days beyond what was provided (spec User Story 2, Acceptance Scenario 3).
  const forwardBucketCount = minIndex < 0 ? -minIndex : 0;

  const bucketsByIndex = new Map<number, WeatherObservation[]>();
  observations.forEach((obs, i) => {
    const index = indices[i];
    if (index >= bucketCount) return; // older than the requested window
    const bucket = bucketsByIndex.get(index);
    if (bucket) bucket.push(obs);
    else bucketsByIndex.set(index, [obs]);
  });

  const aggregates: DailyAggregate[] = [];
  // Oldest -> newest: descending index from the oldest past bucket through "now" (index 0)
  // and on into the future buckets (negative index), if any.
  for (let index = bucketCount - 1; index >= -forwardBucketCount; index--) {
    const bucket = bucketsByIndex.get(index) ?? [];
    const bucketEndMs = now - index * BUCKET_MS;
    const bucketEnd = new Date(bucketEndMs).toISOString();
    const isForecast = bucketEndMs > now;

    aggregates.push({
      bucketEnd,
      ...(isForecast ? { isForecast: true } : {}),
      ...aggregateBucket(bucket),
    });
  }

  return aggregates;
}

export type SubDayPeriod = "morning" | "lunch" | "afternoon" | "evening" | "night";

interface SubDayBoundary {
  period: SubDayPeriod;
  label: string;
  startHour: number; // local hour, inclusive
  endHour: number; // local hour, exclusive (>24 means it wraps past midnight)
}

// A common, fixed convention (014-dashboard-usability-fixes, Assumptions) — not user-configurable.
export const SUB_DAY_PERIODS: SubDayBoundary[] = [
  { period: "morning", label: "Morning", startHour: 6, endHour: 11 },
  { period: "lunch", label: "Lunch", startHour: 11, endHour: 13 },
  { period: "afternoon", label: "Afternoon", startHour: 13, endHour: 17 },
  { period: "evening", label: "Evening", startHour: 17, endHour: 21 },
  { period: "night", label: "Night", startHour: 21, endHour: 30 }, // 21:00 through 06:00 next day
];

function subDayBucketsForDate(
  baseDate: Date,
  observations: WeatherObservation[],
  now: number
): DailyAggregate[] {
  const dayStart = new Date(baseDate);
  dayStart.setHours(0, 0, 0, 0);

  return SUB_DAY_PERIODS.map(({ label, startHour, endHour }) => {
    const startMs = dayStart.getTime() + startHour * 3600_000;
    const endMs = dayStart.getTime() + endHour * 3600_000;
    const bucket = observations.filter((o) => {
      const t = Date.parse(o.timestamp);
      return t >= startMs && t < endMs;
    });
    return {
      bucketEnd: new Date(endMs).toISOString(),
      // Same wall-clock rule `toDailyAggregates` already uses for its own buckets — a
      // still-to-come sub-day period of "today" is forecast the same way a still-to-come hour
      // of "today" already is in the hourly view (spec Edge Cases).
      ...(endMs > now ? { isForecast: true } : {}),
      subDayLabel: label,
      ...aggregateBucket(bucket),
    };
  });
}

/**
 * Every day from "today" through `dayCount - 1` days ahead, each broken into the same 5 fixed
 * sub-day periods — a single, uniform resolution throughout, never mixed with plain daily columns
 * (015-overview-3day-resolution-fix, FR-003/FR-004). A day beyond how far the underlying
 * observations' forecast actually reaches is omitted entirely, never fabricated (FR-005) —
 * mirrors `toDailyAggregates`' own `forwardBucketCount` convention.
 */
export function toSubDayBuckets(
  observations: WeatherObservation[],
  dayCount: number
): DailyAggregate[] {
  const now = Date.now();
  const indices = observations.map((o) => bucketIndexOf(o, now));
  const minIndex = indices.length > 0 ? Math.min(...indices) : 0;
  const forwardBucketCount = minIndex < 0 ? -minIndex : 0;
  // Day 0 ("today") always renders, same as toDailyAggregates' index 0 always existing; day N
  // (N >= 1) only renders when forecast data reaches at least N days out.
  const availableDayCount = Math.min(dayCount, 1 + forwardBucketCount);

  const buckets: DailyAggregate[] = [];
  for (let dayOffset = 0; dayOffset < availableDayCount; dayOffset++) {
    const date = new Date(now + dayOffset * BUCKET_MS);
    buckets.push(...subDayBucketsForDate(date, observations, now));
  }
  return buckets;
}
