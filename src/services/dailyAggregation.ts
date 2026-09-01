import type { DailyAggregate, WeatherObservation } from "../models/types";

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
    const temperatures = nonNull(bucket.map((o) => o.temperature));
    const precipitations = nonNull(bucket.map((o) => o.precipitation));
    const windSpeeds = nonNull(bucket.map((o) => o.windSpeed));
    const cloudCoverages = nonNull(bucket.map((o) => o.cloudCoverPercent));

    aggregates.push({
      bucketEnd,
      ...(isForecast ? { isForecast: true } : {}),
      high: temperatures.length > 0 ? Math.max(...temperatures) : null,
      low: temperatures.length > 0 ? Math.min(...temperatures) : null,
      average: temperatures.length > 0 ? mean(temperatures) : null,
      totalPrecipitation:
        precipitations.length > 0 ? precipitations.reduce((sum, p) => sum + p, 0) : null,
      windAverage: windSpeeds.length > 0 ? mean(windSpeeds) : null,
      cloudAverage: cloudCoverages.length > 0 ? mean(cloudCoverages) : null,
      windHigh: windSpeeds.length > 0 ? Math.max(...windSpeeds) : null,
      windLow: windSpeeds.length > 0 ? Math.min(...windSpeeds) : null,
    });
  }

  return aggregates;
}
